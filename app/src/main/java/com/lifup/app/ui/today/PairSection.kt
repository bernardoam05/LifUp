package com.lifup.app.ui.today

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import com.lifup.app.domain.QuestOrigin
import com.lifup.app.domain.buildQuest
import com.lifup.app.domain.stepOf
import com.lifup.app.domain.pairOf
import com.lifup.app.domain.isRandom
import com.lifup.app.domain.xpPreview
import com.lifup.app.ui.color
import com.lifup.app.ui.icon
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.PairLink
import com.lifup.app.domain.PairQuest
import com.lifup.app.domain.PairRecurrence
import com.lifup.app.domain.PairRepeat
import com.lifup.app.domain.PairRules
import com.lifup.app.domain.activePairs
import com.lifup.app.domain.canAddPair
import com.lifup.app.domain.currentPart
import com.lifup.app.domain.defOf
import com.lifup.app.domain.joined
import com.lifup.app.domain.nextCycle
import com.lifup.app.domain.pairDefs
import com.lifup.app.domain.pairQuotaBlocked
import com.lifup.app.domain.partnerDone
import com.lifup.app.system.PairService
import com.lifup.app.ui.components.ConfirmDialog
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.components.Stepper
import com.lifup.app.ui.content
import com.lifup.app.ui.defTitle
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.lang
import com.lifup.app.ui.local
import com.lifup.app.domain.text
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.unitLabel
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/** Today's pair missions (docs/PAIRS.md): each a normal mission card with the pair's state under it. */
@Composable
fun PairSection(s: GameState, now: Long, onOpen: (String) -> Unit) {
    val p = Lif.colors
    var adding by rememberSaveable { mutableStateOf(false) }
    val pairs = s.activePairs()
    SectionTitle(stringResource(R.string.pair_section)) {
        if (pairs.isNotEmpty()) Text("${pairs.size}/${PairRules.MAX_ACTIVE}", color = p.dim, style = MaterialTheme.typography.labelMedium)
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (s.pairQuotaBlocked(now)) Text(stringResource(R.string.pair_quota), style = MaterialTheme.typography.bodySmall, color = p.gold)
        pairs.forEach { PairCard(s, it, now, onOpen) }
        if (pairs.isEmpty()) Text(stringResource(R.string.pair_empty_hint), style = MaterialTheme.typography.bodySmall, color = p.muted)
        if (s.canAddPair()) GhostButton(stringResource(R.string.pair_new), onClick = { adding = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Groups, color = p.accent)
    }
    if (adding) NewPairSheet(s) { adding = false }
}

private fun copy(context: Context, text: String) {
    context.getSystemService(android.content.ClipboardManager::class.java)
        ?.setPrimaryClip(android.content.ClipData.newPlainText("Questborn", text))
}

private fun share(context: Context, text: String) {
    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
    context.startActivity(Intent.createChooser(send, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

@Composable
private fun recurrenceLabel(r: PairRecurrence): String = when (r.kind) {
    PairRepeat.ONCE -> stringResource(R.string.pair_once)
    PairRepeat.DAILY -> stringResource(R.string.pair_daily)
    PairRepeat.WEEKLY -> r.days.sorted().joinToString(" ") { DayOfWeek.of(it).getDisplayName(TextStyle.SHORT, Locale.getDefault()) }
    PairRepeat.EVERY -> stringResource(R.string.pair_every_n, r.every)
}

/** The mission's name: today's (a random pair draws one per cycle), else the pair's own. */
@Composable
private fun pairTitle(s: GameState, pair: PairQuest, part: com.lifup.app.domain.PairPart?): String =
    part?.quest?.title?.local() ?: if (pair.isRandom) stringResource(R.string.pair_random_title) else defTitle(s, pair.defId)

@Composable
private fun partnerName(pair: PairQuest) = pair.partnerName.ifBlank { stringResource(R.string.pair_partner_unknown) }

@Composable
private fun PairCard(s: GameState, pair: PairQuest, now: Long, onOpen: (String) -> Unit) {
    val part = pair.currentPart(now)
    val q = part?.quest
    when {
        !pair.joined -> InviteCard(s, pair, now)
        q != null -> Column {
            // The same card as every other mission: progress, timer, XP; a tap opens the mission sheet.
            QuestCard(q, s.timers[q.id], now, xp = s.xpPreview(q, content, now)) { onOpen(q.id) }
            PairStatus(s, pair, part, Modifier.padding(start = 12.dp, end = 4.dp, top = 2.dp))
        }
        else -> RestingPairCard(s, pair, now)
    }
}

/** Under the mission card: who it's with, whether they're done, and "tell them" once you are. */
@Composable
private fun PairStatus(s: GameState, pair: PairQuest, part: com.lifup.app.domain.PairPart, modifier: Modifier = Modifier) {
    val p = Lif.colors
    val context = LocalContext.current
    val partner = partnerName(pair)
    val theirs = pair.partnerDone(part.cycle)
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Icon(if (theirs) Icons.Rounded.CheckCircle else Icons.Rounded.HourglassTop, null, tint = if (theirs) p.green else p.dim, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(6.dp))
        Text(
            stringResource(if (theirs) R.string.pair_partner_done else R.string.pair_partner_pending, partner),
            style = MaterialTheme.typography.labelMedium, color = if (theirs) p.green else p.muted, modifier = Modifier.weight(1f),
        )
        if (pair.streak > 0) {
            Icon(Icons.Rounded.LocalFireDepartment, null, tint = p.orange, modifier = Modifier.size(14.dp))
            Text("${pair.streak}", style = MaterialTheme.typography.labelMedium)
        }
        if (part.doneAt != null && !theirs) PairService.shareLink(pair, part.cycle)?.let { link ->
            val message = stringResource(R.string.pair_link_share, pairTitle(s, pair, part), link)
            TextButton(onClick = { share(context, message) }) {
                Icon(Icons.Rounded.Share, null, tint = p.accent, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text(stringResource(R.string.pair_tell, partner), color = p.accent, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

/** Inside the mission sheet of a pair mission: the pair, the rules, telling the partner, leaving. */
@Composable
fun PairSheetBlock(s: GameState, questId: String) {
    val p = Lif.colors
    val context = LocalContext.current
    val pair = s.pairOf(questId) ?: return
    val part = pair.parts.firstOrNull { it.quest?.id == questId } ?: return
    var leaving by remember { mutableStateOf(false) }
    Panel(background = p.accent.copy(alpha = 0.06f), border = p.accent.copy(alpha = 0.4f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Groups, null, tint = p.accent, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(stringResource(R.string.pair_with, partnerName(pair)) + " · " + recurrenceLabel(pair.recurrence), style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
        }
        PairStatus(s, pair, part, Modifier.padding(top = 6.dp))
        Text(stringResource(R.string.pair_bonus_note), style = MaterialTheme.typography.labelSmall, color = p.muted, modifier = Modifier.padding(top = 6.dp))
        if (part.doneAt == null) Text(stringResource(R.string.pair_complete_confirm), style = MaterialTheme.typography.labelSmall, color = p.dim)
        else Text(stringResource(R.string.pair_done_waiting), style = MaterialTheme.typography.labelSmall, color = p.dim)
        TextButton(onClick = { leaving = true }, modifier = Modifier.align(Alignment.End)) {
            Text(stringResource(R.string.pair_leave), color = p.dim, style = MaterialTheme.typography.labelMedium)
        }
    }
    if (leaving) ConfirmDialog(
        stringResource(R.string.pair_leave), stringResource(R.string.pair_leave_confirm), stringResource(R.string.pair_leave),
        onConfirm = { leaving = false; PairService.leave(context, pair.id) }, onDismiss = { leaving = false }, danger = true,
    )
}

/** A pair with no cycle today (weekly, every few days): when the next one is. */
@Composable
private fun RestingPairCard(s: GameState, pair: PairQuest, now: Long) {
    val p = Lif.colors
    val context = LocalContext.current
    var leaving by remember { mutableStateOf(false) }
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Groups, null, tint = p.dim, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(pairTitle(s, pair, null), style = MaterialTheme.typography.titleSmall)
                val next = pair.nextCycle(now)?.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
                Text(
                    stringResource(R.string.pair_with, partnerName(pair)) + (next?.let { " · " + stringResource(R.string.pair_next, it) } ?: ""),
                    style = MaterialTheme.typography.labelMedium, color = p.muted,
                )
            }
            TextButton(onClick = { leaving = true }) { Text(stringResource(R.string.pair_leave), color = p.dim, style = MaterialTheme.typography.labelSmall) }
        }
    }
    if (leaving) ConfirmDialog(
        stringResource(R.string.pair_leave), stringResource(R.string.pair_leave_confirm), stringResource(R.string.pair_leave),
        onConfirm = { leaving = false; PairService.leave(context, pair.id) }, onDismiss = { leaving = false }, danger = true,
    )
}

/** Waiting for the partner to join: the code, big and copyable, and the invite to share. */
@Composable
private fun InviteCard(s: GameState, pair: PairQuest, now: Long) {
    val p = Lif.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val title = pairTitle(s, pair, null)
    var leaving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<PairService.Failure?>(null) }
    Panel(border = p.accent.copy(alpha = 0.5f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Groups, null, tint = p.accent, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(recurrenceLabel(pair.recurrence), style = MaterialTheme.typography.labelMedium, color = p.muted)
            }
        }
        Spacer(Modifier.size(10.dp))
        Text(stringResource(R.string.pair_waiting_join), style = MaterialTheme.typography.bodyMedium, color = p.muted)
        val code = pair.invite
        if (code != null && pair.inviteExpires > now) {
            var copied by remember(code) { mutableStateOf(false) }
            // Tapping the code copies it too.
            Text(
                code.chunked(4).joinToString(" "), style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Monospace, color = p.accent,
                modifier = Modifier.clickable { copy(context, code); copied = true }.padding(vertical = 6.dp),
            )
            val message = stringResource(R.string.pair_invite_share, title, code, PairLink.joinLink(code))
            PrimaryButton(stringResource(R.string.pair_share_invite), onClick = { share(context, message) }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Share)
            GhostButton(
                stringResource(if (copied) R.string.pair_code_copied else R.string.pair_copy_code),
                onClick = { copy(context, code); copied = true },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp), icon = Icons.Rounded.ContentCopy, color = p.accent,
            )
        } else {
            Text(stringResource(R.string.pair_code_expired), style = MaterialTheme.typography.bodySmall, color = p.dim)
            GhostButton(stringResource(R.string.pair_new_code), onClick = {
                scope.launch { PairService.renewInvite(context, pair.id).onFailure { error = PairService.failure(it) } }
            }, modifier = Modifier.fillMaxWidth(), color = p.accent)
        }
        error?.let { Text(stringResource(failureText(it)), style = MaterialTheme.typography.bodySmall, color = p.red, modifier = Modifier.padding(top = 6.dp)) }
        TextButton(onClick = { leaving = true }, modifier = Modifier.align(Alignment.End)) {
            Text(stringResource(R.string.pair_cancel), color = p.dim, style = MaterialTheme.typography.labelMedium)
        }
    }
    if (leaving) ConfirmDialog(
        stringResource(R.string.pair_cancel), stringResource(R.string.pair_cancel_confirm), stringResource(R.string.pair_cancel),
        onConfirm = { leaving = false; PairService.leave(context, pair.id) }, onDismiss = { leaving = false }, danger = true,
    )
}

private fun failureText(f: PairService.Failure) = when (f) {
    PairService.Failure.NETWORK -> R.string.pair_err_network
    PairService.Failure.QUOTA -> R.string.pair_err_quota
    PairService.Failure.NOT_FOUND -> R.string.pair_err_not_found
    PairService.Failure.FULL -> R.string.pair_err_full
    PairService.Failure.LIMIT -> R.string.pair_err_limit
}

/** Create a pair, or join one; [initialCode] (from a join link) opens straight on joining, the code filled in. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun NewPairSheet(s: GameState, initialCode: String? = null, onDismiss: () -> Unit) {
    val p = Lif.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var joining by rememberSaveable { mutableStateOf(initialCode != null) }
    var defId by rememberSaveable { mutableStateOf<String?>(null) }
    var random by rememberSaveable { mutableStateOf(false) }
    var kind by rememberSaveable { mutableStateOf(PairRepeat.DAILY) }
    var days by rememberSaveable { mutableStateOf(listOf(1, 3, 5)) }
    var every by rememberSaveable { mutableStateOf(2) }
    var code by rememberSaveable { mutableStateOf(initialCode.orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<PairService.Failure?>(null) }
    val language = lang()
    val defs = remember(s.enabledDefIds, s.disabledDefIds, s.customDefs, language) { s.pairDefs(content).sortedBy { it.title.text(language) } }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = p.panel) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.pair_new), style = MaterialTheme.typography.titleLarge)
            Text(stringResource(R.string.pair_empty_hint), style = MaterialTheme.typography.bodySmall, color = p.muted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = !joining, onClick = { joining = false; error = null }, label = { Text(stringResource(R.string.pair_create)) })
                FilterChip(selected = joining, onClick = { joining = true; error = null }, label = { Text(stringResource(R.string.pair_join)) })
            }
            if (joining) {
                OutlinedTextField(
                    value = code, onValueChange = { code = PairLink.extractCode(it) }, singleLine = true,
                    label = { Text(stringResource(R.string.pair_code_hint)) },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                    textStyle = MaterialTheme.typography.titleLarge.copy(fontFamily = FontFamily.Monospace),
                    modifier = Modifier.fillMaxWidth(),
                )
                PrimaryButton(stringResource(R.string.pair_join), enabled = code.length == 8 && !busy, onClick = {
                    busy = true; error = null
                    scope.launch {
                        PairService.join(context, code).onSuccess { onDismiss() }.onFailure { error = PairService.failure(it) }
                        busy = false
                    }
                }, modifier = Modifier.fillMaxWidth())
            } else {
                Text(stringResource(R.string.pair_mode), style = MaterialTheme.typography.labelLarge, color = p.muted)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !random, onClick = { random = false }, label = { Text(stringResource(R.string.pair_mode_fixed)) })
                    FilterChip(selected = random, onClick = { random = true }, label = { Text(stringResource(R.string.pair_mode_random)) })
                }
                if (random) Text(stringResource(R.string.pair_mode_random_hint), style = MaterialTheme.typography.bodySmall, color = p.muted)
                else Text(stringResource(R.string.pair_pick_mission), style = MaterialTheme.typography.labelLarge, color = p.muted)
                if (!random) LazyColumn(Modifier.fillMaxWidth().heightIn(max = 340.dp)) {
                    items(defs, key = { it.id }) { def ->
                        val selected = def.id == defId
                        val color = def.color(p)
                        // What this mission would ask of you today, at your own step of it.
                        val preview = remember(def.id, s.player.level) { buildQuest(def, s.player.level, QuestOrigin.PAIR, step = s.stepOf(def.id)) }
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 3.dp).clip(RoundedCornerShape(12.dp))
                                .background(if (selected) color.copy(alpha = 0.14f) else p.panelHigh)
                                .border(1.dp, if (selected) color else p.border, RoundedCornerShape(12.dp))
                                .clickable { defId = def.id }.padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(def.icon(), null, tint = color, modifier = Modifier.size(22.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(def.title.text(language), style = MaterialTheme.typography.bodyLarge, color = p.text)
                                Text(stringResource(R.string.pair_your_part, "${fmtNum(preview.target)} ${unitLabel(preview.unit)}".trim()), style = MaterialTheme.typography.labelMedium, color = p.muted)
                            }
                            if (selected) Icon(Icons.Rounded.CheckCircle, null, tint = color, modifier = Modifier.size(20.dp))
                        }
                    }
                }
                Text(stringResource(R.string.pair_repeat), style = MaterialTheme.typography.labelLarge, color = p.muted)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(PairRepeat.ONCE to R.string.pair_once, PairRepeat.DAILY to R.string.pair_daily, PairRepeat.WEEKLY to R.string.pair_weekly, PairRepeat.EVERY to R.string.pair_every).forEach { (k, label) ->
                        FilterChip(selected = kind == k, onClick = { kind = k }, label = { Text(stringResource(label)) })
                    }
                }
                if (kind == PairRepeat.WEEKLY) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    (1..7).forEach { d ->
                        FilterChip(
                            selected = d in days,
                            onClick = { days = if (d in days) (days - d).ifEmpty { days } else (days + d).sorted() },
                            label = { Text(DayOfWeek.of(d).getDisplayName(TextStyle.SHORT, Locale.getDefault())) },
                        )
                    }
                }
                if (kind == PairRepeat.EVERY) Stepper(every, { every = it }, 2..14, stringResource(R.string.pair_every_label), " " + stringResource(R.string.pair_days_suffix))
                PrimaryButton(stringResource(R.string.pair_create), enabled = (random || defId != null) && !busy, onClick = {
                    val id = if (random) PairRules.RANDOM else defId ?: return@PrimaryButton
                    busy = true; error = null
                    scope.launch {
                        PairService.create(context, id, PairRecurrence(kind, if (kind == PairRepeat.WEEKLY) days else emptyList(), every))
                            .onSuccess { onDismiss() }.onFailure { error = PairService.failure(it) }
                        busy = false
                    }
                }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Add)
            }
            error?.let { Text(stringResource(failureText(it)), style = MaterialTheme.typography.bodySmall, color = p.red) }
            TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) { Text(stringResource(R.string.cancel), color = p.muted) }
        }
    }
}
