package com.lifup.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.BlockWindow
import com.lifup.app.domain.GameState
import com.lifup.app.domain.PlusRules
import com.lifup.app.domain.addBlockWindow
import com.lifup.app.domain.removeBlockWindow
import com.lifup.app.ui.act
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.components.TimeDialog
import com.lifup.app.ui.components.fmtMinuteOfDay
import com.lifup.app.ui.theme.Lif
import java.time.DayOfWeek
import java.time.format.TextStyle
import java.util.Locale

private fun dayName(d: Int) = DayOfWeek.of(d).getDisplayName(TextStyle.SHORT, Locale.getDefault())

/** CoreQuest+: hours when the focus apps stay blocked without a session. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BlockScheduleSection(s: GameState, openPlus: () -> Unit) {
    val c = Lif.colors
    var adding by rememberSaveable { mutableStateOf(false) }
    SectionTitle(stringResource(R.string.block_schedule_section))
    Text(stringResource(R.string.block_schedule_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
    if (s.plus && s.settings.blockedApps.isEmpty()) Text(stringResource(R.string.block_schedule_no_apps), style = MaterialTheme.typography.bodySmall, color = c.gold, modifier = Modifier.padding(top = 4.dp))
    s.settings.blockWindows.forEachIndexed { i, w ->
        Panel(Modifier.padding(top = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    w.days.joinToString(" ") { dayName(it) } + " · " + fmtMinuteOfDay(w.from) + "–" + fmtMinuteOfDay(w.to),
                    style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { act { removeBlockWindow(i) } }) { Icon(Icons.Rounded.DeleteOutline, stringResource(R.string.delete), tint = c.dim) }
            }
        }
    }
    if (s.settings.blockWindows.size < PlusRules.MAX_BLOCK_WINDOWS) GhostButton(
        stringResource(R.string.block_schedule_add), onClick = { if (s.plus) adding = true else openPlus() },
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp), icon = Icons.Rounded.Add, color = c.accent,
    )
    if (adding) AddWindowDialog { adding = false }
}

/** Days first, then the start and end times, one picker after the other. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AddWindowDialog(onDone: () -> Unit) {
    var days by rememberSaveable { mutableStateOf(listOf(1, 2, 3, 4, 5)) }
    var from by rememberSaveable { mutableStateOf<Int?>(null) }
    if (from == null) TimeDialog(
        stringResource(R.string.block_schedule_from), 23 * 60, onPick = { from = it }, onRemove = null,
        // Confirming the start also dismisses: only a real dismissal (no start picked) closes the whole thing.
        onDismiss = { if (from == null) onDone() },
        extra = {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                (1..7).forEach { d ->
                    FilterChip(selected = d in days, onClick = { days = if (d in days) (days - d).ifEmpty { days } else (days + d).sorted() }, label = { Text(dayName(d)) })
                }
            }
        },
    ) else TimeDialog(
        stringResource(R.string.block_schedule_to), (from!! + 8 * 60) % 1440,
        onPick = { to -> val f = from!!; act { addBlockWindow(BlockWindow(days, f, to)) }; onDone() },
        onRemove = null, onDismiss = onDone,
    )
}
