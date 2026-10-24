package com.lifup.app.system

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.lifup.app.LifUpApp
import com.lifup.app.domain.completeQuest
import com.lifup.app.domain.completeSideQuest
import com.lifup.app.domain.snoozeReminder
import com.lifup.app.domain.openAvoids
import com.lifup.app.domain.slipAvoid
import com.lifup.app.domain.pauseTimer
import com.lifup.app.domain.stopFocus
import kotlinx.coroutines.launch

/**
 * Buttons on notifications: stop a focus session, pause a mission timer, complete a mission (timer, bedtime, reminder)
 * or a side quest, put a reminder off, mark an avoid mission as slipped.
 */
class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_QUEST)
        val pending = goAsync()
        LifUpApp.store.scope.launch {
            try {
                LifUpApp.store.dispatch {
                    when (intent.action) {
                        STOP_FOCUS -> stopFocus()
                        PAUSE_TIMER -> id?.let { pauseTimer(it) }
                        COMPLETE -> id?.let { completeQuest(it) }
                        SLIP_AVOID -> id?.let { slipAvoid(it) }
                        COMPLETE_SIDE -> id?.let { completeSideQuest(it) }
                        SNOOZE -> id?.let { snoozeReminder(it) }
                    }
                }.also { if (intent.action == SLIP_AVOID) Notifications.avoidCheck(context, it.openAvoids()) }
                if (id != null && intent.action in setOf(COMPLETE, COMPLETE_SIDE, SNOOZE)) Notifications.cancel(context, listOf(Notifications.remindId(id)))
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val STOP_FOCUS = "com.lifup.app.STOP_FOCUS"
        const val PAUSE_TIMER = "com.lifup.app.PAUSE_TIMER"
        const val COMPLETE = "com.lifup.app.COMPLETE"
        const val SLIP_AVOID = "com.lifup.app.SLIP_AVOID"
        const val COMPLETE_SIDE = "com.lifup.app.COMPLETE_SIDE"
        const val SNOOZE = "com.lifup.app.SNOOZE"
        const val EXTRA_QUEST = "quest"

        fun intent(context: Context, action: String, questId: String? = null): PendingIntent = PendingIntent.getBroadcast(
            context, (action + questId).hashCode(),
            Intent(context, NotificationActionReceiver::class.java).setAction(action).putExtra(EXTRA_QUEST, questId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
