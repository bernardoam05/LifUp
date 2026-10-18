package com.lifup.app.ui.today

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
fun MissionSheet(s: GameState, questId: String, onDismiss: () -> Unit) {
    val q = s.allQuests.firstOrNull { it.id == questId } ?: return
    val p = Lif.colors
    val context = LocalContext.current
    val switchTab = LocalTabSwitcher.current
    val now = rememberNow(1_000)
    val color = questColor(q.type, p)
    val unit = unitLabel(q.unit)
    val open = q.status == QuestStatus.OPEN
    val record = s.records[q.defId]
    val timer = s.timers[q.id]
    var note by remember(q.defId) { mutableStateOf(record?.note.orEmpty()) }

    ModalBottomSheet(onDismissRequest = { if (note != record?.note.orEmpty()) act { saveNote(q.defId, note) }; onDismiss() }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = p.panel) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
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
            Text(questDetail(q, lang(), unit), style = MaterialTheme.typography.bodyLarge, color = p.text)
            if (q.xp > 0 || q.gold > 0) {
                Text(stringResource(R.string.rewards_line, q.xp, q.gold), style = MaterialTheme.typography.labelLarge, color = p.accent)
            }
            if (s.doubleXpNext && open && q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA)) {
                Text(stringResource(R.string.double_xp_active), style = MaterialTheme.typography.labelMedium, color = p.gold)
            }
            if (record != null && (record.bestMs > 0 || record.count > 0)) {
                Text(
                    buildString {
                        if (record.count > 0) append(context.getString(R.string.record_count, record.count))
                        if (record.bestMs > 0) { if (isNotEmpty()) append(" · "); append(context.getString(R.string.record_best, fmtDuration(record.bestMs))) }
                    },
                    style = MaterialTheme.typography.labelMedium, color = p.muted,
                )
            }

            if (q.auto != null && q.autoOff) Text(stringResource(R.string.auto_off), style = MaterialTheme.typography.bodySmall, color = p.gold)
            else if (q.auto != null) AutoInfo(q.auto, s)
            if (q.adapt != 0) Text(
                stringResource(if (q.adapt > 0) R.string.adapt_up else R.string.adapt_down, kotlin.math.abs(q.adapt) * 10),
                style = MaterialTheme.typography.bodySmall, color = p.dim,
            )

            if (open && q.auto == null && q.fromHour == null && (q.type == QuestType.TRAINING || q.type == QuestType.KNOWLEDGE)) {
                // Stopwatch, kept in the state so it survives the app being closed.
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(fmtDuration(timer?.elapsed(now) ?: 0), style = MaterialTheme.typography.displaySmall, color = if (timer?.running == true) p.accent else p.text, modifier = Modifier.weight(1f))
                    if (timer?.running == true) IconButton(onClick = { act { pauseTimer(q.id) } }) { Icon(Icons.Rounded.Pause, stringResource(R.string.a11y_pause)) }
                    else IconButton(onClick = { act { startTimer(q.id) } }) { Icon(Icons.Rounded.PlayArrow, stringResource(R.string.a11y_start), tint = p.accent) }
                    IconButton(onClick = { act { resetTimer(q.id) } }, enabled = timer != null) { Icon(Icons.Rounded.RestartAlt, stringResource(R.string.a11y_reset)) }
                }
                if (q.target > 1 && q.unit.isNotEmpty() && q.unit != "s" && q.unit != "min") {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("${fmtNum(q.progress)} / ${fmtNum(q.target)} $unit", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        GhostButton("+1", onClick = { act { setProgress(q.id, q.progress + 1) } })
                        GhostButton("+5", onClick = { act { setProgress(q.id, q.progress + 5) } })
                    }
                }
            }

            if (open && q.type == QuestType.FOCUS) {
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

            if (open && q.type == QuestType.GPS) RunPanel(s, q, tracking = q.auto == null || q.autoOff)

            if (open && q.type != QuestType.FORBIDDEN && q.type != QuestType.LIMIT) {
                // Tracked missions normally fill themselves, so marking them by hand is the secondary action.
                val tracked = q.type == QuestType.FOCUS || q.type == QuestType.GPS || q.auto != null
                val complete = { act { completeQuest(q.id) }; onDismiss() }
                val available = q.availableAt(java.time.LocalTime.now().hour)
                if (!available) Text(stringResource(R.string.available_from, q.fromHour ?: 0), style = MaterialTheme.typography.bodySmall, color = p.gold)
                if (tracked) GhostButton(stringResource(R.string.mark_done_manual), onClick = complete, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Check)
                else PrimaryButton(stringResource(R.string.complete), onClick = complete, modifier = Modifier.fillMaxWidth(), enabled = available, icon = Icons.Rounded.Check)
            }

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
            if (q.status == QuestStatus.DONE && q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA)) {
                GhostButton(stringResource(R.string.undo), onClick = { act { undoQuest(q.id) }; onDismiss() }, modifier = Modifier.fillMaxWidth(), icon = Icons.AutoMirrored.Rounded.Undo, color = p.muted)
            }
            OutlinedTextField(
                value = note, onValueChange = { note = it.take(500) },
                label = { Text(stringResource(R.string.note)) }, modifier = Modifier.fillMaxWidth(), minLines = 2,
            )
            Spacer(Modifier.height(4.dp))
        }
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
