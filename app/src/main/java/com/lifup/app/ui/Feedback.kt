package com.lifup.app.ui

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.lifup.app.LifUpApp
import com.lifup.app.R

enum class Sfx(val res: Int, val volume: Float = 0.8f) {
    LEVEL(R.raw.level_up_ding), VICTORY(R.raw.victory_chime), PENALTY(R.raw.penalty_alarm), SHADOW(R.raw.shadow_captured),
    // Everyday cues stay short and quiet (Kenney UI/RPG audio, CC0).
    QUEST(R.raw.sfx_quest_done, 0.7f), TICK(R.raw.sfx_tick, 0.6f), COINS(R.raw.sfx_coins), FOCUS(R.raw.sfx_focus_done),
}

/** Sound effects and haptics, both respecting the user's settings. */
object Feedback {
    private var pool: SoundPool? = null
    private val ids = mutableMapOf<Sfx, Int>()

    private fun pool(context: Context): SoundPool = pool ?: SoundPool.Builder()
        .setMaxStreams(3)
        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        .build().also { p ->
            pool = p
            Sfx.entries.forEach { ids[it] = p.load(context.applicationContext, it.res, 1) }
        }

    fun warmUp(context: Context) { pool(context) }

    fun play(context: Context, sfx: Sfx) {
        if (!LifUpApp.store.current.settings.sound) return
        val p = pool(context)
        ids[sfx]?.let { p.play(it, sfx.volume, sfx.volume, 1, 0, 1f) }
    }

    fun buzz(context: Context, strong: Boolean = false) {
        if (!LifUpApp.store.current.settings.vibration) return
        val vibrator = if (android.os.Build.VERSION.SDK_INT >= 31) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION") (context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
        }
        val effect = if (strong) VibrationEffect.createWaveform(longArrayOf(0, 120, 60, 200), -1)
        else VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)
        runCatching { vibrator.vibrate(effect) }
    }
}
