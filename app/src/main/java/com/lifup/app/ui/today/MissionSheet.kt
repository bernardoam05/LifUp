package com.lifup.app.ui.today

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
import androidx.compose.material.icons.automirrored.rounded.DirectionsRun
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.RestartAlt
import androidx.compose.material.icons.rounded.Stop
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifup.app.R
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.GameState
import com.lifup.app.domain.QuestOrigin
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.Rules
import com.lifup.app.domain.completeQuest
import com.lifup.app.domain.pauseTimer
import com.lifup.app.domain.resetTimer
import com.lifup.app.domain.saveNote
import com.lifup.app.domain.setProgress
import com.lifup.app.domain.startTimer
import com.lifup.app.domain.swapQuest
import com.lifup.app.domain.undoQuest
import com.lifup.app.system.GpsService
import com.lifup.app.system.GpsTracker
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
    val gps by GpsTracker.session.collectAsStateWithLifecycle()
    var note by remember(q.defId) { mutableStateOf(record?.note.orEmpty()) }

    val gpsPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted[Manifest.permission.ACCESS_FINE_LOCATION] == true) GpsService.start(context, q.id)
    }

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

            if (q.auto != null) AutoInfo(q.auto, s)

            if (open && q.auto == null && (q.type == QuestType.TRAINING || q.type == QuestType.KNOWLEDGE)) {
                // Stopwatch, kept in the state so it survives the app being closed.
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(fmtDuration(timer?.elapsed(now) ?: 0), style = MaterialTheme.typography.displaySmall, color = if (timer?.running == true) p.accent else p.text, modifier = Modifier.weight(1f))
                    if (timer?.running == true) IconButton(onClick = { act { pauseTimer(q.id) } }) { Icon(Icons.Rounded.Pause, null) }
                    else IconButton(onClick = { act { startTimer(q.id) } }) { Icon(Icons.Rounded.PlayArrow, null, tint = p.accent) }
                    IconButton(onClick = { act { resetTimer(q.id) } }, enabled = timer != null) { Icon(Icons.Rounded.RestartAlt, null) }
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
                PrimaryButton(stringResource(R.string.start_focus), onClick = { onDismiss(); switchTab(Tab.FOCUS) }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Psychology, color = p.purple)
            }

            if (open && q.type == QuestType.GPS) {
                val tracking = gps?.questId == q.id
                if (tracking) {
                    val g = gps!!
                    Text(
                        stringResource(R.string.gps_live, g.km, g.speedKmh) + if (!g.hasFix) " · " + stringResource(R.string.gps_waiting) else "",
                        style = MaterialTheme.typography.titleMedium, color = p.green,
                    )
                    if (g.rejected > 0) Text(stringResource(R.string.gps_rejected, g.rejected), style = MaterialTheme.typography.bodySmall, color = p.gold)
                    GhostButton(stringResource(R.string.gps_stop), onClick = { GpsService.stop(context) }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Stop, color = p.red)
                } else {
                    PrimaryButton(stringResource(R.string.gps_start), onClick = {
                        if (Permissions.location(context)) GpsService.start(context, q.id)
                        else gpsPermission.launch(
                            if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.POST_NOTIFICATIONS)
                            else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
                        )
                    }, modifier = Modifier.fillMaxWidth(), icon = Icons.AutoMirrored.Rounded.DirectionsRun, color = p.green)
                }
            }

            if (open && q.type != QuestType.FORBIDDEN && q.type != QuestType.LIMIT) {
                val manualOnly = q.type == QuestType.FOCUS || q.type == QuestType.GPS || q.auto != null
                val label = if (manualOnly) R.string.mark_done_manual else R.string.complete
                PrimaryButton(stringResource(label), onClick = { act { completeQuest(q.id) }; onDismiss() }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Check,
                    color = if (manualOnly) p.border else p.accent)
            }

            val def = content.questDefById[q.defId] ?: s.customDefs.firstOrNull { it.id == q.defId }
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
            com.lifup.app.domain.AutoKind.STEPS -> com.lifup.app.system.AutoTracker.stepsAvailable(context)
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
                    com.lifup.app.domain.AutoKind.STEPS -> if (Build.VERSION.SDK_INT >= 29) activity.launch(Manifest.permission.ACTIVITY_RECOGNITION)
                    com.lifup.app.domain.AutoKind.SCREEN_TIME -> Permissions.openUsageAccess(context)
                    com.lifup.app.domain.AutoKind.DISTRACTION_TIME ->
                        if (!Permissions.usageAccess(context)) Permissions.openUsageAccess(context) else switchTab(Tab.FOCUS)
                }
            }) { Text(stringResource(R.string.auto_enable).uppercase()) }
        }
    }
}
