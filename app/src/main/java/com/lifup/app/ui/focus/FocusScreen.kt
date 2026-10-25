package com.lifup.app.ui.focus

import androidx.compose.material3.IconButton
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.foundation.clickable
import com.lifup.app.ui.guide.InfoButton
import com.lifup.app.ui.guide.Guide
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import com.lifup.app.domain.Quest
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
import kotlin.math.ceil
import kotlin.math.roundToInt

@Composable
fun FocusScreen(s: GameState, active: Boolean = true) {
    // A running session keeps the screen on while you're looking at it, like a clock; leaving the tab lets it sleep.
    if (active && s.focus != null) {
        val view = androidx.compose.ui.platform.LocalView.current
        androidx.compose.runtime.DisposableEffect(view) {
            view.keepScreenOn = true
            onDispose { view.keepScreenOn = false }
        }
    }
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
        val now = rememberNow(1_000)
        val f = s.focus
        if (f != null) ActiveSession(s, f, now) else SessionSetup(s)
    }
}

@Composable
private fun ActiveSession(s: GameState, f: FocusSession, now: Long) {
    val p = Lif.colors
    val total = f.totalMinutes() * 60_000L
    val remaining = (f.endsAt() - now).coerceAtLeast(0)
    val elapsedMs = (now - f.startedAt).coerceAtLeast(0)
    val phase = f.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(now)) }
    val mission = s.allQuests.firstOrNull { it.id == f.questId }
    // Ring: the current Pomodoro block, the mission's remaining minutes, or the hour for open timers.
    val ring = when {
        phase != null -> ((f.elapsedMinutes(now) - phase.startMin) / (phase.endsAtMin - phase.startMin)).toFloat()
        !f.open -> 1 - remaining / total.toFloat()
        mission != null -> (f.creditableMinutes(now) / mission.minutesLeft().coerceAtLeast(1)).toFloat()
        else -> (elapsedMs % 3_600_000L) / 3_600_000f
    }.coerceIn(0f, 1f)
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
                drawArc(ringColor, -90f, 360f * ring, false, tl, arc, style = Stroke(stroke, cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (phase != null) {
                    val endMs = f.startedAt + (phase.endsAtMin * 60_000).toLong()
                    val label = when {
                        f.open -> stringResource(if (phase.work) R.string.pomodoro_work_open else R.string.pomodoro_break_open, phase.cycle)
                        else -> stringResource(if (phase.work) R.string.pomodoro_work else R.string.pomodoro_break, phase.cycle, f.pomodoro!!.rounds)
                    }
                    Text(label.uppercase(), style = MaterialTheme.typography.labelMedium, color = ringColor)
                    Text(fmtDuration(endMs - now), fontSize = 52.sp, fontWeight = FontWeight.Bold, fontFamily = com.lifup.app.ui.theme.Rajdhani)
                    Text(
                        if (f.open) stringResource(R.string.session_elapsed, fmtDuration(elapsedMs)) else stringResource(R.string.session_total_left, fmtDuration(remaining)),
                        style = MaterialTheme.typography.labelSmall, color = p.muted,
                    )
                } else {
                    Text(stringResource(R.string.focusing).uppercase(), style = MaterialTheme.typography.labelMedium, color = ringColor)
                    Text(fmtDuration(if (f.open) elapsedMs else remaining), fontSize = 56.sp, fontWeight = FontWeight.Bold, fontFamily = com.lifup.app.ui.theme.Rajdhani)
                    if (f.open) Text(stringResource(R.string.open_session_running), style = MaterialTheme.typography.labelSmall, color = p.muted)
                }
            }
        }
        Text(
            mission?.let { stringResource(R.string.focus_counts_for, questTitle(it, lang())) } ?: stringResource(R.string.focus_free_session),
            style = MaterialTheme.typography.titleSmall, color = if (mission != null) p.purple else p.muted, modifier = Modifier.padding(bottom = 6.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (f.strict) com.lifup.app.ui.components.Pill(stringResource(R.string.strict), p.red)
            if (f.blockApps && s.settings.blockedApps.isNotEmpty()) {
                if (phase?.work == false) com.lifup.app.ui.components.Pill(stringResource(R.string.apps_free_break), p.green)
                else com.lifup.app.ui.components.Pill(stringResource(R.string.blocking_n, s.settings.blockedApps.size), p.accent)
            }
            com.lifup.app.ui.components.Pill(stringResource(R.string.credited_min, f.creditableMinutes(now).roundToInt()), p.green)
        }
        // Can be switched mid-session (waiting for a call, say); the session service follows within a second.
        Column(Modifier.padding(top = 8.dp)) { DndToggle(s.settings.dndFocus) }
        SectionTitle(stringResource(R.string.ambient))
        val context = LocalContext.current
        AmbientChips(f.ambient) { kind -> act { setFocusAmbient(kind) }; if (kind == Ambient.OWN) Ambient.openMusicApp(context) }
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
                    if (f.strict) stringResource(R.string.stop_strict_text, minutes, breakers) else stringResource(if (f.open) R.string.stop_open_text else R.string.stop_text, minutes),
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

private fun ambientName(kind: String?) = when (kind) { "rain" -> R.string.ambient_rain; "fire" -> R.string.ambient_fire; Ambient.OWN -> R.string.ambient_own; else -> R.string.ambient_none }

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AmbientChips(selected: String?, onSelect: (String?) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (listOf<String?>(null) + Ambient.kinds).forEach { kind ->
            FilterChip(
                selected = selected == kind,
                onClick = { onSelect(kind) },
                label = { Text(stringResource(ambientName(kind))) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Lif.colors.accent.copy(alpha = 0.18f), selectedLabelColor = Lif.colors.accent),
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
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
    var showPerms by rememberSaveable { mutableStateOf(false) }
    var open by rememberSaveable { mutableStateOf(false) }
    var linked by rememberSaveable { mutableStateOf<String?>(null) }
    val focusQuests = s.allQuests.filter { it.type == QuestType.FOCUS && it.status == QuestStatus.OPEN }
    val linkedQuest = focusQuests.firstOrNull { it.id == linked }
    // A mission fills in its mode and remaining minutes; the user can still adjust before starting.
    fun prepare(q: Quest) {
        linked = q.id
        pomodoro = q.usesPomodoro()
        if (pomodoro) {
            val rounds = ceil(q.minutesLeft() / set.pomodoroPlan().workMin.toDouble()).toInt().coerceIn(1, 12)
            act { updateSettings { it.copy(pomodoroRounds = rounds) } }
        } else minutes = q.minutesLeft().coerceIn(1, 240)
    }
    val request = FocusPrep.questId
    LaunchedEffect(request) {
        if (request == null) return@LaunchedEffect
        FocusPrep.questId = null
        s.allQuests.firstOrNull { it.id == request }?.let(::prepare)
    }
    // Choosing apps implies wanting them blocked.
    var lastAppCount by rememberSaveable { mutableStateOf(set.blockedApps.size) }
    if (set.blockedApps.size != lastAppCount) {
        if (set.blockedApps.size > lastAppCount) block = true
        if (set.blockedApps.isEmpty()) block = false
        lastAppCount = set.blockedApps.size
    }
    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}

    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(stringResource(R.string.focus_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
        InfoButton(Guide.FOCUS)
    }
    Spacer(Modifier.height(12.dp))
    MissionPicker(focusQuests, linkedQuest, onPick = ::prepare, onFree = { linked = null })
    Spacer(Modifier.height(8.dp))
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        listOf(R.string.mode_timer, R.string.mode_pomodoro).forEachIndexed { i, label ->
            // A mission fixes the mode: only that mode's minutes count for it.
            val locked = linkedQuest != null && linkedQuest.usesPomodoro() != (i == 1)
            SegmentedButton(selected = pomodoro == (i == 1), onClick = { pomodoro = i == 1 }, enabled = !locked, shape = SegmentedButtonDefaults.itemShape(i, 2)) { Text(stringResource(label), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }
        }
    }
    Spacer(Modifier.height(12.dp))
    Panel {
        if (pomodoro) PomodoroSettings(s, open) { open = it }
        else TimerLength(minutes, open, { minutes = it }) { open = it }
    }
    Spacer(Modifier.height(12.dp))
    PrimaryButton(stringResource(R.string.start_session), onClick = {
        if (Build.VERSION.SDK_INT >= 33 && !Permissions.notifications(context)) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        val plan = if (pomodoro) set.pomodoroPlan() else null
        val quest = focusQuests.firstOrNull { it.id == linked }?.id
        val session = FocusSession(0, minutes, plan, strict && !open, block && Permissions.blockerReady(context) && set.blockedApps.isNotEmpty(), ambient, quest, open)
        act { startFocus(session) }
        if (ambient == Ambient.OWN) Ambient.openMusicApp(context)
    }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.PlayArrow, color = p.purple)

    // Everything else is optional and stays folded away, with a one-line summary of what's on.
    val tick = rememberResumeTick()
    val ready = remember(tick) { Permissions.blockerReady(context) }
    val blocking = block && ready && set.blockedApps.isNotEmpty()
    val summary = listOfNotNull(
        stringResource(R.string.block_apps).takeIf { blocking },
        stringResource(R.string.strict_mode).takeIf { strict && !open },
        stringResource(R.string.dnd_focus).takeIf { set.dndFocus },
        ambient?.let { stringResource(ambientName(it)) },
    ).joinToString(" · ").ifEmpty { stringResource(R.string.options_none) }
    var more by rememberSaveable { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().clickable { more = !more }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(stringResource(R.string.more_options), style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.width(8.dp))
        Text(summary, style = MaterialTheme.typography.labelMedium, color = p.muted, modifier = Modifier.weight(1f), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
        Icon(if (more) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = p.muted)
    }
    if (more) {
        Panel {
            ToggleRow(stringResource(R.string.block_apps), if (ready) "" else stringResource(R.string.block_needs_perms), block && ready, enabled = ready) { block = it }
            if (!ready) TextButton(onClick = { showPerms = true }) { Text(stringResource(R.string.grant_permissions).uppercase(), color = p.gold) }
            FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.align(Alignment.CenterVertically)) {
                    Icon(Icons.Rounded.Apps, null, tint = p.muted, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(pluralStringResource(R.plurals.apps_selected, set.blockedApps.size, set.blockedApps.size), style = MaterialTheme.typography.bodyMedium, color = p.muted)
                }
                TextButton(onClick = { pickApps = true }) { Text(stringResource(R.string.choose_apps).uppercase()) }
            }
            ToggleRow(stringResource(R.string.strict_mode), stringResource(if (open) R.string.strict_open_info else R.string.strict_info), strict && !open, enabled = !open) { strict = it }
            DndToggle(set.dndFocus)
        }
        SectionTitle(stringResource(R.string.ambient))
        AmbientChips(ambient) { ambient = it }
        if (ambient == Ambient.OWN) Text(stringResource(R.string.ambient_own_info), style = MaterialTheme.typography.bodySmall, color = p.muted, modifier = Modifier.padding(top = 6.dp))
    }

    if (pickApps) AppPickerSheet(set.blockedApps) { pickApps = false }
    if (showPerms) PermissionsSheet(s) { showPerms = false }
}

private fun com.lifup.app.domain.Settings.pomodoroPlan() =
    Pomodoro.sane(PomodoroPlan(pomodoroWork, pomodoroBreak, pomodoroRounds, pomodoroLongBreak, pomodoroLongEvery))

/** Length of a plain timer: big number with ±5, quick picks, or no limit. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TimerLength(minutes: Int, open: Boolean, onMinutes: (Int) -> Unit, onOpen: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        IconButton(onClick = { onMinutes((minutes - 5).coerceAtLeast(1)) }, enabled = !open && minutes > 1) { Icon(Icons.Rounded.Remove, stringResource(R.string.a11y_decrease)) }
        Text(if (open) "∞" else "$minutes min", style = MaterialTheme.typography.displaySmall, modifier = Modifier.padding(horizontal = 12.dp))
        IconButton(onClick = { onMinutes((minutes + 5).coerceAtMost(240)) }, enabled = !open && minutes < 240) { Icon(Icons.Rounded.Add, stringResource(R.string.a11y_increase)) }
    }
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)) {
        listOf(15, 25, 45, 60, 90).forEach { m -> FilterChip(selected = !open && minutes == m, onClick = { onOpen(false); onMinutes(m) }, label = { Text("$m") }) }
        FilterChip(selected = open, onClick = { onOpen(!open) }, label = { Text(stringResource(R.string.open_session)) })
    }
    if (open) Text(stringResource(R.string.open_session_info), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
}

private val POMODORO_PRESETS = listOf(25 to 5, 50 to 10, 90 to 15)

/** Pomodoro: three common presets, custom lengths on demand (breaks capped so they can't outweigh the work). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PomodoroSettings(s: GameState, open: Boolean, onOpen: (Boolean) -> Unit) {
    val p = Lif.colors
    val plan = s.settings.pomodoroPlan()
    fun save(f: (com.lifup.app.domain.Settings) -> com.lifup.app.domain.Settings) = act {
        updateSettings { old ->
            val n = f(old)
            val sane = Pomodoro.sane(PomodoroPlan(n.pomodoroWork, n.pomodoroBreak, n.pomodoroRounds, n.pomodoroLongBreak, n.pomodoroLongEvery))
            n.copy(pomodoroBreak = sane.breakMin, pomodoroLongBreak = sane.longBreakMin)
        }
    }
    val preset = POMODORO_PRESETS.indexOf(plan.workMin to plan.breakMin)
    var custom by rememberSaveable { mutableStateOf(preset < 0) }
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        POMODORO_PRESETS.forEachIndexed { i, (w, b) ->
            FilterChip(selected = !custom && preset == i, onClick = { custom = false; save { it.copy(pomodoroWork = w, pomodoroBreak = b) } }, label = { Text("$w / $b") })
        }
        FilterChip(selected = custom || preset < 0, onClick = { custom = !custom }, label = { Text(stringResource(R.string.custom)) })
    }
    if (custom || preset < 0) {
        Stepper(plan.workMin, { v -> save { it.copy(pomodoroWork = v) } }, 5..90, stringResource(R.string.pomodoro_work_len), "m", step = 5)
        Stepper(plan.breakMin, { v -> save { it.copy(pomodoroBreak = v) } }, 1..Pomodoro.maxBreak(plan.workMin), stringResource(R.string.pomodoro_break_len), "m")
        Stepper(plan.longBreakMin, { v -> save { it.copy(pomodoroLongBreak = v) } }, 0..Pomodoro.maxLongBreak(plan.workMin), stringResource(R.string.pomodoro_long_len), "m", step = 5)
        if (plan.longBreakMin > 0) Stepper(plan.longEvery, { v -> save { it.copy(pomodoroLongEvery = v) } }, 2..8, stringResource(R.string.pomodoro_long_every), "")
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f)) {
            if (!open) Stepper(plan.rounds, { v -> save { it.copy(pomodoroRounds = v) } }, 1..12, stringResource(R.string.pomodoro_rounds), "")
            else Text(stringResource(R.string.open_session_info), style = MaterialTheme.typography.bodySmall, color = p.muted)
        }
        Spacer(Modifier.width(8.dp))
        FilterChip(selected = open, onClick = { onOpen(!open) }, label = { Text("∞") })
    }
    if (!open) Text(stringResource(R.string.pomodoro_total, Pomodoro.totalMinutes(plan), plan.workMin * plan.rounds), style = MaterialTheme.typography.labelMedium, color = p.muted)
}

/** The only place focus missions are listed: pick one (or a free session) and see its progress. */
@Composable
private fun MissionPicker(quests: List<Quest>, linked: Quest?, onPick: (Quest) -> Unit, onFree: () -> Unit) {
    val p = Lif.colors
    Panel {
        Text(stringResource(R.string.focus_mission), style = MaterialTheme.typography.labelLarge, color = p.muted)
        MissionOption(stringResource(R.string.focus_free), stringResource(R.string.focus_free_hint), linked == null, onFree)
        quests.forEach { q ->
            MissionOption(
                questTitle(q, lang()),
                stringResource(R.string.focus_left, q.minutesLeft()),
                linked?.id == q.id, { onPick(q) },
                progress = (q.progress / q.target).toFloat(), pomodoro = q.usesPomodoro(),
            )
        }
    }
}

@Composable
private fun MissionOption(title: String, detail: String, selected: Boolean, onClick: () -> Unit, progress: Float? = null, pomodoro: Boolean = false) {
    val p = Lif.colors
    Panel(
        modifier = Modifier.padding(top = 6.dp),
        border = if (selected) p.purple else p.border,
        background = if (selected) p.purple.copy(alpha = 0.08f) else p.panelHigh,
        onClick = onClick,
        padding = androidx.compose.foundation.layout.PaddingValues(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = if (selected) p.purple else p.text, modifier = Modifier.weight(1f), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            if (pomodoro) com.lifup.app.ui.components.Pill(stringResource(R.string.mode_pomodoro), p.purple)
        }
        if (progress != null) { Spacer(Modifier.height(4.dp)); Bar(progress, p.purple) }
        if (selected || progress != null) Text(detail, style = MaterialTheme.typography.labelSmall, color = p.muted, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
fun ToggleRow(title: String, subtitle: String, checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = if (enabled) Lif.colors.text else Lif.colors.dim)
            if (subtitle.isNotBlank()) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
        }
        Spacer(Modifier.width(8.dp))
        Switch(checked = checked, onCheckedChange = onChange, enabled = enabled)
    }
}

/** Do Not Disturb while focusing; the first time, Android asks for "Do Not Disturb access". */
@Composable
private fun DndToggle(on: Boolean) {
    val context = LocalContext.current
    val tick = rememberResumeTick()
    val granted = remember(tick) { com.lifup.app.system.FocusDnd.granted(context) }
    ToggleRow(stringResource(R.string.dnd_focus), stringResource(if (granted || !on) R.string.dnd_focus_info else R.string.dnd_focus_needs), on) { v ->
        act { updateSettings { it.copy(dndFocus = v) } }
        if (v && !granted) com.lifup.app.system.FocusDnd.openAccess(context)
    }
    if (on && !granted) TextButton(onClick = { com.lifup.app.system.FocusDnd.openAccess(context) }) {
        Text(stringResource(R.string.grant_permissions).uppercase(), color = Lif.colors.gold)
    }
}
