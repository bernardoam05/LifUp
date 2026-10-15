package com.lifup.app.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Build
import androidx.compose.material.icons.rounded.CheckBox
import androidx.compose.material.icons.rounded.CheckBoxOutlineBlank
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.Rules
import com.lifup.app.domain.addExtraQuest
import com.lifup.app.domain.addSideQuest
import com.lifup.app.domain.canAddExtra
import com.lifup.app.domain.completeSideQuest
import com.lifup.app.domain.isSuccessful
import com.lifup.app.domain.removeSideQuest
import com.lifup.app.domain.undoSideQuest
import com.lifup.app.domain.text
import com.lifup.app.domain.toggleRestDay
import com.lifup.app.ui.act
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.EmptyNote
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.components.rememberNow
import com.lifup.app.ui.content
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.fmtShort
import com.lifup.app.ui.lang
import com.lifup.app.ui.local
import com.lifup.app.ui.questDetail
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.unitLabel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@Composable
fun TodayScreen(s: GameState, openForge: () -> Unit, openQuest: String? = null, onQuestOpened: () -> Unit = {}) {
    val p = Lif.colors
    val now = rememberNow(1_000)
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(openQuest) {
        if (openQuest != null) { selected = openQuest; onQuestOpened() }
    }
    val daily = s.dailyQuests
    val done = daily.count { it.status == QuestStatus.DONE }

    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        LocalDate.parse(s.day.ifEmpty { LocalDate.now().toString() }).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.FULL)).replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelMedium, color = p.muted,
                    )
                    Text(stringResource(R.string.today_progress, done, daily.size), style = MaterialTheme.typography.headlineSmall)
                }
                FilterChip(
                    selected = s.daily.rest,
                    onClick = { act { toggleRestDay() } },
                    label = { Text(stringResource(R.string.rest_day)) },
                    leadingIcon = { Icon(Icons.Rounded.Bedtime, null, Modifier.size(16.dp)) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = p.purple.copy(alpha = 0.2f), selectedLabelColor = p.purple, selectedLeadingIconColor = p.purple),
                )
                IconButton(onClick = openForge) { Icon(Icons.Rounded.Build, stringResource(R.string.forge), tint = p.muted) }
            }
            Spacer(Modifier.height(6.dp))
            Bar(if (daily.isEmpty()) 0f else done / daily.size.toFloat(), if (s.daily.rest) p.purple else p.accent)
            if (s.daily.rest) Text(stringResource(R.string.rest_day_info), style = MaterialTheme.typography.bodySmall, color = p.purple, modifier = Modifier.padding(top = 6.dp))
        }

        if (s.penalty.active) {
            item { SectionTitle(stringResource(R.string.penalty_section)) }
            item { Text(stringResource(R.string.penalty_info), style = MaterialTheme.typography.bodySmall, color = p.red) }
            items(s.penalty.quests, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now) { selected = q.id } }
        }

        s.portal?.let { portal ->
            item { SectionTitle(stringResource(R.string.portal_section)) { Text(fmtShort(portal.expiresAt - now), color = p.purple, style = MaterialTheme.typography.labelLarge) } }
            item {
                Panel(border = p.purple.copy(alpha = 0.6f), background = p.purple.copy(alpha = 0.06f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.AutoAwesome, null, tint = p.purple)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.portal_info), style = MaterialTheme.typography.bodySmall, color = p.muted)
                    }
                }
            }
            item(key = portal.quest.id) { QuestCard(portal.quest, s.timers[portal.quest.id], now) { selected = portal.quest.id } }
        }

        item { BossCard(s, now) { selected = it } }

        item { SectionTitle(stringResource(R.string.daily_section)) }
        items(daily, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now) { selected = q.id } }

        if (s.extraQuests.isNotEmpty() || s.canAddExtra()) {
            item { SectionTitle(stringResource(R.string.extra_section)) { Text("${s.daily.extrasAdded}/${Rules.MAX_EXTRAS_PER_DAY}", color = p.dim, style = MaterialTheme.typography.labelMedium) } }
            items(s.extraQuests, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now) { selected = q.id } }
            if (s.canAddExtra()) item {
                GhostButton(stringResource(R.string.add_extra), onClick = { act { addExtraQuest() } }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Add, color = p.accent)
            }
        }

        item { SideQuestHeader() }
        items(s.sideQuests, key = { it.id }) { sq ->
            Panel(padding = PaddingValues(start = 4.dp, end = 4.dp, top = 2.dp, bottom = 2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { act { if (sq.done) undoSideQuest(sq.id) else completeSideQuest(sq.id) } }) {
                        Icon(if (sq.done) Icons.Rounded.CheckBox else Icons.Rounded.CheckBoxOutlineBlank, null, tint = if (sq.done) p.green else p.muted)
                    }
                    Text(sq.title, style = MaterialTheme.typography.bodyLarge, color = if (sq.done) p.dim else p.text, modifier = Modifier.weight(1f))
                    Pill("${sq.rank.name} · +${sq.xp} XP", p.accent)
                    IconButton(onClick = { act { removeSideQuest(sq.id) } }) { Icon(Icons.Rounded.DeleteOutline, null, tint = p.dim) }
                }
            }
        }
        if (s.sideQuests.isEmpty()) item { EmptyNote(stringResource(R.string.side_empty)) }
    }

    selected?.let { id ->
        if (s.allQuests.any { it.id == id }) MissionSheet(s, id) { selected = null }
        else androidx.compose.runtime.LaunchedEffect(id) { selected = null }
    }
}

@Composable
private fun SideQuestHeader() {
    var text by remember { mutableStateOf("") }
    val add = { if (text.isNotBlank()) { val t = text; act { addSideQuest(t) }; text = "" } }
    SectionTitle(stringResource(R.string.side_section))
    Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
            value = text, onValueChange = { text = it.take(80) }, singleLine = true,
            placeholder = { Text(stringResource(R.string.side_hint)) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { add() }),
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = add) { Icon(Icons.Rounded.Add, stringResource(R.string.add), tint = Lif.colors.accent) }
    }
}

@Composable
private fun BossCard(s: GameState, now: Long, onChallenge: (String) -> Unit) {
    val b = s.boss ?: return
    val def = content.bossById[b.bossId] ?: return
    val p = Lif.colors
    val shadow = content.shadowById[def.shadowId]
    SectionTitle(stringResource(if (def.season != null) R.string.boss_section_season else R.string.boss_section)) {
        Text(stringResource(R.string.boss_ends_in, fmtShort(b.endsAt - now)), color = p.dim, style = MaterialTheme.typography.labelMedium)
    }
    Panel(border = (if (b.defeated) p.green else p.red).copy(alpha = 0.5f), onClick = { onChallenge(b.challenge.id) }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Whatshot, null, tint = if (b.defeated) p.green else p.red)
            Spacer(Modifier.width(8.dp))
            Text(def.title.local(), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            Pill(def.rank, if (def.rank == "S") p.red else p.gold)
        }
        Spacer(Modifier.height(10.dp))
        if (b.defeated) {
            Text(stringResource(R.string.boss_defeated, shadow?.name?.local().orEmpty()), style = MaterialTheme.typography.bodyMedium, color = p.green)
        } else {
            Bar(b.hp / b.maxHp.toFloat(), p.red, height = 10.dp)
            Row(Modifier.padding(top = 4.dp)) {
                Text("${b.hp} / ${b.maxHp} HP", style = MaterialTheme.typography.labelMedium, color = p.muted, modifier = Modifier.weight(1f))
                Text(stringResource(R.string.boss_hint), style = MaterialTheme.typography.labelSmall, color = p.dim)
            }
            val c = b.challenge
            Spacer(Modifier.height(10.dp))
            Panel(background = p.panelHigh, onClick = { onChallenge(c.id) }, padding = PaddingValues(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.boss_challenge).uppercase(), style = MaterialTheme.typography.labelMedium, color = p.gold, modifier = Modifier.weight(1f))
                    Text(
                        if (c.isSuccessful()) stringResource(R.string.boss_challenge_done) else "−${(Rules.BOSS_CHALLENGE_DAMAGE * 100).toInt()}% HP",
                        style = MaterialTheme.typography.labelMedium, color = if (c.isSuccessful()) p.green else p.red,
                    )
                }
                Text(questDetail(c, lang(), unitLabel(c.unit)), style = MaterialTheme.typography.bodySmall, color = p.muted)
                if (c.status == QuestStatus.OPEN && c.progress > 0) {
                    Spacer(Modifier.height(6.dp))
                    Bar((c.progress / c.target).toFloat(), p.gold)
                    Text("${fmtNum(c.progress)} / ${fmtNum(c.target)}", style = MaterialTheme.typography.labelSmall, color = p.dim)
                }
            }
        }
        if (shadow != null && !b.defeated) {
            Text(stringResource(R.string.boss_drop, shadow.name.text(lang())), style = MaterialTheme.typography.labelSmall, color = p.dim, modifier = Modifier.padding(top = 8.dp))
        }
    }
}
