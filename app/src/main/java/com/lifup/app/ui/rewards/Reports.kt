package com.lifup.app.ui.rewards

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.DayLog
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Reward
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.content
import com.lifup.app.ui.defTitle
import com.lifup.app.ui.local
import com.lifup.app.ui.theme.Lif
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.roundToInt

/** The night's verdict: the score on top, then one row per thing that changed. */
@Composable
internal fun DayReportCard(r: Reward.DayReport, dismiss: () -> Unit) {
    val c = Lif.colors
    val pen = r.penalty
    val (icon, color, title) = when {
        r.rest -> Triple(Icons.Rounded.Bedtime, c.purple, stringResource(R.string.report_rest))
        r.perfect -> Triple(Icons.Rounded.TaskAlt, c.green, stringResource(R.string.report_perfect))
        r.passed -> Triple(Icons.Rounded.TaskAlt, c.accent, stringResource(R.string.report_passed))
        pen != null && pen.absorbedBy != null -> Triple(Icons.Rounded.TaskAlt, c.purple, stringResource(R.string.report_absorbed))
        else -> Triple(Icons.Rounded.Warning, c.red, stringResource(R.string.report_failed))
    }
    val date = LocalDate.parse(r.day).format(DateTimeFormatter.ofPattern("EEEE, d MMM"))
    RewardCard(icon, color, date, title, dismiss) {
        if (!r.rest) Score(r.done, r.total, stringResource(R.string.report_missions_done), color)
        Rows {
            val streakNote = when {
                r.streakSavedBy != null -> stringResource(R.string.report_streak_saved_short, nameOf(r.streakSavedBy))
                r.streakRestored -> stringResource(R.string.report_streak_restored_short)
                else -> null
            }
            StatRow(stringResource(R.string.streak), pluralStringResource(R.plurals.days_count, r.streak, r.streak), if (r.streak > 0) c.red else c.muted, streakNote)
            if (r.bonusXp > 0) StatRow(stringResource(R.string.report_paid_close), "+${r.bonusXp} XP", c.accent)
            if (r.sideMissed > 0) StatRow(stringResource(R.string.report_side_label), r.sideMissed.toString(), c.red)
        }
        if (pen != null) {
            if (pen.absorbedBy != null) Note(c.purple) {
                Text(stringResource(R.string.report_absorbed_by, nameOf(pen.absorbedBy)), style = MaterialTheme.typography.bodyMedium, color = c.purple)
            } else Note(c.red) {
                Text(stringResource(R.string.report_penalty_label).uppercase(), style = MaterialTheme.typography.labelSmall, color = c.red)
                Text(stringResource(R.string.report_loss, pen.xpLost, pen.goldLost), style = MaterialTheme.typography.titleMedium, color = c.text)
                if (pen.quests > 0) Text(stringResource(R.string.report_penalty_quests_n, pen.quests), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
        }
    }
}

/** Sunday's look back: the week at a glance, then the boss, the weekly goals and the missions, each in its own block. */
@Composable
internal fun WeekReportCard(s: GameState, r: Reward.WeekReport, dismiss: () -> Unit) {
    val c = Lif.colors
    val start = LocalDate.parse(r.weekStart)
    val end = start.plusDays(6)
    val range = "${start.format(DateTimeFormatter.ofPattern("d MMM"))} – ${end.format(DateTimeFormatter.ofPattern("d MMM"))}"
    RewardCard(Icons.Rounded.CalendarMonth, c.accent, stringResource(R.string.week_title), range, dismiss) {
        Score(r.daysKept, r.days, stringResource(R.string.week_days_kept), c.accent)
        r.previousKept?.let { prev ->
            val diff = r.daysKept - prev
            Pill(
                when { diff > 0 -> stringResource(R.string.week_delta_up, diff); diff < 0 -> stringResource(R.string.week_delta_down, -diff); else -> stringResource(R.string.week_delta_same) },
                when { diff > 0 -> c.green; diff < 0 -> c.gold; else -> c.muted },
            )
        }
        Spacer(Modifier.height(4.dp))
        WeekStrip(start, s.dayLog.associateBy { it.day })

        r.bossId?.let { id ->
            Block(stringResource(R.string.boss_section)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(content.bossById[id]?.title?.local() ?: id, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Pill(stringResource(if (r.bossDefeated) R.string.week_boss_won_short else R.string.week_boss_lost_short), if (r.bossDefeated) c.green else c.muted)
                }
            }
        }
        if (r.weekly.isNotEmpty()) Block(stringResource(R.string.weekly_rates)) {
            r.weekly.forEach { w ->
                val met = w.done >= w.goal
                Column(Modifier.padding(vertical = 3.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(defTitle(s, w.defId), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${w.done}/${w.goal}", style = MaterialTheme.typography.labelLarge, color = if (met) c.green else c.gold)
                    }
                    Bar(w.done / w.goal.coerceAtLeast(1).toFloat(), if (met) c.green else c.gold, height = 4.dp, modifier = Modifier.padding(top = 3.dp))
                }
            }
        }
        if (r.best != null || r.worst != null) Block(stringResource(R.string.missions)) {
            r.best?.let { StatRow(stringResource(R.string.week_best_label), "${(r.bestRate * 100).roundToInt()}%", c.green, defTitle(s, it)) }
            r.worst?.let {
                StatRow(stringResource(R.string.week_worst_label), "${(r.worstRate * 100).roundToInt()}%", c.gold, defTitle(s, it))
                if (r.worstRate < 0.4) Text(stringResource(R.string.week_suggest), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
        }
        com.lifup.app.ui.hero.squadGainText(r.squad)?.let { gain ->
            Block(stringResource(R.string.squad)) { Text(gain, style = MaterialTheme.typography.bodyMedium, color = c.purple) }
        }
    }
}

/** The headline number: "4/5" large, what it counts underneath, and one segment per unit. */
@Composable
private fun Score(done: Int, total: Int, label: String, color: Color) {
    val c = Lif.colors
    Row(verticalAlignment = Alignment.Bottom) {
        Text("$done", style = MaterialTheme.typography.displaySmall, color = color, fontWeight = FontWeight.Bold)
        Text("/$total", style = MaterialTheme.typography.titleLarge, color = c.dim, modifier = Modifier.padding(bottom = 4.dp, start = 2.dp))
    }
    Text(label, style = MaterialTheme.typography.labelMedium, color = c.muted)
    if (total in 1..12) Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        repeat(total) { i ->
            Box(Modifier.weight(1f).height(6.dp).background(if (i < done) color else c.border, RoundedCornerShape(3.dp)))
        }
    }
}

/** Monday to Sunday as dots, coloured by how each day closed; days not played stay empty. */
@Composable
private fun WeekStrip(start: LocalDate, logs: Map<String, DayLog>) {
    val c = Lif.colors
    fun colorOf(l: DayLog?): Color? = when {
        l == null -> null
        l.rest -> c.purple
        l.perfect -> c.green
        l.passed -> c.accent
        else -> c.red
    }
    val days = (0..6).map { start.plusDays(it.toLong()) }
    val colors = days.map { colorOf(logs[it.toString()]) }
    Row(Modifier.fillMaxWidth()) {
        days.zip(colors).forEach { (d, col) ->
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(22.dp)
                        .background(col?.copy(alpha = if (col == c.red) 0.15f else 0.85f) ?: Color.Transparent, CircleShape)
                        .border(1.5.dp, col ?: c.border, CircleShape),
                )
                Text(d.dayOfWeek.getDisplayName(TextStyle.NARROW, Locale.getDefault()), style = MaterialTheme.typography.labelSmall, color = c.dim, modifier = Modifier.padding(top = 3.dp))
            }
        }
    }
    // Only the kinds that appear this week, so the legend never explains what isn't there.
    val legend = listOf(
        c.green to R.string.week_legend_perfect, c.accent to R.string.week_legend_kept,
        c.purple to R.string.week_legend_rest, c.red to R.string.week_legend_failed,
    ).filter { (col, _) -> col in colors }
    if (legend.isNotEmpty()) Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        legend.forEach { (col, label) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).background(col, CircleShape))
                Spacer(Modifier.width(4.dp))
                Text(stringResource(label), style = MaterialTheme.typography.labelSmall, color = c.muted)
            }
        }
    }
}

/** A titled group in the week's card, separated from the one above by a hairline. */
@Composable
private fun Block(title: String, body: @Composable ColumnScope.() -> Unit) {
    val c = Lif.colors
    Column(Modifier.fillMaxWidth().padding(top = 10.dp)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
        Text(title.uppercase(), style = MaterialTheme.typography.labelSmall, color = c.dim, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
        body()
    }
}

@Composable
private fun Rows(body: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), content = body)
}

/** Label on the left, value on the right; [note] is a quieter second line under the label. */
@Composable
private fun StatRow(label: String, value: String, color: Color, note: String? = null) {
    val c = Lif.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyMedium, color = c.muted)
            if (note != null) Text(note, style = MaterialTheme.typography.bodyMedium, color = c.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text(value, style = MaterialTheme.typography.titleMedium, color = color)
    }
}

/** A tinted box for what needs attention: a penalty, or the echo that took it. */
@Composable
private fun Note(color: Color, body: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(10.dp)
    Column(
        Modifier.fillMaxWidth().padding(top = 8.dp).background(color.copy(alpha = 0.10f), shape).border(1.dp, color.copy(alpha = 0.35f), shape).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
        content = body,
    )
}

@Composable
private fun nameOf(id: String) = content.shadowById[id]?.name?.local() ?: content.itemById[id]?.name?.local() ?: id
