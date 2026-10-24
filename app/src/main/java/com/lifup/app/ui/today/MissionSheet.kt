package com.lifup.app.ui.today

import com.lifup.app.ui.difficultyLabel
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalView
import com.lifup.app.ui.components.Bar
import com.lifup.app.domain.tipFor
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.rounded.MonetizationOn
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.automirrored.rounded.Notes
import androidx.compose.material.icons.rounded.Lightbulb
import androidx.compose.foundation.clickable
import androidx.compose.animation.AnimatedVisibility
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
import com.lifup.app.domain.QuestDef
import com.lifup.app.domain.isWeekly
import com.lifup.app.domain.keepsToNextStep
import com.lifup.app.domain.canEaseTarget
import com.lifup.app.ui.components.ConfirmDialog
import com.lifup.app.domain.canTuneTarget
import com.lifup.app.domain.easeTarget
import com.lifup.app.domain.holdTarget
import com.lifup.app.domain.roundTarget
import com.lifup.app.domain.stepOf
import com.lifup.app.domain.freeSwaps
import com.lifup.app.domain.targetAt
import com.lifup.app.domain.progresses
import androidx.compose.ui.res.pluralStringResource
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
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material3.HorizontalDivider
import androidx.compose.foundation.layout.PaddingValues
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
import com.lifup.app.domain.goldPreview
import com.lifup.app.domain.xpPreview
import com.lifup.app.ui.focus.usesPomodoro
import com.lifup.app.ui.fmtDuration
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.lang
import com.lifup.app.ui.color
import com.lifup.app.ui.familyName
import com.lifup.app.domain.family
import com.lifup.app.ui.questDetail
import com.lifup.app.ui.icon
import com.lifup.app.ui.questTitle
import com.lifup.app.ui.questTypeName
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.unitLabel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionSheet(s: GameState, questId: String, onEdit: ((String) -> Unit)? = null, onDismiss: () -> Unit) {
    val q = s.allQuests.firstOrNull { it.id == questId } ?: return
    val p = Lif.colors
    // Counting reps or timing a plank: the screen stays on while the mission is open.
    val view = LocalView.current
    DisposableEffect(view) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }
    val now = rememberNow(1_000)
    val unit = unitLabel(q.unit)
    val open = q.status == QuestStatus.OPEN
    val record = s.records[q.defId]
    val timer = s.timers[q.id]
    var note by remember(q.defId) { mutableStateOf(record?.note.orEmpty()) }

    ModalBottomSheet(onDismissRequest = { if (note != record?.note.orEmpty()) act { saveNote(q.defId, note) }; onDismiss() }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = p.panel) {
        // Three zones: what it is (and pays), doing it (tools, then the button), and knowing about it (folded rows).
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SheetHeader(s, q)
            Text(questDetail(q, lang(), unit), style = MaterialTheme.typography.bodyLarge, color = p.text)
            q.prompt?.let { Text(it.text(lang()), style = MaterialTheme.typography.bodyMedium, color = p.accent) }
            // Avoid missions pass by themselves: say so, and what to do on a slip.
            if (q.type == QuestType.FORBIDDEN && open) Text(stringResource(R.string.avoid_info), style = MaterialTheme.typography.bodySmall, color = p.muted)
            if (q.auto != null && q.autoOff) Text(stringResource(R.string.auto_off), style = MaterialTheme.typography.bodySmall, color = p.gold)
            else if (q.auto != null) AutoInfo(q.auto, s)
            if (s.doubleXpNext && open && q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA)) {
                Text(stringResource(R.string.double_xp_active), style = MaterialTheme.typography.labelMedium, color = p.gold)
            }

            if (open && q.countable()) Counter(q, unit)
            if (open && q.timed()) Stopwatch(q, timer, now)
            if (open && q.type == QuestType.FOCUS) FocusAction(s, q, onDismiss)
            if (open && q.type == QuestType.GPS) RunPanel(s, q, tracking = q.auto == null || q.autoOff)
            if (open && q.type != QuestType.FORBIDDEN && q.type != QuestType.LIMIT) CompleteAction(q, onDismiss)

            val def = s.defOf(q.defId, content)
            SideActions(s, q, def, onEdit, onDismiss)

            HorizontalDivider(color = p.border)
            Column {
                def?.let { ProgressRow(s, q, it) }
                s.tipFor(q, content)?.let { TipRow(it.text(lang())) }
                NoteRow(note) { note = it }
            }
        }
    }
}

/** Hand-counted missions (reps, pages, glasses…): timed and automatic ones fill differently. */
private fun Quest.countable() = auto == null && fromHour == null && target > 1 && unit != "s" && unit != "min" &&
    (type == QuestType.TRAINING || type == QuestType.KNOWLEDGE)

/** Missions measured in time ("60 s", "15 min"), where the stopwatch is the tool itself. */
private fun Quest.timed() = auto == null && fromHour == null && (type == QuestType.TRAINING || type == QuestType.KNOWLEDGE) && (unit == "s" || unit == "min")

/** Icon, title, family and what it pays: everything about the mission at a glance. */
@Composable
private fun SheetHeader(s: GameState, q: Quest) {
    val color = q.color(Lif.colors)
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconBadge(q.icon(), color, 46.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            // The reward sits by the title: next to three pills it was squeezed until the gold broke into a column.
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(questTitle(q, lang()), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                Reward(s, q)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Pill(stringResource(familyName(q.family())), color)
                s.defOf(q.defId, content)?.takeIf { it.baseXp > 0 }?.let { def ->
                    Pill(difficultyLabel(Rules.difficulty(def.baseXp)), Lif.colors.muted)
                }
                if (q.type == QuestType.FOCUS || q.type == QuestType.FORBIDDEN || q.type == QuestType.LIMIT) Pill(stringResource(questTypeName(q.type)), Lif.colors.muted)
            }
        }
    }
}

/** XP follows the theme; gold is always gold, like the coin at the top. Done missions show what they paid. */
@Composable
private fun Reward(s: GameState, q: Quest) {
    val p = Lif.colors
    val done = q.status == QuestStatus.DONE
    val now = System.currentTimeMillis()
    val xp = if (done) q.xpGained else s.xpPreview(q, content, now)
    val gold = if (done) q.goldGained else s.goldPreview(q, content, now)
    if (xp > 0) Text("+$xp XP", style = MaterialTheme.typography.labelLarge, color = p.accent)
    if (gold > 0) {
        Icon(Icons.Rounded.MonetizationOn, null, tint = p.gold, modifier = Modifier.padding(start = if (xp > 0) 8.dp else 0.dp).size(15.dp))
        Text("+$gold", style = MaterialTheme.typography.labelLarge, color = p.gold, modifier = Modifier.padding(start = 2.dp))
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

/** Swap (open drawn missions) or undo (done ones) on the left, edit on the right: quiet links, not buttons. */
@Composable
private fun SideActions(s: GameState, q: Quest, def: QuestDef?, onEdit: ((String) -> Unit)?, onDismiss: () -> Unit) {
    val p = Lif.colors
    val own = q.origin in setOf(QuestOrigin.DAILY, QuestOrigin.EXTRA, QuestOrigin.WEEKLY)
    val swappable = q.status == QuestStatus.OPEN && q.origin == QuestOrigin.DAILY && def?.kind == DefKind.POOL
    val undoable = q.status == QuestStatus.DONE && own
    // Edits change the mission from tomorrow on, so today's target can't be lowered to finish it.
    val editable = onEdit != null && def != null && own
    if (!swappable && !undoable && !editable) return
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        if (swappable) {
            val free = s.daily.swapsUsed < s.freeSwaps(content, System.currentTimeMillis())
            val scrolls = s.items("pergaminho_troca")
            SheetLink(
                if (free) stringResource(R.string.swap_free) else stringResource(R.string.swap_scroll, scrolls), Icons.Rounded.SwapHoriz, p.text,
                enabled = free || scrolls > 0,
            ) { act { swapQuest(q.id) }; onDismiss() }
        } else if (undoable) SheetLink(stringResource(R.string.undo), Icons.AutoMirrored.Rounded.Undo, p.text) { act { undoQuest(q.id) }; onDismiss() }
        Spacer(Modifier.weight(1f))
        if (editable) SheetLink(stringResource(R.string.edit_mission), Icons.Rounded.Edit, p.muted) { onEdit!!(def!!.id) }
    }
}

@Composable
private fun SheetLink(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: androidx.compose.ui.graphics.Color, enabled: Boolean = true, onClick: () -> Unit) {
    val tint = if (enabled) color else Lif.colors.dim
    TextButton(onClick = onClick, enabled = enabled, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp)) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text(text, color = tint, style = MaterialTheme.typography.labelLarge)
    }
}

/** Where the target stands, in one line; once it has grown, unfolding shows the controls to keep or ease it, out of the way so nobody gives up on a whim. */
@Composable
private fun ProgressRow(s: GameState, q: Quest, def: QuestDef) {
    if (!def.progresses() || q.origin == QuestOrigin.PENALTY || q.origin == QuestOrigin.PORTAL) return
    val tunable = s.canTuneTarget(def)
    var open by remember { mutableStateOf(false) }
    FoldRow(Icons.AutoMirrored.Rounded.TrendingUp, progressSummary(s, q, def), open, onClick = if (tunable) { { open = !open } } else null, maxLines = 2)
    AnimatedVisibility(open) { Column(Modifier.padding(start = 26.dp, bottom = 4.dp)) { TargetControls(s, def) } }
}

@Composable
private fun progressSummary(s: GameState, q: Quest, def: QuestDef): String {
    val step = s.stepOf(def.id)
    val next = s.keepsToNextStep(def)
    val unit = unitLabel(def.unit)
    fun amount(step: Int) = "${fmtNum(roundTarget(def.targetAt(step), def.unit))} $unit".trim()
    return listOfNotNull(
        if (q.adapt != 0) stringResource(R.string.prog_from, amount(0)) else null,
        if (step != q.adapt) stringResource(R.string.prog_next_time, amount(step)) else null,
        when {
            s.adapt[def.id]?.held == true -> stringResource(R.string.prog_held)
            next == null -> stringResource(R.string.prog_max)
            else -> pluralStringResource(if (def.isWeekly()) R.plurals.prog_next_weeks else R.plurals.prog_next, next, next)
        },
    ).joinToString(" · ")
}

/** Keep the grown target where it is, or ease it one step from next time (confirmed, once per climb). */
@Composable
private fun TargetControls(s: GameState, def: QuestDef) {
    val p = Lif.colors
    val held = s.adapt[def.id]?.held == true
    val unit = unitLabel(def.unit)
    var confirmEase by remember { mutableStateOf(false) }
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            stringResource(if (held) R.string.prog_resume else R.string.prog_hold), style = MaterialTheme.typography.labelMedium, color = p.accent,
            modifier = Modifier.clickable { act { holdTarget(def.id, !held) } }.padding(vertical = 8.dp),
        )
        if (s.canEaseTarget(def)) Text(
            stringResource(R.string.prog_ease), style = MaterialTheme.typography.labelMedium, color = p.muted,
            modifier = Modifier.clickable { confirmEase = true }.padding(vertical = 8.dp),
        )
    }
    if (confirmEase) ConfirmDialog(
        stringResource(R.string.prog_ease_title),
        stringResource(R.string.prog_ease_text, "${fmtNum(roundTarget(def.targetAt(s.stepOf(def.id) - 1), def.unit))} $unit".trim()),
        stringResource(R.string.prog_ease_ok),
        onConfirm = { act { easeTarget(def.id) }; confirmEase = false }, onDismiss = { confirmEase = false },
    )
}

/** A folded "How to?" line: one tap shows the tip, so the sheet stays short. */
@Composable
private fun TipRow(tip: String) {
    val p = Lif.colors
    var open by remember { mutableStateOf(false) }
    FoldRow(Icons.Rounded.Lightbulb, stringResource(R.string.how_to), open) { open = !open }
    AnimatedVisibility(open) { Text(tip, style = MaterialTheme.typography.bodyMedium, color = p.text, modifier = Modifier.padding(start = 26.dp)) }
}

/** The player's own note for this mission, kept for next time; folded to one line until tapped. */
@Composable
private fun NoteRow(note: String, onChange: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    FoldRow(Icons.AutoMirrored.Rounded.Notes, note.takeIf { it.isNotBlank() && !open } ?: stringResource(R.string.note_add), open) { open = !open }
    AnimatedVisibility(open) {
        OutlinedTextField(
            value = note, onValueChange = { onChange(it.take(500)) },
            placeholder = { Text(stringResource(R.string.note_hint)) }, modifier = Modifier.fillMaxWidth(), minLines = 2,
        )
    }
}

/** A one-line row with an icon; with [onClick] it folds open (chevron), without it it's just information. */
@Composable
private fun FoldRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, open: Boolean, maxLines: Int = 1, onClick: (() -> Unit)?) {
    val p = Lif.colors
    Row(Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = p.muted, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = p.muted, maxLines = maxLines, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        if (onClick != null) Icon(if (open) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = p.muted)
    }
}

/** Stopwatch, kept in the state so it survives the app being closed. */
@Composable
private fun Stopwatch(q: Quest, timer: com.lifup.app.domain.MissionTimer?, now: Long) {
    val p = Lif.colors
    val elapsed = timer?.elapsed(now) ?: 0
    // Timed missions ("20 min", "90 s") measure against their target and turn green once it's reached.
    val goalMs = when (q.unit) { "min" -> q.target * 60_000; "s" -> q.target * 1_000; else -> null }?.toLong()
    val reached = goalMs != null && elapsed >= goalMs
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(fmtDuration(elapsed), style = MaterialTheme.typography.headlineMedium, color = if (reached) p.green else if (timer?.running == true) p.accent else p.text, modifier = Modifier.weight(1f))
        if (timer?.running == true) IconButton(onClick = { act { pauseTimer(q.id) } }) { Icon(Icons.Rounded.Pause, stringResource(R.string.a11y_pause)) }
        else IconButton(onClick = { act { startTimer(q.id) } }) { Icon(Icons.Rounded.PlayArrow, stringResource(R.string.a11y_start), tint = p.accent) }
        IconButton(onClick = { act { resetTimer(q.id) } }, enabled = timer != null) { Icon(Icons.Rounded.RestartAlt, stringResource(R.string.a11y_reset)) }
    }
    if (goalMs != null) {
        Bar((elapsed / goalMs.toFloat()).coerceAtMost(1f), if (reached) p.green else p.accent)
        Text(
            if (reached) stringResource(R.string.timer_reached) else stringResource(R.string.timer_goal, fmtDuration(goalMs)),
            style = MaterialTheme.typography.labelMedium, color = if (reached) p.green else p.muted,
        )
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
