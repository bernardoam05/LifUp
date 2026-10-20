package com.lifup.app.system

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.lifup.app.LifUpApp
import com.lifup.app.domain.completeQuest
import com.lifup.app.domain.openAvoids
import com.lifup.app.domain.slipAvoid
import com.lifup.app.domain.pauseTimer
import com.lifup.app.domain.stopFocus
import kotlinx.coroutines.launch

/** Buttons on notifications: stop a focus session, pause or finish a running mission timer, mark an avoid mission as slipped. */
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
                        FINISH_TIMER -> id?.let { completeQuest(it) }
                        SLIP_AVOID -> id?.let { slipAvoid(it) }
                    }
                }.also { if (intent.action == SLIP_AVOID) Notifications.avoidCheck(context, it.openAvoids()) }
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val STOP_FOCUS = "com.lifup.app.STOP_FOCUS"
        const val PAUSE_TIMER = "com.lifup.app.PAUSE_TIMER"
        const val FINISH_TIMER = "com.lifup.app.FINISH_TIMER"
        const val SLIP_AVOID = "com.lifup.app.SLIP_AVOID"
        const val EXTRA_QUEST = "quest"

        fun intent(context: Context, action: String, questId: String? = null): PendingIntent = PendingIntent.getBroadcast(
            context, (action + questId).hashCode(),
            Intent(context, NotificationActionReceiver::class.java).setAction(action).putExtra(EXTRA_QUEST, questId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
