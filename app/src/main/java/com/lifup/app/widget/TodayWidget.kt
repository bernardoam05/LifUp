package com.lifup.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
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
import com.lifup.app.domain.Ctx
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Quest
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.availableAt
import com.lifup.app.domain.dayGoal
import com.lifup.app.domain.text
import java.util.Locale

/** Missions a single tap can finish: no tracking, no avoid/limit, and inside their time window. */
private fun Quest.tickable(hour: Int) =
    type != QuestType.FOCUS && type != QuestType.GPS && type != QuestType.FORBIDDEN && type != QuestType.LIMIT &&
        auto == null && availableAt(hour)

/**
 * Today on the home screen. Small: the day's count. Medium: progress and the next missions. Large: the
 * whole list plus the boss. Circles tick missions in place; names open the mission in the app.
 */
class TodayWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(setOf(SMALL, MEDIUM, LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val s by LifUpApp.store.state.collectAsState()
            val size = LocalSize.current
            WidgetCard(openLink(context, "today")) {
                when {
                    size.width < MEDIUM.width -> Compact(context, s)
                    else -> Full(context, s, rows = if (size.height >= LARGE.height) 7 else 3)
                }
            }
        }
    }

    companion object {
        val SMALL = DpSize(110.dp, 110.dp)
        val MEDIUM = DpSize(250.dp, 110.dp)
        val LARGE = DpSize(250.dp, 260.dp)
    }
}

@Composable
private fun Compact(context: Context, s: GameState) {
    val goal = s.dayGoal().let { g -> g.copy(kept = s.dailyQuests.count { it.status == QuestStatus.DONE }) }
    val done = s.dailyQuests.count { it.status == QuestStatus.DONE }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = GlanceModifier.fillMaxWidth()) {
        Label(context.getString(R.string.tab_today).uppercase(), W_MUTED, 11, bold = true, modifier = GlanceModifier.defaultWeight())
        StreakChip(s.player.streak)
    }
    Spacer(GlanceModifier.height(6.dp))
    Label("$done/${s.dailyQuests.size}", if (goal.safe) W_GREEN else W_TEXT, 30, bold = true)
    Spacer(GlanceModifier.height(6.dp))
    Bar(done / s.dailyQuests.size.coerceAtLeast(1).toFloat(), if (goal.safe) W_GREEN else W_PURPLE)
    Spacer(GlanceModifier.height(4.dp))
    Label(if (goal.safe) context.getString(R.string.widget_goal_safe) else context.getString(R.string.widget_goal, goal.needed - goal.kept), if (goal.safe) W_GREEN else W_MUTED, 11)
}

@Composable
private fun Full(context: Context, s: GameState, rows: Int) {
    val lang = Locale.getDefault().language
    val ctx = Ctx(LifUpApp.store.content, System.currentTimeMillis())
    val goal = s.dayGoal().let { g -> g.copy(kept = s.dailyQuests.count { it.status == QuestStatus.DONE }) }
    val daily = s.dailyQuests
    val done = daily.count { it.status == QuestStatus.DONE }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = GlanceModifier.fillMaxWidth()) {
        Label(context.getString(R.string.tab_today).uppercase(), W_PURPLE, 12, bold = true)
        Spacer(GlanceModifier.width(8.dp))
        Label("$done/${daily.size}", W_TEXT, 13, bold = true, modifier = GlanceModifier.defaultWeight())
        StreakChip(s.player.streak)
    }
    Spacer(GlanceModifier.height(6.dp))
    if (!s.daily.rest && daily.isNotEmpty()) {
        Bar(done / daily.size.toFloat(), if (goal.safe) W_GREEN else W_PURPLE)
        Spacer(GlanceModifier.height(3.dp))
        val hours = ((ctx.nextMidnight() - ctx.now) / 3_600_000L).toInt()
        val left = if (hours < 1) context.getString(R.string.widget_under_hour) else context.getString(R.string.widget_hours_left, hours)
        Label(
            if (goal.safe) context.getString(R.string.widget_goal_safe) else context.getString(R.string.widget_goal, goal.needed - goal.kept) + " · " + left,
            if (goal.safe) W_GREEN else if (hours < 3) W_RED else W_MUTED, 11,
        )
    }
    if (s.penalty.active) Label(context.getString(R.string.penalty_banner), W_RED, 11, bold = true)
    // Open missions first (penalty ones on top), finished ones after. Grouped: widgets cap children at 10.
    val list = (s.penalty.quests.filter { it.status == QuestStatus.OPEN } + daily.sortedBy { it.status != QuestStatus.OPEN })
    Column(GlanceModifier.fillMaxWidth().padding(top = 6.dp)) {
        list.take(minOf(rows, 8)).forEach { q -> MissionRow(context, q, lang, ctx.hour) }
        if (list.size > rows) Label("+${list.size - rows}", W_DIM, 11, modifier = GlanceModifier.padding(start = 34.dp))
    }
    if (rows > 3) s.boss?.takeIf { !it.defeated }?.let { b ->
        Column(GlanceModifier.fillMaxWidth().padding(top = 6.dp)) {
            Label(LifUpApp.store.content.bossById[b.bossId]?.title?.text(lang).orEmpty(), W_RED, 11, bold = true, modifier = GlanceModifier.padding(bottom = 2.dp))
            Bar(b.hp / b.maxHp.toFloat(), W_RED, 4.dp)
        }
    }
}

@Composable
private fun MissionRow(context: Context, q: Quest, lang: String, hour: Int) {
    val done = q.status == QuestStatus.DONE
    val failed = q.status == QuestStatus.FAILED
    val tickable = q.tickable(hour) || done
    Row(
        GlanceModifier.fillMaxWidth().padding(vertical = 3.dp).background(W_PANEL).cornerRadius(10.dp).padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Circle = tap to finish; stopwatch = tracked (focus, distance, steps); shield = avoid/limit, kept by default.
        val avoid = q.type == QuestType.FORBIDDEN || q.type == QuestType.LIMIT
        val icon = when {
            done -> R.drawable.ic_w_check
            tickable -> R.drawable.ic_w_circle
            avoid -> R.drawable.ic_w_shield
            else -> R.drawable.ic_w_timer
        }
        val tint = when {
            done -> W_GREEN
            failed -> W_RED
            tickable -> W_MUTED
            avoid -> W_GOLD
            else -> W_PURPLE
        }
        val tap = if (tickable) actionRunCallback<ToggleQuestAction>(actionParametersOf(QuestKey to q.id)) else openLink(context, "quest/${q.id}")
        Icon(icon, tint, 22.dp, GlanceModifier.clickable(tap))
        Spacer(GlanceModifier.width(10.dp))
        Column(GlanceModifier.defaultWeight().clickable(openLink(context, "quest/${q.id}"))) {
            Label(q.title.text(lang), if (done) W_DIM else W_TEXT, 13, bold = !done)
        }
        if (q.xp > 0 && !done) Label("+${q.xp}", W_PURPLE, 11)
    }
}

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWidget()
}
