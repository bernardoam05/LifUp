package com.lifup.app.ui.focus

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifup.app.R
import com.lifup.app.domain.FocusSession
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Pomodoro
import com.lifup.app.domain.PomodoroPlan
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.creditableMinutes
import com.lifup.app.domain.elapsedMinutes
import com.lifup.app.domain.endsAt
import com.lifup.app.domain.penaltyBlockActive
import com.lifup.app.domain.setFocusAmbient
import com.lifup.app.domain.startFocus
import com.lifup.app.domain.stopFocus
import com.lifup.app.domain.totalMinutes
import com.lifup.app.domain.updateSettings
import com.lifup.app.system.Ambient
import com.lifup.app.system.Permissions
import com.lifup.app.ui.act
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.components.Stepper
import com.lifup.app.ui.components.rememberNow
import com.lifup.app.ui.fmtDuration
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.fmtShort
import com.lifup.app.ui.lang
import com.lifup.app.ui.questTitle
import com.lifup.app.ui.theme.Lif
import kotlin.math.roundToInt

@Composable
fun FocusScreen(s: GameState) {
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
        val now = rememberNow(1_000)
        if (s.penaltyBlockActive(now) || (s.penalty.active && s.penalty.blockStart > now && s.settings.blockOnPenalty)) PenaltyBlockBanner(s, now)
        val f = s.focus
        if (f != null) ActiveSession(s, f, now) else SessionSetup(s)
        FocusQuests(s)
        PermissionsPanel(s)
    }
}

@Composable
private fun PenaltyBlockBanner(s: GameState, now: Long) {
    val p = Lif.colors
    Panel(border = p.red.copy(alpha = 0.6f), background = p.red.copy(alpha = 0.08f), modifier = Modifier.padding(bottom = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Lock, null, tint = p.red)
            Spacer(Modifier.width(8.dp))
            Text(
                if (s.penalty.blockStart > now) stringResource(R.string.block_starts_in, fmtShort(s.penalty.blockStart - now))
                else stringResource(R.string.penalty_block_active, fmtShort(s.penalty.blockEnd - now)),
                style = MaterialTheme.typography.titleSmall, color = p.red,
            )
        }
        Text(stringResource(R.string.penalty_block_info), style = MaterialTheme.typography.bodySmall, color = p.muted)
    }
}

@Composable
private fun ActiveSession(s: GameState, f: FocusSession, now: Long) {
    val p = Lif.colors
    val total = f.totalMinutes() * 60_000L
    val remaining = (f.endsAt() - now).coerceAtLeast(0)
    val phase = f.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(now)) }
    val ringColor = if (phase?.work == false) p.green else if (f.strict) p.red else p.purple
    var confirmStop by rememberSaveable { mutableStateOf(false) }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Box(Modifier.size(260.dp).padding(8.dp), contentAlignment = Alignment.Center) {
            val track = p.border
            Canvas(Modifier.size(240.dp)) {
                val stroke = 14.dp.toPx()
                val arc = Size(size.width - stroke, size.height - stroke)
                val tl = Offset(stroke / 2, stroke / 2)
                drawArc(track, -90f, 360f, false, tl, arc, style = Stroke(stroke))
                drawArc(ringColor, -90f, 360f * (1 - remaining / total.toFloat()), false, tl, arc, style = Stroke(stroke, cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (phase != null) {
                    val endMs = f.startedAt + (phase.endsAtMin * 60_000).toLong()
                    Text(
                        stringResource(if (phase.work) R.string.pomodoro_work else R.string.pomodoro_break, phase.cycle, f.pomodoro!!.rounds).uppercase(),
                        style = MaterialTheme.typography.labelMedium, color = ringColor,
                    )
                    Text(fmtDuration(endMs - now), fontSize = 52.sp, fontWeight = FontWeight.Bold, fontFamily = com.lifup.app.ui.theme.Rajdhani)
                    Text(stringResource(R.string.session_total_left, fmtDuration(remaining)), style = MaterialTheme.typography.labelSmall, color = p.muted)
                } else {
                    Text(stringResource(R.string.focusing).uppercase(), style = MaterialTheme.typography.labelMedium, color = ringColor)
                    Text(fmtDuration(remaining), fontSize = 56.sp, fontWeight = FontWeight.Bold, fontFamily = com.lifup.app.ui.theme.Rajdhani)
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (f.strict) com.lifup.app.ui.components.Pill(stringResource(R.string.strict), p.red)
            if (f.blockApps && s.settings.blockedApps.isNotEmpty()) com.lifup.app.ui.components.Pill(stringResource(R.string.blocking_n, s.settings.blockedApps.size), p.accent)
            com.lifup.app.ui.components.Pill(stringResource(R.string.credited_min, f.creditableMinutes(now).roundToInt()), p.green)
        }
        SectionTitle(stringResource(R.string.ambient))
        AmbientChips(f.ambient) { kind -> act { setFocusAmbient(kind) } }
        Spacer(Modifier.height(16.dp))
        PrimaryButton(stringResource(R.string.stop_session), onClick = { confirmStop = true }, modifier = Modifier.fillMaxWidth(), color = p.red, icon = Icons.Rounded.Stop)
    }

    if (confirmStop) {
        val minutes = f.creditableMinutes(now).roundToInt()
        val breakers = s.items("quebra_feiticos")
        AlertDialog(
            onDismissRequest = { confirmStop = false },
            containerColor = p.panel,
            title = { Text(stringResource(R.string.stop_session), style = MaterialTheme.typography.titleLarge) },
            text = {
                Text(
                    if (f.strict) stringResource(R.string.stop_strict_text, minutes, breakers) else stringResource(R.string.stop_text, minutes),
                    color = p.muted,
                )
            },
            confirmButton = {
                Column(horizontalAlignment = Alignment.End) {
                    if (f.strict && breakers > 0) TextButton(onClick = { act { stopFocus(useSpellbreaker = true) }; confirmStop = false }) {
                        Text(stringResource(R.string.use_spellbreaker).uppercase(), color = p.accent)
                    }
                    TextButton(onClick = { act { stopFocus() }; confirmStop = false }) {
                        Text(stringResource(if (f.strict) R.string.stop_and_lose else R.string.stop).uppercase(), color = p.red)
                    }
                    TextButton(onClick = { confirmStop = false }) { Text(stringResource(R.string.keep_going).uppercase(), color = p.muted) }
                }
            },
        )
    }
}

@Composable
private fun AmbientChips(selected: String?, onSelect: (String?) -> Unit) {
    val names = mapOf(null to R.string.ambient_none, "rain" to R.string.ambient_rain, "fire" to R.string.ambient_fire, "lofi" to R.string.ambient_lofi)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (listOf<String?>(null) + Ambient.kinds).forEach { kind ->
            FilterChip(
                selected = selected == kind,
                onClick = { onSelect(kind) },
                label = { Text(stringResource(names.getValue(kind))) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Lif.colors.accent.copy(alpha = 0.18f), selectedLabelColor = Lif.colors.accent),
            )
        }
    }
}

@Composable
private fun SessionSetup(s: GameState) {
    val p = Lif.colors
    val context = LocalContext.current
    val set = s.settings
    var pomodoro by rememberSaveable { mutableStateOf(false) }
    var minutes by rememberSaveable { mutableStateOf(set.focusMinutes) }
    var strict by rememberSaveable { mutableStateOf(false) }
    var block by rememberSaveable { mutableStateOf(set.blockedApps.isNotEmpty()) }
    var ambient by rememberSaveable { mutableStateOf<String?>(null) }
    var pickApps by rememberSaveable { mutableStateOf(false) }
    // Choosing apps implies wanting them blocked.
    var lastAppCount by rememberSaveable { mutableStateOf(set.blockedApps.size) }
    if (set.blockedApps.size != lastAppCount) {
        if (set.blockedApps.size > lastAppCount) block = true
        if (set.blockedApps.isEmpty()) block = false
        lastAppCount = set.blockedApps.size
    }
    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}

    Text(stringResource(R.string.focus_title), style = MaterialTheme.typography.headlineSmall)
    Spacer(Modifier.height(12.dp))
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        listOf(R.string.mode_timer, R.string.mode_pomodoro).forEachIndexed { i, label ->
            SegmentedButton(selected = pomodoro == (i == 1), onClick = { pomodoro = i == 1 }, shape = SegmentedButtonDefaults.itemShape(i, 2)) { Text(stringResource(label)) }
        }
    }
    Spacer(Modifier.height(12.dp))
    Panel {
        if (!pomodoro) {
            Text("$minutes min", style = MaterialTheme.typography.displaySmall, modifier = Modifier.align(Alignment.CenterHorizontally))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf(15, 25, 45, 60, 90, 120).forEach { m ->
                    FilterChip(selected = minutes == m, onClick = { minutes = m }, label = { Text("$m") })
                }
            }
            Stepper(minutes, { minutes = it }, 5..240, stringResource(R.string.fine_tune), " min")
        } else {
            Stepper(set.pomodoroWork, { v -> act { updateSettings { it.copy(pomodoroWork = v) } } }, 5..90, stringResource(R.string.pomodoro_work_len), "m")
            Stepper(set.pomodoroBreak, { v -> act { updateSettings { it.copy(pomodoroBreak = v) } } }, 1..30, stringResource(R.string.pomodoro_break_len), "m")
            Stepper(set.pomodoroRounds, { v -> act { updateSettings { it.copy(pomodoroRounds = v) } } }, 1..12, stringResource(R.string.pomodoro_rounds), "")
            val plan = PomodoroPlan(set.pomodoroWork, set.pomodoroBreak, set.pomodoroRounds)
            Text(stringResource(R.string.pomodoro_total, Pomodoro.totalMinutes(plan), set.pomodoroWork * set.pomodoroRounds), style = MaterialTheme.typography.labelMedium, color = p.muted)
        }
    }
    Spacer(Modifier.height(8.dp))
    Panel {
        val ready = Permissions.blockerReady(context)
        ToggleRow(stringResource(R.string.block_apps), stringResource(if (ready) R.string.block_apps_info else R.string.block_needs_perms), block && ready, enabled = ready) { block = it }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
            Icon(Icons.Rounded.Apps, null, tint = p.muted, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(pluralStringResource(R.plurals.apps_selected, set.blockedApps.size, set.blockedApps.size), style = MaterialTheme.typography.bodyMedium, color = p.muted, modifier = Modifier.weight(1f))
            TextButton(onClick = { pickApps = true }) { Text(stringResource(R.string.choose_apps).uppercase()) }
        }
        ToggleRow(stringResource(R.string.strict_mode), stringResource(R.string.strict_info), strict) { strict = it }
    }
    SectionTitle(stringResource(R.string.ambient))
    AmbientChips(ambient) { ambient = it }
    Spacer(Modifier.height(16.dp))
    PrimaryButton(stringResource(R.string.start_session), onClick = {
        if (Build.VERSION.SDK_INT >= 33 && !Permissions.notifications(context)) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        val plan = if (pomodoro) PomodoroPlan(set.pomodoroWork, set.pomodoroBreak, set.pomodoroRounds) else null
        val session = FocusSession(0, minutes, plan, strict, block && Permissions.blockerReady(context) && set.blockedApps.isNotEmpty(), ambient)
        act { startFocus(session) }
    }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.PlayArrow, color = p.purple)

    if (pickApps) AppPickerSheet(set.blockedApps) { pickApps = false }
}

@Composable
fun ToggleRow(title: String, subtitle: String, checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = if (enabled) Lif.colors.text else Lif.colors.dim)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
        }
        Spacer(Modifier.width(8.dp))
        Switch(checked = checked, onCheckedChange = onChange, enabled = enabled)
    }
}

@Composable
private fun FocusQuests(s: GameState) {
    val quests = s.allQuests.filter { it.type == QuestType.FOCUS && it.status == QuestStatus.OPEN }
    if (quests.isEmpty()) return
    SectionTitle(stringResource(R.string.focus_quests))
    quests.forEach { q ->
        Panel(modifier = Modifier.padding(bottom = 6.dp)) {
            Text(questTitle(q, lang()), style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(6.dp))
            Bar((q.progress / q.target).toFloat(), Lif.colors.purple)
            Text("${fmtNum(q.progress)} / ${fmtNum(q.target)} min", style = MaterialTheme.typography.labelSmall, color = Lif.colors.dim)
        }
    }
}
