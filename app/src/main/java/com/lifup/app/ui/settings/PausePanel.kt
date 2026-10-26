package com.lifup.app.ui.settings

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BeachAccess
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.Ctx
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Rules
import com.lifup.app.domain.endPause
import com.lifup.app.domain.maxPauseDays
import com.lifup.app.domain.pauseDaysLeft
import com.lifup.app.domain.pauseStart
import com.lifup.app.domain.startPause
import com.lifup.app.ui.act
import com.lifup.app.ui.components.ConfirmDialog
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Stepper
import com.lifup.app.ui.content
import com.lifup.app.ui.theme.Lif
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private fun fmtDay(d: LocalDate) = d.format(DateTimeFormatter.ofPattern("d MMM"))

/** Settings' pause block: what a pause does, then either the running one or how long a new one lasts. */
@Composable
internal fun PausePanel(s: GameState) {
    val c = Lif.colors
    val ctx = Ctx(content, System.currentTimeMillis())
    val until = s.pauseUntil?.takeIf { it >= ctx.todayKey }
    var days by rememberSaveable { mutableIntStateOf(7) }
    var confirm by rememberSaveable { mutableStateOf(false) }
    Panel {
        Text(stringResource(R.string.pause_info), style = MaterialTheme.typography.bodySmall, color = c.muted)
        Spacer(Modifier.height(8.dp))
        if (until != null) {
            val from = LocalDate.parse(s.pauseFrom ?: until)
            Text(stringResource(R.string.pause_active, fmtDay(from), fmtDay(LocalDate.parse(until))), style = MaterialTheme.typography.bodyLarge, color = c.purple)
            Spacer(Modifier.height(8.dp))
            GhostButton(stringResource(R.string.pause_end), onClick = { act { endPause() } }, modifier = Modifier.fillMaxWidth())
        } else {
            val max = s.maxPauseDays(ctx)
            if (max <= 0) {
                Text(stringResource(R.string.pause_none_left, Rules.PAUSE_DAYS_PER_YEAR), style = MaterialTheme.typography.bodyMedium, color = c.gold)
            } else {
                Stepper(days.coerceIn(1, max), { days = it }, 1..max, stringResource(R.string.pause_days_label))
                Text(stringResource(R.string.pause_left, s.pauseDaysLeft(ctx.today), Rules.PAUSE_DAYS_PER_YEAR), style = MaterialTheme.typography.bodySmall, color = c.dim)
                Spacer(Modifier.height(8.dp))
                GhostButton(stringResource(R.string.pause_start), onClick = { confirm = true }, modifier = Modifier.fillMaxWidth(), color = c.purple, icon = Icons.Rounded.BeachAccess)
            }
        }
    }
    if (confirm) {
        val n = days.coerceIn(1, maxOf(1, s.maxPauseDays(ctx)))
        val from = ctx.pauseStart()
        ConfirmDialog(
            stringResource(R.string.pause_confirm_title, fmtDay(from), fmtDay(from.plusDays(n - 1L))),
            stringResource(R.string.pause_confirm_text),
            stringResource(R.string.pause_start),
            onConfirm = { confirm = false; act { startPause(n) } },
            onDismiss = { confirm = false },
        )
    }
}
