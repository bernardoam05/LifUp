package com.lifup.app.system

import android.content.Context
import com.lifup.app.data.GameStore
import com.lifup.app.domain.GameState
import com.lifup.app.domain.text

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
    private var postedTimers: String? = null

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
        syncTimerNotification(context, s)
        Alarms.dismissResolved(context, s)
        extraListeners.forEach { runCatching { it(context, s) } }
    }

    /** Mission stopwatches running in the app show as one ongoing notification with pause/finish. */
    private fun syncTimerNotification(context: Context, s: GameState) {
        val running = s.timers.filter { it.value.running && s.allQuests.any { q -> q.id == it.key } }
        val key = running.entries.joinToString { "${it.key}:${it.value.runningSince}:${it.value.accumulatedMs}" }
        if (key == postedTimers) return
        postedTimers = key
        val first = running.entries.firstOrNull()
        val now = System.currentTimeMillis()
        val title = first?.let { e -> s.allQuests.first { it.id == e.key }.title.text(java.util.Locale.getDefault().language) }.orEmpty()
        Notifications.missionTimer(context, first?.key, title, now - (first?.value?.elapsed(now) ?: 0), running.size - 1)
    }

    private fun notifyTransitions(context: Context, old: GameState, new: GameState) {
        if (AppVisibility.foreground || !new.settings.notifications) return
        val portal = new.portal
        if (old.portal == null && portal != null) {
            val lang = java.util.Locale.getDefault().language
            val title = com.lifup.app.ui.questTitle(portal.quest, lang)
            Notifications.portalOpened(context, title, portal.expiresAt)
        }
        val f = old.focus
        if (f != null && new.focus == null) {
            val minutes = (new.count(com.lifup.app.domain.StatKey.FOCUS_MINUTES) - old.count(com.lifup.app.domain.StatKey.FOCUS_MINUTES)).toInt()
            if (minutes > 0) Notifications.focusDone(context, minutes)
        }
        if (!old.penalty.active && new.penalty.active) Notifications.penaltyApplied(context, new.penalty.quests.size)
    }
}
