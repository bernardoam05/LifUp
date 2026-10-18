package com.lifup.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.DayLog
import com.lifup.app.domain.GameState
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.Rules
import com.lifup.app.domain.text
import com.lifup.app.ui.theme.accentFor
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import java.util.Locale

/** Rank, level, streak and boss at a glance; the large size adds the last five weeks. (Class name kept for placed widgets.) */
class HeroWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(setOf(DpSize(180.dp, 110.dp), DpSize(250.dp, 240.dp)))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val s by LifUpApp.store.state.collectAsState()
            WidgetCard(openLink(context, "hero")) {
                Header(context, s)
                Spacer(GlanceModifier.height(10.dp))
                Boss(context, s)
                if (LocalSize.current.height >= 240.dp) {
                    Spacer(GlanceModifier.height(10.dp))
                    Weeks(s)
                }
            }
        }
    }
}

@Composable
private fun Header(context: Context, s: GameState) {
    val rank = HunterRank.of(s.player.level)
    val accent = accentFor(rank)
    Row(verticalAlignment = Alignment.CenterVertically, modifier = GlanceModifier.fillMaxWidth()) {
        RankBadge(rank.label, accent, 44.dp)
        Spacer(GlanceModifier.width(10.dp))
        Column(GlanceModifier.defaultWeight()) {
            Label(s.player.name.ifBlank { context.getString(R.string.default_hunter) }.uppercase(), W_TEXT, 14, bold = true)
            Label(context.getString(R.string.level_n, s.player.level), accent, 11)
            Spacer(GlanceModifier.height(4.dp))
            Bar(s.player.xp / Rules.xpForLevel(s.player.level).toFloat(), accent, 5.dp)
        }
        Spacer(GlanceModifier.width(10.dp))
        StreakChip(s.player.streak)
    }
}

@Composable
private fun Boss(context: Context, s: GameState) {
    val b = s.boss ?: return
    val name = LifUpApp.store.content.bossById[b.bossId]?.title?.text(Locale.getDefault().language).orEmpty()
    Column(GlanceModifier.fillMaxWidth().clickable(openLink(context, "boss"))) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = GlanceModifier.fillMaxWidth()) {
            Label(name, if (b.defeated) W_GREEN else W_RED, 12, bold = true, modifier = GlanceModifier.defaultWeight())
            Label(if (b.defeated) "✓" else "${b.hp} HP", if (b.defeated) W_GREEN else W_MUTED, 11)
        }
        if (!b.defeated) { Spacer(GlanceModifier.height(3.dp)); Bar(b.hp / b.maxHp.toFloat(), W_RED, 5.dp) }
    }
}

/** Five weeks of days, Monday first: green for kept, red for penalties, purple for rest. */
@Composable
private fun Weeks(s: GameState) {
    val today = LocalDate.now()
    val logs = s.dayLog.associateBy { it.day }
    val start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(4)
    // Widgets allow at most 10 children per row/column: gaps are padding, not spacers.
    Column {
        repeat(7) { d ->
            Row(GlanceModifier.padding(bottom = 3.dp)) {
                repeat(5) { w ->
                    val date = start.plusWeeks(w.toLong()).plusDays(d.toLong())
                    Box(GlanceModifier.padding(end = 3.dp)) {
                        Box(GlanceModifier.size(14.dp).background(cellColor(logs[date.toString()], date.isAfter(today))).cornerRadius(3.dp)) {}
                    }
                }
            }
        }
    }
}

private fun cellColor(d: DayLog?, future: Boolean): Color = when {
    future -> W_BG
    d == null -> W_TRACK
    d.rest -> W_PURPLE
    d.penalty -> W_RED
    d.perfect -> W_GREEN
    d.passed -> W_GREEN.copy(alpha = 0.6f)
    d.done > 0 -> W_GREEN.copy(alpha = 0.3f)
    else -> W_TRACK
}

class HeroWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = HeroWidget()
}
