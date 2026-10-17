package com.lifup.app.ui.hero

import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.DayLog
import com.lifup.app.domain.GameState
import com.lifup.app.domain.QuestStatus
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.theme.Lif
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.time.format.TextStyle
import java.time.temporal.TemporalAdjusters
import java.util.Locale

private val CELL = 13.dp
private val GAP = 3.dp
private val LABEL_W = 16.dp

/** GitHub-style activity grid: one column per week (Monday on top), newest week on the right. */
@Composable
fun ActivityCalendar(s: GameState) {
    val c = Lif.colors
    val today = LocalDate.now()
    val days = remember(s.dayLog, s.quests, s.daily.rest) { calendarDays(s, today) }
    var picked by rememberSaveable { mutableStateOf<String?>(null) }

    Panel {
        BoxWithConstraints(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            val weeks = ((maxWidth - LABEL_W) / (CELL + GAP)).toInt().coerceIn(8, 53)
            val lastMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            val firstMonday = lastMonday.minusWeeks((weeks - 1).toLong())
            Column {
                MonthLabels(firstMonday, weeks)
                Row {
                    WeekdayLabels()
                    Row(horizontalArrangement = Arrangement.spacedBy(GAP)) {
                        repeat(weeks) { w ->
                            Column(verticalArrangement = Arrangement.spacedBy(GAP)) {
                                repeat(7) { d ->
                                    val date = firstMonday.plusWeeks(w.toLong()).plusDays(d.toLong())
                                    val key = date.toString()
                                    if (date.isAfter(today)) Spacer(Modifier.size(CELL))
                                    else Cell(days[key], dayLine(key, days[key]), selected = picked == key) { picked = if (picked == key) null else key }
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(picked?.let { dayLine(it, days[it]) } ?: summary(days, today), style = MaterialTheme.typography.labelMedium, color = c.muted, modifier = Modifier.weight(1f))
            Legend()
        }
    }
}

/** Closed days from the log plus today's live progress. */
private fun calendarDays(s: GameState, today: LocalDate): Map<String, DayLog> {
    val live = s.dailyQuests.takeIf { s.day == today.toString() && it.isNotEmpty() }?.let { q ->
        val done = q.count { it.status == QuestStatus.DONE }
        DayLog(s.day, done, q.size, perfect = done == q.size, penalty = false, rest = s.daily.rest)
    }
    return s.dayLog.associateBy { it.day } + listOfNotNull(live).associateBy { it.day }
}

@Composable
private fun cellColor(d: DayLog?): Color {
    val c = Lif.colors
    return when {
        d == null -> c.border.copy(alpha = 0.5f)
        d.rest -> c.purple.copy(alpha = 0.7f)
        d.penalty -> c.red.copy(alpha = 0.75f)
        d.perfect -> c.green
        d.total == 0 || d.done == 0 -> c.border
        else -> c.green.copy(alpha = 0.2f + 0.55f * d.done / d.total)
    }
}

/** A day square; penalty and rest days also carry a mark so colour isn't the only signal. */
@Composable
private fun Cell(day: DayLog?, label: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(3.dp)
    val mark = Lif.colors.bg.copy(alpha = 0.85f)
    Box(
        Modifier.size(CELL).clip(shape).background(cellColor(day))
            .then(if (selected) Modifier.border(1.5.dp, Lif.colors.text, shape) else Modifier)
            .drawWithContent {
                drawContent()
                val w = size.width
                when {
                    day?.rest == true -> drawCircle(mark, radius = w * 0.16f)
                    day?.penalty == true -> {
                        val a = w * 0.3f; val b = w * 0.7f; val sw = w * 0.12f
                        drawLine(mark, androidx.compose.ui.geometry.Offset(a, a), androidx.compose.ui.geometry.Offset(b, b), sw)
                        drawLine(mark, androidx.compose.ui.geometry.Offset(b, a), androidx.compose.ui.geometry.Offset(a, b), sw)
                    }
                }
            }
            .semantics { contentDescription = label }
            .clickable(onClick = onClick),
    )
}

@Composable
private fun MonthLabels(firstMonday: LocalDate, weeks: Int) {
    Row(Modifier.padding(start = LABEL_W, bottom = 4.dp)) {
        var w = 0
        while (w < weeks) {
            val start = firstMonday.plusWeeks(w.toLong())
            // A label goes on the first week that contains the 1st of a month (or the very first column).
            val firstOfMonth = (0..6).map { start.plusDays(it.toLong()) }.firstOrNull { it.dayOfMonth == 1 }
            val monthSoon = (1..3).any { k -> (0..6).any { start.plusWeeks(k.toLong()).plusDays(it.toLong()).dayOfMonth == 1 } }
            val leading = w == 0 && firstOfMonth == null && !monthSoon
            val span = if (firstOfMonth != null || leading) 3.coerceAtMost(weeks - w) else 1
            val text = when { firstOfMonth != null -> monthName(firstOfMonth); leading -> monthName(start); else -> "" }
            Text(text, style = MaterialTheme.typography.labelSmall, color = Lif.colors.dim, maxLines = 1, softWrap = false, modifier = Modifier.width(width(span)))
            w += span
        }
    }
}

private fun width(weeks: Int): Dp = CELL * weeks + GAP * weeks

private fun monthName(d: LocalDate) = d.month.getDisplayName(TextStyle.SHORT, Locale.getDefault()).trimEnd('.')

@Composable
private fun WeekdayLabels() {
    Column(Modifier.width(LABEL_W), verticalArrangement = Arrangement.spacedBy(GAP)) {
        DayOfWeek.entries.forEach { d ->
            Box(Modifier.size(CELL), contentAlignment = Alignment.CenterStart) {
                if (d.value % 2 == 1 && d != DayOfWeek.SUNDAY) Text(
                    d.getDisplayName(TextStyle.NARROW, Locale.getDefault()),
                    style = MaterialTheme.typography.labelSmall, color = Lif.colors.dim, maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun Legend() {
    val c = Lif.colors
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(GAP)) {
        Text(stringResource(R.string.calendar_less), style = MaterialTheme.typography.labelSmall, color = c.dim)
        listOf(c.border, c.green.copy(alpha = 0.3f), c.green.copy(alpha = 0.55f), c.green).forEach {
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(it))
        }
        Text(stringResource(R.string.calendar_more), style = MaterialTheme.typography.labelSmall, color = c.dim)
    }
}

@Composable
private fun summary(days: Map<String, DayLog>, today: LocalDate): String {
    val from = today.minusDays(29).toString()
    val active = days.values.count { it.day >= from && it.done > 0 }
    val perfect = days.values.count { it.day >= from && it.perfect }
    return stringResource(R.string.calendar_summary, active, perfect)
}

@Composable
private fun dayLine(key: String, d: DayLog?): String {
    val date = LocalDate.parse(key).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
    val what = when {
        d == null -> stringResource(R.string.calendar_no_data)
        d.rest -> stringResource(R.string.day_rest)
        d.perfect -> stringResource(R.string.day_perfect)
        d.penalty -> stringResource(R.string.day_penalty, d.done, d.total)
        else -> "${d.done}/${d.total}"
    }
    return "$date · $what"
}
