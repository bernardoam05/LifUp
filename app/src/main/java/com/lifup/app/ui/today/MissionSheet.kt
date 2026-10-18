package com.lifup.app.ui.today

import com.lifup.app.domain.Quest
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.AlertDialog
import androidx.compose.foundation.layout.size
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.rounded.Edit
import com.lifup.app.domain.text
import com.lifup.app.domain.defOf
import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.RestartAlt
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.GameState
import com.lifup.app.domain.QuestOrigin
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.Rules
import com.lifup.app.domain.availableAt
import com.lifup.app.domain.completeQuest
import com.lifup.app.domain.pauseTimer
import com.lifup.app.domain.resetTimer
import com.lifup.app.domain.saveNote
import com.lifup.app.domain.setProgress
import com.lifup.app.domain.startTimer
import com.lifup.app.domain.swapQuest
import com.lifup.app.domain.undoQuest
import com.lifup.app.system.Permissions
import com.lifup.app.ui.LocalTabSwitcher
import com.lifup.app.ui.Tab
import com.lifup.app.ui.act
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.rememberNow
import com.lifup.app.ui.content
import com.lifup.app.ui.focus.usesPomodoro
import com.lifup.app.ui.fmtDuration
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.lang
import com.lifup.app.ui.questColor
import com.lifup.app.ui.questDetail
import com.lifup.app.ui.questIcon
import com.lifup.app.ui.questTitle
import com.lifup.app.ui.questTypeName
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.unitLabel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionSheet(s: GameState, questId: String, onEdit: ((String) -> Unit)? = null, onDismiss: () -> Unit) {
    val q = s.allQuests.firstOrNull { it.id == questId } ?: return
    val p = Lif.colors
    val now = rememberNow(1_000)
    val unit = unitLabel(q.unit)
    val open = q.status == QuestStatus.OPEN
    val record = s.records[q.defId]
    val timer = s.timers[q.id]
    var note by remember(q.defId) { mutableStateOf(record?.note.orEmpty()) }

    ModalBottomSheet(onDismissRequest = { if (note != record?.note.orEmpty()) act { saveNote(q.defId, note) }; onDismiss() }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = p.panel) {
        // Order: what it is, how far along, the main action, then details and extras.
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SheetHeader(q)
            Text(questDetail(q, lang(), unit), style = MaterialTheme.typography.bodyLarge, color = p.text)
            q.prompt?.let { Text(it.text(lang()), style = MaterialTheme.typography.bodyMedium, color = p.accent) }
            if (q.auto != null && q.autoOff) Text(stringResource(R.string.auto_off), style = MaterialTheme.typography.bodySmall, color = p.gold)
            else if (q.auto != null) AutoInfo(q.auto, s)

            if (open && q.countable()) Counter(q, unit)
            if (open && q.type == QuestType.FOCUS) FocusAction(s, q, onDismiss)
            if (open && q.type == QuestType.GPS) RunPanel(s, q, tracking = q.auto == null || q.autoOff)
            if (open && q.type != QuestType.FORBIDDEN && q.type != QuestType.LIMIT) CompleteAction(q, onDismiss)

            val def = s.defOf(q.defId, content)
            if (open && q.origin == QuestOrigin.DAILY && def?.kind == DefKind.POOL) {
                val free = s.daily.swapsUsed < Rules.FREE_SWAPS_PER_DAY
                val scrolls = s.items("pergaminho_troca")
                GhostButton(
                    if (free) stringResource(R.string.swap_free) else stringResource(R.string.swap_scroll, scrolls),
                    onClick = { act { swapQuest(q.id) }; onDismiss() },
                    enabled = free || scrolls > 0, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.SwapHoriz,
                )
            }
            if (q.status == QuestStatus.DONE && q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA, QuestOrigin.WEEKLY)) {
                GhostButton(stringResource(R.string.undo), onClick = { act { undoQuest(q.id) }; onDismiss() }, modifier = Modifier.fillMaxWidth(), icon = Icons.AutoMirrored.Rounded.Undo, color = p.muted)
            }

            Details(s, q)
            if (open && q.timeable()) Stopwatch(q, timer, now)
            OutlinedTextField(
                value = note, onValueChange = { note = it.take(500) },
                label = { Text(stringResource(R.string.note)) }, modifier = Modifier.fillMaxWidth(), minLines = 2,
            )
            // Edits change the mission from tomorrow on, so today's target can't be lowered to finish it.
            if (onEdit != null && def != null && q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA, QuestOrigin.WEEKLY)) {
                TextButton(onClick = { onEdit(def.id) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Rounded.Edit, null, tint = p.muted, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.edit_mission_tomorrow), color = p.muted, style = MaterialTheme.typography.labelLarge)
                }
            }
            Spacer(Modifier.height(4.dp))
        }
    }
}

/** Hand-counted missions (reps, pages, glasses…): timed and automatic ones fill differently. */
private fun Quest.countable() = auto == null && fromHour == null && target > 1 && unit != "s" && unit != "min" &&
    (type == QuestType.TRAINING || type == QuestType.KNOWLEDGE)

/** Missions where timing yourself means something: not for a glass of water or a phone call. */
private fun Quest.timeable() = auto == null && fromHour == null && (type == QuestType.TRAINING || type == QuestType.KNOWLEDGE) &&
    unit in setOf("reps", "s", "min", "pages", "flights", "km")

@Composable
private fun SheetHeader(q: Quest) {
    val color = questColor(q.type, Lif.colors)
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconBadge(questIcon(q.type), color, 46.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(questTitle(q, lang()), style = MaterialTheme.typography.titleLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Pill(stringResource(questTypeName(q.type)), color)
                Pill(q.rank.name, color)
            }
        }
    }
}

/** −1 / +1 / +5 around the count; tapping the count lets you type it. Never finishes the mission by itself. */
@Composable
private fun Counter(q: Quest, unit: String) {
    val p = Lif.colors
    var typing by remember { mutableStateOf(false) }
    val set = { v: Double -> act { setProgress(q.id, v, autoComplete = false) } }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        IconButton(onClick = { set(q.progress - 1) }, enabled = q.progress > 0) { Icon(Icons.Rounded.Remove, stringResource(R.string.a11y_decrease)) }
        TextButton(onClick = { typing = true }, modifier = Modifier.weight(1f)) {
            Text("${fmtNum(q.progress)} / ${fmtNum(q.target)} $unit", style = MaterialTheme.typography.titleMedium, color = if (q.progress >= q.target) p.green else p.text)
        }
        GhostButton("+1", onClick = { set(q.progress + 1) })
        GhostButton("+5", onClick = { set(q.progress + 5) })
    }
    if (typing) CountDialog(q.progress, q.target, onDismiss = { typing = false }) { set(it); typing = false }
}

@Composable
private fun CountDialog(current: Double, target: Double, onDismiss: () -> Unit, onSet: (Double) -> Unit) {
    var text by remember { mutableStateOf(fmtNum(current)) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.count_title)) },
        text = {
            OutlinedTextField(
                text, { text = it.filter { ch -> ch.isDigit() || ch == '.' }.take(6) }, singleLine = true,
                suffix = { Text("/ ${fmtNum(target)}") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )
        },
        confirmButton = { TextButton(onClick = { text.toDoubleOrNull()?.let(onSet) }) { Text(stringResource(R.string.save)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
private fun FocusAction(s: GameState, q: Quest, onDismiss: () -> Unit) {
    val p = Lif.colors
    val switchTab = LocalTabSwitcher.current
    val active = s.focus
    when {
        active?.questId == q.id -> PrimaryButton(stringResource(R.string.focus_view), onClick = { onDismiss(); switchTab(Tab.FOCUS) }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Psychology, color = p.purple)
        active != null -> Text(stringResource(R.string.focus_busy), style = MaterialTheme.typography.bodySmall, color = p.gold)
        else -> PrimaryButton(
            stringResource(if (q.usesPomodoro()) R.string.focus_prepare_pomodoro else R.string.focus_prepare),
            onClick = { com.lifup.app.ui.focus.FocusPrep.questId = q.id; onDismiss(); switchTab(Tab.FOCUS) },
            modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Psychology, color = p.purple,
        )
    }
}

@Composable
private fun CompleteAction(q: Quest, onDismiss: () -> Unit) {
    val p = Lif.colors
    // Tracked missions normally fill themselves, so marking them by hand is the secondary action.
    val tracked = q.type == QuestType.FOCUS || q.type == QuestType.GPS || q.auto != null
    val complete = { act { completeQuest(q.id) }; onDismiss() }
    val available = q.availableAt(java.time.LocalTime.now().hour)
    if (!available) Text(stringResource(R.string.available_from, q.fromHour ?: 0), style = MaterialTheme.typography.bodySmall, color = p.gold)
    if (tracked) GhostButton(stringResource(R.string.mark_done_manual), onClick = complete, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Check)
    else PrimaryButton(stringResource(R.string.complete), onClick = complete, modifier = Modifier.fillMaxWidth(), enabled = available, icon = Icons.Rounded.Check)
}

/** Rewards, records and target adjustments: useful to know, never in the way. */
@Composable
private fun Details(s: GameState, q: Quest) {
    val p = Lif.colors
    val context = LocalContext.current
    val record = s.records[q.defId]
    if (q.xp > 0 || q.gold > 0) Text(stringResource(R.string.rewards_line, q.xp, q.gold), style = MaterialTheme.typography.labelLarge, color = p.accent)
    if (s.doubleXpNext && q.status == QuestStatus.OPEN && q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA)) {
        Text(stringResource(R.string.double_xp_active), style = MaterialTheme.typography.labelMedium, color = p.gold)
    }
    if (record != null && (record.bestMs > 0 || record.count > 0)) Text(
        buildString {
            if (record.count > 0) append(context.getString(R.string.record_count, record.count))
            if (record.bestMs > 0) { if (isNotEmpty()) append(" · "); append(context.getString(R.string.record_best, fmtDuration(record.bestMs))) }
        },
        style = MaterialTheme.typography.labelMedium, color = p.muted,
    )
    if (q.adapt != 0) Text(
        stringResource(if (q.adapt > 0) R.string.adapt_up else R.string.adapt_down, kotlin.math.abs(q.adapt) * 10),
        style = MaterialTheme.typography.bodySmall, color = p.muted,
    )
}

/** Stopwatch, kept in the state so it survives the app being closed. */
@Composable
private fun Stopwatch(q: Quest, timer: com.lifup.app.domain.MissionTimer?, now: Long) {
    val p = Lif.colors
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(fmtDuration(timer?.elapsed(now) ?: 0), style = MaterialTheme.typography.headlineMedium, color = if (timer?.running == true) p.accent else p.text, modifier = Modifier.weight(1f))
        if (timer?.running == true) IconButton(onClick = { act { pauseTimer(q.id) } }) { Icon(Icons.Rounded.Pause, stringResource(R.string.a11y_pause)) }
        else IconButton(onClick = { act { startTimer(q.id) } }) { Icon(Icons.Rounded.PlayArrow, stringResource(R.string.a11y_start), tint = p.accent) }
        IconButton(onClick = { act { resetTimer(q.id) } }, enabled = timer != null) { Icon(Icons.Rounded.RestartAlt, stringResource(R.string.a11y_reset)) }
    }
}

/** Explains where an automatic quest gets its numbers and offers to enable the source when missing. */
@Composable
private fun AutoInfo(kind: com.lifup.app.domain.AutoKind, s: GameState) {
    val context = LocalContext.current
    val tick = com.lifup.app.ui.focus.rememberResumeTick()
    val activity = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val switchTab = LocalTabSwitcher.current
    val ready = androidx.compose.runtime.remember(tick, s.settings.blockedApps) {
        when (kind) {
            com.lifup.app.domain.AutoKind.STEPS, com.lifup.app.domain.AutoKind.WALK_DISTANCE -> com.lifup.app.system.AutoTracker.stepsAvailable(context)
            com.lifup.app.domain.AutoKind.SCREEN_TIME -> Permissions.usageAccess(context)
            com.lifup.app.domain.AutoKind.DISTRACTION_TIME -> Permissions.usageAccess(context) && s.settings.blockedApps.isNotEmpty()
        }
    }
    com.lifup.app.ui.components.Panel(background = Lif.colors.green.copy(alpha = 0.08f), border = Lif.colors.green.copy(alpha = 0.4f)) {
        Text(stringResource(R.string.auto_info, stringResource(com.lifup.app.ui.autoName(kind))), style = MaterialTheme.typography.bodySmall, color = Lif.colors.text)
        if (!ready) {
            Spacer(Modifier.height(6.dp))
            Text(stringResource(R.string.auto_missing), style = MaterialTheme.typography.bodySmall, color = Lif.colors.gold)
            androidx.compose.material3.TextButton(onClick = {
                when (kind) {
                    com.lifup.app.domain.AutoKind.STEPS, com.lifup.app.domain.AutoKind.WALK_DISTANCE -> if (Build.VERSION.SDK_INT >= 29) activity.launch(Manifest.permission.ACTIVITY_RECOGNITION)
                    com.lifup.app.domain.AutoKind.SCREEN_TIME -> Permissions.openUsageAccess(context)
                    com.lifup.app.domain.AutoKind.DISTRACTION_TIME ->
                        if (!Permissions.usageAccess(context)) Permissions.openUsageAccess(context) else switchTab(Tab.FOCUS)
                }
            }) { Text(stringResource(R.string.auto_enable).uppercase()) }
        }
    }
}
