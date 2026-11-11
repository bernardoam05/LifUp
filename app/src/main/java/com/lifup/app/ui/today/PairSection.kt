package com.lifup.app.ui.today

import android.content.Context
import android.content.Intent
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
import com.lifup.app.ui.local
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.unitLabel
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/** Today's pair quests (docs/PAIRS.md): one card per pair, and the way to start or join one. */
@Composable
fun PairSection(s: GameState, now: Long) {
    val p = Lif.colors
    var adding by rememberSaveable { mutableStateOf(false) }
    val pairs = s.activePairs()
    SectionTitle(stringResource(R.string.pair_section)) {
        if (pairs.isNotEmpty()) Text("${pairs.size}/${PairRules.MAX_ACTIVE}", color = p.dim, style = MaterialTheme.typography.labelMedium)
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (s.pairQuotaBlocked(now)) Text(stringResource(R.string.pair_quota), style = MaterialTheme.typography.bodySmall, color = p.gold)
        pairs.forEach { PairCard(s, it, now) }
        if (pairs.isEmpty()) Text(stringResource(R.string.pair_empty_hint), style = MaterialTheme.typography.bodySmall, color = p.muted)
        if (s.canAddPair()) GhostButton(stringResource(R.string.pair_new), onClick = { adding = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Groups, color = p.accent)
    }
    if (adding) NewPairSheet(s) { adding = false }
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

@Composable
private fun PairCard(s: GameState, pair: PairQuest, now: Long) {
    val p = Lif.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val title = defTitle(s, pair.defId)
    val partner = pair.partnerName.ifBlank { stringResource(R.string.pair_partner_unknown) }
    var leaving by remember { mutableStateOf(false) }
    var confirming by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<PairService.Failure?>(null) }
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Groups, null, tint = p.accent, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(
                    if (pair.joined) stringResource(R.string.pair_with, partner) + " · " + recurrenceLabel(pair.recurrence) else recurrenceLabel(pair.recurrence),
                    style = MaterialTheme.typography.labelMedium, color = p.muted,
                )
            }
            if (pair.streak > 0) {
                Icon(Icons.Rounded.LocalFireDepartment, null, tint = p.orange, modifier = Modifier.size(16.dp))
                Text("${pair.streak}", style = MaterialTheme.typography.labelLarge)
            }
        }
        Spacer(Modifier.size(10.dp))
        if (!pair.joined) {
            Text(stringResource(R.string.pair_waiting_join), style = MaterialTheme.typography.bodyMedium, color = p.muted)
            val code = pair.invite
            if (code != null && pair.inviteExpires > now) {
                Text(code.chunked(4).joinToString(" "), style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Monospace, color = p.accent, modifier = Modifier.padding(vertical = 6.dp))
                val message = stringResource(R.string.pair_invite_share, title, code)
                PrimaryButton(stringResource(R.string.pair_share_invite), onClick = { share(context, message) }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Share)
            } else if (pair.creator) {
                Text(stringResource(R.string.pair_code_expired), style = MaterialTheme.typography.bodySmall, color = p.dim)
                GhostButton(stringResource(R.string.pair_new_code), onClick = {
                    scope.launch { PairService.renewInvite(context, pair.id).onFailure { error = PairService.failure(it) } }
                }, modifier = Modifier.fillMaxWidth(), color = p.accent)
            }
        } else {
            val part = pair.currentPart(now)
            if (part == null) {
                pair.nextCycle(now)?.let { next ->
                    Text(stringResource(R.string.pair_next, next.format(DateTimeFormatter.ofPattern("EEE, d MMM"))), style = MaterialTheme.typography.bodyMedium, color = p.muted)
                }
            } else {
                val unit = s.defOf(pair.defId, content)?.unit.orEmpty()
                Text(stringResource(R.string.pair_your_part, "${fmtNum(part.target)} ${unitLabel(unit)}".trim()), style = MaterialTheme.typography.bodyLarge)
                val theirs = pair.partnerDone(part.cycle)
                Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (theirs) Icons.Rounded.CheckCircle else Icons.Rounded.HourglassTop, null, tint = if (theirs) p.green else p.dim, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(if (theirs) R.string.pair_partner_done else R.string.pair_partner_pending, partner), style = MaterialTheme.typography.bodySmall, color = if (theirs) p.green else p.muted)
                }
                Spacer(Modifier.size(10.dp))
                if (part.doneAt == null) {
                    PrimaryButton(stringResource(R.string.pair_complete), onClick = { confirming = true }, modifier = Modifier.fillMaxWidth())
                    Text(stringResource(R.string.pair_bonus_note), style = MaterialTheme.typography.labelSmall, color = p.dim, modifier = Modifier.padding(top = 6.dp))
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Pill(stringResource(R.string.pair_done), p.green)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.pair_done_waiting), style = MaterialTheme.typography.bodySmall, color = p.muted, modifier = Modifier.weight(1f))
                    }
                    if (!theirs) PairService.shareLink(pair, part.cycle)?.let { link ->
                        val message = stringResource(R.string.pair_link_share, title, link)
                        GhostButton(stringResource(R.string.pair_tell, partner), onClick = { share(context, message) }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp), icon = Icons.Rounded.Share, color = p.accent)
                    }
                }
            }
        }
        error?.let { Text(stringResource(failureText(it)), style = MaterialTheme.typography.bodySmall, color = p.red, modifier = Modifier.padding(top = 6.dp)) }
        TextButton(onClick = { leaving = true }, modifier = Modifier.align(Alignment.End)) {
            Text(stringResource(if (pair.joined) R.string.pair_leave else R.string.pair_cancel), color = p.dim, style = MaterialTheme.typography.labelMedium)
        }
    }
    if (confirming) ConfirmDialog(
        stringResource(R.string.pair_complete_confirm_title), stringResource(R.string.pair_complete_confirm), stringResource(R.string.pair_complete),
        onConfirm = { confirming = false; PairService.complete(context, pair.id) }, onDismiss = { confirming = false },
    )
    if (leaving) ConfirmDialog(
        stringResource(R.string.pair_leave), stringResource(if (pair.joined) R.string.pair_leave_confirm else R.string.pair_cancel_confirm), stringResource(if (pair.joined) R.string.pair_leave else R.string.pair_cancel),
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun NewPairSheet(s: GameState, onDismiss: () -> Unit) {
    val p = Lif.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var joining by rememberSaveable { mutableStateOf(false) }
    var defId by rememberSaveable { mutableStateOf<String?>(null) }
    var kind by rememberSaveable { mutableStateOf(PairRepeat.DAILY) }
    var days by rememberSaveable { mutableStateOf(listOf(1, 3, 5)) }
    var every by rememberSaveable { mutableStateOf(2) }
    var code by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<PairService.Failure?>(null) }
    val defs = remember(s.enabledDefIds, s.disabledDefIds, s.customDefs) { s.pairDefs(content).sortedBy { it.title.local() } }

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
                    value = code, onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(8) }, singleLine = true,
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
                Text(stringResource(R.string.pair_pick_mission), style = MaterialTheme.typography.labelLarge, color = p.muted)
                LazyColumn(Modifier.fillMaxWidth().heightIn(max = 240.dp)) {
                    items(defs, key = { it.id }) { def ->
                        val selected = def.id == defId
                        Row(
                            Modifier.fillMaxWidth().clickable { defId = def.id }.padding(vertical = 10.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(def.title.local(), style = MaterialTheme.typography.bodyLarge, color = if (selected) p.accent else p.text, modifier = Modifier.weight(1f))
                            if (selected) Icon(Icons.Rounded.CheckCircle, null, tint = p.accent, modifier = Modifier.size(18.dp))
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
                PrimaryButton(stringResource(R.string.pair_create), enabled = defId != null && !busy, onClick = {
                    val id = defId ?: return@PrimaryButton
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
