package com.lifup.app.ui.hero

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.background
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
import com.lifup.app.ui.rewards.DayLegend
import com.lifup.app.ui.rewards.dayColor
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
                    Grid(days, firstMonday, weeks, today, picked) { key -> picked = if (picked == key) null else key }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(picked?.let { dayLine(it, days[it]) } ?: summary(days, today), style = MaterialTheme.typography.labelMedium, color = c.muted)
        Spacer(Modifier.height(6.dp))
        DayLegend(days.values.map { dayColor(it) })
    }
}

/** Closed days from the log plus today's live progress (never "missed" while it can still be kept). */
private fun calendarDays(s: GameState, today: LocalDate): Map<String, DayLog> {
    val live = s.dailyQuests.takeIf { s.day == today.toString() && it.isNotEmpty() }?.let { q ->
        val done = q.count { it.status == QuestStatus.DONE }
        DayLog(s.day, done, q.size, perfect = done == q.size, penalty = false, rest = s.daily.rest, passed = done > 0).takeIf { it.rest || done > 0 }
    }
    // Days logged before "passed" existed: no penalty and at least 60% done (the lowest pass mark) count as kept, not missed.
    val logged = s.dayLog.map { if (!it.passed && !it.penalty && it.total > 0 && it.done >= it.total * 0.6) it.copy(passed = true) else it }
    return logged.associateBy { it.day } + listOfNotNull(live).associateBy { it.day }
}

/**
 * The whole year of squares drawn on one canvas, with one tap handler: as separate composables they were up to
 * 371 boxes, each with its own click, semantics and formatted label, rebuilt on every state change. Penalty and rest
 * days also carry a mark so colour isn't the only signal; the tapped day is outlined and spelled out below the grid.
 */
@Composable
private fun Grid(days: Map<String, DayLog>, firstMonday: LocalDate, weeks: Int, today: LocalDate, picked: String?, onPick: (String) -> Unit) {
    val c = Lif.colors
    // The day reports' colours (perfect, kept, rest, missed); a day not played is an empty square.
    val perfect = c.green; val kept = c.accent; val rest = c.purple; val missed = c.red.copy(alpha = 0.75f)
    val empty = c.border.copy(alpha = 0.5f)
    val mark = c.bg.copy(alpha = 0.85f)
    val outline = c.text
    val pickedNow by rememberUpdatedState(onPick)
    Canvas(
        Modifier.size(width(weeks) - GAP, CELL * 7 + GAP * 6)
            .pointerInput(firstMonday, weeks, today) {
                detectTapGestures { pos ->
                    val step = (CELL + GAP).toPx()
                    val w = (pos.x / step).toInt()
                    val d = (pos.y / step).toInt()
                    if (w !in 0 until weeks || d !in 0..6) return@detectTapGestures
                    val date = firstMonday.plusWeeks(w.toLong()).plusDays(d.toLong())
                    if (!date.isAfter(today)) pickedNow(date.toString())
                }
            },
    ) {
        val cell = CELL.toPx()
        val step = (CELL + GAP).toPx()
        val radius = CornerRadius(3.dp.toPx())
        for (w in 0 until weeks) for (d in 0..6) {
            val date = firstMonday.plusWeeks(w.toLong()).plusDays(d.toLong())
            if (date.isAfter(today)) continue
            val key = date.toString()
            val day = days[key]
            val color = when {
                day == null -> empty
                day.rest -> rest
                day.perfect -> perfect
                day.passed -> kept
                else -> missed
            }
            val topLeft = Offset(w * step, d * step)
            drawRoundRect(color, topLeft, Size(cell, cell), radius)
            when {
                day?.rest == true -> drawCircle(mark, radius = cell * 0.16f, center = topLeft + Offset(cell / 2, cell / 2))
                day?.penalty == true -> {
                    val a = cell * 0.3f; val b = cell * 0.7f; val sw = cell * 0.12f
                    drawLine(mark, topLeft + Offset(a, a), topLeft + Offset(b, b), sw)
                    drawLine(mark, topLeft + Offset(b, a), topLeft + Offset(a, b), sw)
                }
            }
            if (key == picked) drawRoundRect(outline, topLeft, Size(cell, cell), radius, style = Stroke(1.5.dp.toPx()))
        }
    }
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
