package com.lifup.app.system

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.lifup.app.LifUpApp
import com.lifup.app.domain.Ctx
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Pomodoro
import com.lifup.app.domain.allDailyDone
import com.lifup.app.domain.elapsedMinutes
import com.lifup.app.domain.endsAt
import kotlinx.coroutines.launch

/**
 * One exact alarm at the next moment the state needs attention: midnight (close the day even with the
 * app closed), session end, penalty block start/end, portal expiry, Pomodoro phase or the evening reminder.
 */
object Alarms {
    private const val REQUEST = 4242
    private const val PREFS = "alarms"

    fun nextWake(s: GameState, ctx: Ctx, reminderDone: Boolean): Long {
        val now = ctx.now
        val candidates = mutableListOf(ctx.nextMidnight() + 2_000)
        s.focus?.let { f ->
            candidates += f.endsAt() + 500
            f.pomodoro?.let { p ->
                val phase = Pomodoro.phaseAt(p, f.elapsedMinutes(now))
                candidates += f.startedAt + (phase.endsAtMin * 60_000).toLong() + 500
            }
        }
        if (s.penalty.active) {
            if (s.penalty.blockStart > now) candidates += s.penalty.blockStart
            if (s.penalty.blockEnd > now) candidates += s.penalty.blockEnd + 500
        }
        s.portal?.let { candidates += it.expiresAt + 500 }
        if (!reminderDone && s.settings.notifications) {
            val at = ctx.atHour(ctx.today, s.settings.reminderHour)
            if (at > now) candidates += at
        }
        return candidates.filter { it > now }.min()
    }

    fun schedule(context: Context, s: GameState) {
        val ctx = Ctx(LifUpApp.store.content, System.currentTimeMillis())
        val at = nextWake(s, ctx, reminderSentToday(context, ctx.todayKey))
        val am = context.getSystemService(AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(
            context, REQUEST, Intent(context, TickReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        runCatching {
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    private fun reminderSentToday(context: Context, today: String) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("reminder", "") == today

    /** Evening nudge if today's missions are still open. */
    fun maybeRemind(context: Context, s: GameState) {
        val ctx = Ctx(LifUpApp.store.content, System.currentTimeMillis())
        if (!s.settings.notifications || ctx.hour < s.settings.reminderHour) return
        if (reminderSentToday(context, ctx.todayKey)) return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("reminder", ctx.todayKey).apply()
        if (s.daily.rest || s.allDailyDone()) return
        Notifications.reminder(context, s.dailyQuests.count { it.status == com.lifup.app.domain.QuestStatus.OPEN })
    }
}

/** Catches the state up with the clock and re-syncs alarms/services, keeping the receiver alive meanwhile. */
private fun BroadcastReceiver.tick(context: Context) {
    val pending = goAsync()
    val store = LifUpApp.store
    store.scope.launch {
        try {
            val s = store.dispatch()
            Alarms.maybeRemind(context, s)
            SystemSync.apply(context, s)
        } finally {
            pending?.finish()
        }
    }
}

class TickReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = tick(context)
}

/** Boot, app update and clock/timezone changes all need the alarm rescheduled. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = tick(context)
}
