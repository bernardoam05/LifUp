package com.lifup.app.system

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import com.lifup.app.domain.Core
import com.lifup.app.domain.GameState
import com.lifup.app.domain.CorePaint
import com.lifup.app.domain.shownPaint

/**
 * The launcher icon follows the Core's form: one activity-alias per form, exactly one enabled. Switching only
 * happens with the app in the background (some launchers close it or take a moment to redraw), never during a
 * focus session or a run (a launcher that closes the app would cut them), and only when the form changed.
 */
object IconSwitcher {
    private val PLAIN = listOf("MainActivity", "CoreIcon2", "CoreIcon3", "CoreIcon4", "CoreIcon5", "CoreIcon6")
    private val ICON_PAINTS = listOf(CorePaint.AURORA, CorePaint.SHADOW, CorePaint.CRYSTAL, CorePaint.GHOST, CorePaint.LAVA, CorePaint.GALAXY)

    /** Every launcher entry: the six forms, then each CoreQuest+ skin's six forms (".CoreIcon<n><Skin>"). */
    private val ALIASES = PLAIN + ICON_PAINTS.flatMap { p -> (1..6).map { n -> "CoreIcon$n${p.name.lowercase().replaceFirstChar { it.uppercase() }}" } }

    /** 1-based index into [ALIASES]: the form, in the skin worn (if any). */
    fun wanted(s: GameState): Int {
        if (s.settings.fixedIcon) return 1
        val stage = Core.stage(s)
        val paintIndex = ICON_PAINTS.indexOf(s.shownPaint)
        if (paintIndex < 0) return stage
        return PLAIN.size + paintIndex * 6 + stage
    }

    fun apply(context: Context, s: GameState) {
        if (s.focus != null || s.run?.running == true) return
        val want = wanted(s)
        val pm = context.packageManager
        fun component(i: Int) = ComponentName(context.packageName, "${context.packageName}.${ALIASES[i - 1]}")
        fun enabled(i: Int) = when (pm.getComponentEnabledSetting(component(i))) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED -> false
            else -> i == 1 // manifest default
        }
        if ((1..ALIASES.size).all { enabled(it) == (it == want) }) return
        runCatching {
            // The new one first, so there's never a moment without a launcher entry.
            pm.setComponentEnabledSetting(component(want), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
            (1..ALIASES.size).filter { it != want }.forEach {
                pm.setComponentEnabledSetting(component(it), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
            }
        }
    }
}
