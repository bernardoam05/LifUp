package com.lifup.app.system

import android.content.Context
import com.lifup.app.data.GameStore
import com.lifup.app.domain.GameState

/** Tracks whether an activity is on screen (to avoid notifying about things the user is looking at). */
object AppVisibility {
    @Volatile var foreground = false
}

/**
 * Reacts to state changes on behalf of the Android side: keeps the session service, the alarm and the
 * widgets in line with the state, and notifies about events that happened while the app was hidden.
 */
object SystemSync {
    private val extraListeners = mutableListOf<(Context, GameState) -> Unit>()
    private var postedRun: Any? = Unit

    fun install(context: Context, store: GameStore) {
        val app = context.applicationContext
        store.addListener { old, new ->
            notifyTransitions(app, old, new)
            apply(app, new)
        }
        apply(app, store.current)
    }

    fun onApply(listener: (Context, GameState) -> Unit) {
        extraListeners += listener
    }

    fun apply(context: Context, s: GameState) {
        SessionService.sync(context, s)
        Alarms.schedule(context, s)
        if (s.run != postedRun) { postedRun = s.run; Notifications.run(context, s.run) }
        extraListeners.forEach { runCatching { it(context, s) } }
    }

    private fun notifyTransitions(context: Context, old: GameState, new: GameState) {
        if (AppVisibility.foreground || !new.settings.notifications) return
        val portal = new.portal
        if (old.portal == null && portal != null) {
            val lang = java.util.Locale.getDefault().language
            val title = com.lifup.app.ui.questTitle(portal.quest, lang)
            Notifications.portalOpened(context, title, (portal.expiresAt - System.currentTimeMillis()) / 60_000)
        }
        val f = old.focus
        if (f != null && new.focus == null) {
            val minutes = (new.count(com.lifup.app.domain.StatKey.FOCUS_MINUTES) - old.count(com.lifup.app.domain.StatKey.FOCUS_MINUTES)).toInt()
            if (minutes > 0) Notifications.focusDone(context, minutes)
        }
        if (!old.penalty.active && new.penalty.active) Notifications.penaltyApplied(context, new.penalty.quests.size)
    }
}
