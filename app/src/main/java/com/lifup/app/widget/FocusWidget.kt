package com.lifup.app.widget

import android.content.Context
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.Action
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.AndroidRemoteViews
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.FocusSession
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Pomodoro
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.elapsedMinutes
import com.lifup.app.domain.endsAt
import com.lifup.app.domain.text
import com.lifup.app.ui.focus.minutesLeft
import java.util.Locale

/** Focus from the home screen: one-tap starts when idle, a live clock and a stop button while running. */
class FocusWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val s by LifUpApp.store.state.collectAsState()
            WidgetCard(openLink(context, "focus")) {
                val f = s.focus
                if (f != null) Running(context, s, f) else Idle(context, s)
            }
        }
    }
}

@Composable
private fun Idle(context: Context, s: GameState) {
    val lang = Locale.getDefault().language
    Label(context.getString(R.string.tab_focus).uppercase(), W_PURPLE, 12, bold = true)
    Spacer(GlanceModifier.height(8.dp))
    Row(GlanceModifier.fillMaxWidth()) {
        StartButton(context.getString(R.string.widget_focus_minutes, s.settings.focusMinutes), R.drawable.ic_w_play, actionRunCallback<StartFocusAction>(actionParametersOf(ModeKey to "timer")), GlanceModifier.defaultWeight())
        Spacer(GlanceModifier.width(8.dp))
        StartButton(context.getString(R.string.mode_pomodoro), R.drawable.ic_w_repeat, actionRunCallback<StartFocusAction>(actionParametersOf(ModeKey to "pomodoro")), GlanceModifier.defaultWeight())
    }
    // The next focus mission opens the app with it prepared (mode and minutes filled in).
    s.allQuests.firstOrNull { it.type == QuestType.FOCUS && it.status == QuestStatus.OPEN }?.let { q ->
        Spacer(GlanceModifier.height(8.dp))
        Row(GlanceModifier.fillMaxWidth().clickable(openLink(context, "focus/${q.id}")), verticalAlignment = Alignment.CenterVertically) {
            Icon(R.drawable.ic_w_timer, W_PURPLE, 14.dp)
            Spacer(GlanceModifier.width(6.dp))
            Label(q.title.text(lang), W_TEXT, 12, modifier = GlanceModifier.defaultWeight())
            Label(context.getString(R.string.widget_focus_left, q.minutesLeft()), W_MUTED, 11)
        }
    }
}

@Composable
private fun StartButton(text: String, icon: Int, action: Action, modifier: GlanceModifier) {
    Row(
        modifier.background(W_PURPLE).cornerRadius(12.dp).padding(horizontal = 10.dp, vertical = 9.dp).clickable(action),
        verticalAlignment = Alignment.CenterVertically, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, W_BG, 14.dp)
        Spacer(GlanceModifier.width(4.dp))
        Label(text, W_BG, 12, bold = true)
    }
}

@Composable
private fun Running(context: Context, s: GameState, f: FocusSession) {
    val lang = Locale.getDefault().language
    val now = System.currentTimeMillis()
    val phase = f.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(now)) }
    val onBreak = phase?.work == false
    val color = if (onBreak) W_GREEN else if (f.strict) W_RED else W_PURPLE
    val title = when {
        phase == null -> context.getString(R.string.focusing)
        onBreak -> context.getString(R.string.pomodoro_break_open, phase.cycle)
        else -> context.getString(R.string.pomodoro_work_open, phase.cycle)
    }
    Label(title.uppercase(), color, 12, bold = true)
    // Counts down to the end of the current block (or up, for sessions without a limit).
    val end = phase?.let { f.startedAt + (it.endsAtMin * 60_000).toLong() } ?: f.endsAt()
    val countUp = f.open && phase == null
    val base = if (countUp) SystemClock.elapsedRealtime() - (now - f.startedAt) else SystemClock.elapsedRealtime() + (end - now)
    AndroidRemoteViews(
        RemoteViews(context.packageName, R.layout.widget_chrono).apply {
            setChronometer(R.id.chrono, base, null, true)
            setChronometerCountDown(R.id.chrono, !countUp)
            setTextColor(R.id.chrono, android.graphics.Color.rgb(230, 231, 238))
        },
        // A fixed height, or the hosted view takes all the space left and hides what comes after it.
        modifier = GlanceModifier.fillMaxWidth().height(46.dp),
    )
    val mission = s.allQuests.firstOrNull { it.id == f.questId }
    Label(mission?.title?.text(lang) ?: context.getString(R.string.focus_free_session), W_MUTED, 12)
    Spacer(GlanceModifier.height(8.dp))
    // Stopping a "no quitting" session loses its minutes, so that choice stays in the app.
    if (!f.strict) Row(
        GlanceModifier.background(W_PANEL).cornerRadius(12.dp).padding(horizontal = 12.dp, vertical = 8.dp).clickable(actionRunCallback<StopFocusAction>()),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(R.drawable.ic_w_stop, W_RED, 14.dp)
        Spacer(GlanceModifier.width(6.dp))
        Label(context.getString(R.string.stop).uppercase(), W_RED, 12, bold = true)
    }
}

class FocusWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = FocusWidget()
}
