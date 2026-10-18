package com.lifup.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import com.lifup.app.LifUpApp
import com.lifup.app.domain.FocusSession
import com.lifup.app.domain.Pomodoro
import com.lifup.app.domain.PomodoroPlan
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.completeQuest
import com.lifup.app.domain.startFocus
import com.lifup.app.domain.stopFocus
import com.lifup.app.domain.undoQuest
import com.lifup.app.system.Permissions
import com.lifup.app.ui.Feedback

internal val QuestKey = ActionParameters.Key<String>("quest")
internal val ModeKey = ActionParameters.Key<String>("mode")

/** Ticks a mission from the home screen; ticking a done one undoes it, so a mis-tap is one tap away. */
class ToggleQuestAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val id = parameters[QuestKey] ?: return
        LifUpApp.store.dispatch {
            val q = s.allQuests.firstOrNull { it.id == id } ?: return@dispatch
            if (q.status == QuestStatus.DONE) undoQuest(id) else completeQuest(id)
        }
        Feedback.buzz(context)
        Widgets.refreshSoon(context, 0)
    }
}

/** Starts a free focus session ("timer" or "pomodoro") with the user's usual lengths and app blocking. */
class StartFocusAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val set = LifUpApp.store.current.settings
        val plan = if (parameters[ModeKey] == "pomodoro") {
            Pomodoro.sane(PomodoroPlan(set.pomodoroWork, set.pomodoroBreak, set.pomodoroRounds, set.pomodoroLongBreak, set.pomodoroLongEvery))
        } else null
        val block = Permissions.blockerReady(context) && set.blockedApps.isNotEmpty()
        LifUpApp.store.dispatch { startFocus(FocusSession(0, set.focusMinutes, plan, blockApps = block)) }
        Feedback.buzz(context)
        Widgets.refreshSoon(context, 0)
    }
}

class StopFocusAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        LifUpApp.store.dispatch { stopFocus() }
        Widgets.refreshSoon(context, 0)
    }
}
