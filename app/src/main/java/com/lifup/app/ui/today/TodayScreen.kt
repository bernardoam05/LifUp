package com.lifup.app.ui.today

import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.Tune
import com.lifup.app.ui.defTitle
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.rounded.EventRepeat
import com.lifup.app.domain.dismissWeeklyHint
import com.lifup.app.domain.acceptWeeklyHint
import com.lifup.app.domain.WeeklyHint
import androidx.compose.foundation.background
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Box
import com.lifup.app.ui.guide.PenaltyBlockToggle
import com.lifup.app.ui.guide.InfoButton
import com.lifup.app.ui.guide.Guide
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
import com.lifup.app.domain.countedQuests
import com.lifup.app.domain.Ctx
import com.lifup.app.domain.dayGoal
import com.lifup.app.domain.GameState
import com.lifup.app.domain.canRest
import com.lifup.app.domain.restDaysLeft
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.Rules
import com.lifup.app.domain.addExtraQuest
import com.lifup.app.domain.addSideQuest
import com.lifup.app.domain.canAddExtra
import com.lifup.app.domain.extraOpen
import com.lifup.app.domain.xpPreview
import com.lifup.app.domain.completeSideQuest
import com.lifup.app.domain.isSuccessful
import com.lifup.app.domain.removeSideQuest
import com.lifup.app.domain.sideRewardsLeft
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
fun TodayScreen(s: GameState, openForge: () -> Unit, openDef: (String) -> Unit, openQuest: String? = null, onQuestOpened: () -> Unit = {}) {
    val p = Lif.colors
    val now = rememberNow(1_000)
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    var confirmDelete by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(openQuest) {
        if (openQuest != null) { selected = openQuest; onQuestOpened() }
    }
    val daily = s.dailyQuests
    val counted = s.countedQuests()
    val done = counted.count { it.status == QuestStatus.DONE }

    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            val ctx = Ctx(content, now)
            Row(verticalAlignment = Alignment.CenterVertically) {
                // One line: the count that matters, with the date as a quiet suffix.
                Text("$done / ${counted.size}", style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.width(8.dp))
                val date = LocalDate.parse(s.day.ifEmpty { LocalDate.now().toString() }).format(DateTimeFormatter.ofPattern("EEE, d MMM"))
                Text(stringResource(R.string.today_count_suffix, date), style = MaterialTheme.typography.labelMedium, color = p.muted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                FilterChip(
                    selected = s.daily.rest,
                    onClick = { act { toggleRestDay() } },
                    enabled = s.canRest(ctx),
                    label = { Text(if (s.daily.rest) stringResource(R.string.rest_day) else stringResource(R.string.rest_day_left, s.restDaysLeft(ctx.weekKey).coerceAtLeast(0))) },
                    leadingIcon = { Icon(Icons.Rounded.Bedtime, null, Modifier.size(16.dp)) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = p.purple.copy(alpha = 0.2f), selectedLabelColor = p.purple, selectedLeadingIconColor = p.purple),
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    if (s.daily.rest || counted.isEmpty()) Bar(if (counted.isEmpty()) 0f else done / counted.size.toFloat(), p.purple)
                    else GoalBar(s.dayGoal().copy(kept = done))
                }
                InfoButton(Guide.STREAK)
            }
            if (s.daily.rest) Text(stringResource(R.string.rest_day_info), style = MaterialTheme.typography.bodySmall, color = p.purple)
            s.recovery?.takeIf { it.day == s.day }?.let { r ->
                Text(stringResource(R.string.streak_recovery, r.streak), style = MaterialTheme.typography.bodySmall, color = p.gold, modifier = Modifier.padding(top = 4.dp))
            }
        }

        if (s.penalty.active) {
            item { SectionTitle(stringResource(R.string.penalty_section)) { InfoButton(Guide.PENALTY, s) } }
            item { Text(stringResource(R.string.penalty_info), style = MaterialTheme.typography.bodySmall, color = p.red) }
            if (!s.settings.blockOnPenalty) item { Panel { PenaltyBlockToggle(s) } }
            items(s.penalty.quests, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now) { selected = q.id } }
        }

        s.portal?.let { portal ->
            item { SectionTitle(stringResource(R.string.portal_section)) { Text(fmtShort(portal.expiresAt - now), color = p.purple, style = MaterialTheme.typography.labelLarge); InfoButton(Guide.PORTAL) } }
            item(key = portal.quest.id) { QuestCard(portal.quest, s.timers[portal.quest.id], now, xp = s.xpPreview(portal.quest, content, now)) { selected = portal.quest.id } }
        }

        s.weeklyHint?.let { h -> item(key = "weekly_hint") { WeeklyHintCard(s, h) } }

        item { SectionTitle(stringResource(R.string.daily_section)) { ManageAction(openForge); InfoButton(Guide.DAILY) } }
        items(daily, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now, s.weekly[q.defId], s.xpPreview(q, content, now)) { selected = q.id } }

        if (s.weeklyQuests.isNotEmpty()) {
            item { SectionTitle(stringResource(R.string.weekly_section)) { InfoButton(Guide.WEEKLY) } }
            items(s.weeklyQuests, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now, s.weekly[q.defId], s.xpPreview(q, content, now)) { selected = q.id } }
        }
        item { BossCard(s, now) { selected = it } }

        if (s.extraQuests.isNotEmpty() || s.canAddExtra()) {
            item { SectionTitle(stringResource(R.string.extra_section)) { Text("${s.daily.extrasAdded}/${Rules.MAX_EXTRAS_PER_DAY}", color = p.dim, style = MaterialTheme.typography.labelMedium) } }
            items(s.extraQuests, key = { it.id }) { q -> QuestCard(q, s.timers[q.id], now, xp = s.xpPreview(q, content, now)) { selected = q.id } }
            if (s.canAddExtra()) item {
                GhostButton(stringResource(R.string.add_extra), onClick = { act { addExtraQuest() } }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Add, color = p.accent)
            } else if (s.extraOpen() && s.daily.extrasAdded < Rules.MAX_EXTRAS_PER_DAY) item {
                Text(stringResource(R.string.extra_locked), color = p.dim, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }

        item { SideQuestHeader(s.sideRewardsLeft()) }
        items(s.sideQuests, key = { it.id }) { sq ->
            Panel(padding = PaddingValues(start = 4.dp, end = 4.dp, top = 2.dp, bottom = 2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { act { if (sq.done) undoSideQuest(sq.id) else completeSideQuest(sq.id) } }) {
                        Icon(if (sq.done) Icons.Rounded.CheckBox else Icons.Rounded.CheckBoxOutlineBlank, stringResource(if (sq.done) R.string.a11y_mark_undone else R.string.a11y_mark_done), tint = if (sq.done) p.green else p.muted)
                    }
                    Text(sq.title, style = MaterialTheme.typography.bodyLarge, color = if (sq.done) p.dim else p.text, modifier = Modifier.weight(1f))
                    val paid = sq.xpGained > 0 || sq.goldGained > 0
                    when {
                        sq.done && !paid -> Pill(stringResource(R.string.side_no_reward), p.dim)
                        !sq.done && s.sideRewardsLeft() == 0 -> Pill(stringResource(R.string.side_no_reward), p.gold)
                        else -> Pill("${sq.rank.name} · +${if (sq.done) sq.xpGained else sq.xp} XP", p.accent)
                    }
                    // Deleting a paid side quest takes its XP back, so that one asks first.
                    IconButton(onClick = { if (paid) confirmDelete = sq.id else act { removeSideQuest(sq.id) } }) { Icon(Icons.Rounded.DeleteOutline, stringResource(R.string.delete), tint = p.dim) }
                }
            }
        }
        if (s.sideQuests.isEmpty()) item { EmptyNote(stringResource(R.string.side_empty)) }
    }

    confirmDelete?.let { id ->
        com.lifup.app.ui.components.ConfirmDialog(
            stringResource(R.string.delete), stringResource(R.string.side_delete_paid), stringResource(R.string.delete),
            onConfirm = { act { removeSideQuest(id) }; confirmDelete = null }, onDismiss = { confirmDelete = null }, danger = true,
        )
    }
    selected?.let { id ->
        if (s.allQuests.any { it.id == id }) MissionSheet(s, id, onEdit = { defId -> selected = null; openDef(defId) }) { selected = null }
        else androidx.compose.runtime.LaunchedEffect(id) { selected = null }
    }
}

@Composable
private fun SideQuestHeader(rewardsLeft: Int) {
    var text by remember { mutableStateOf("") }
    val add = { if (text.isNotBlank()) { val t = text; act { addSideQuest(t) }; text = "" } }
    SectionTitle(stringResource(R.string.side_section)) {
        Text(
            stringResource(R.string.side_rewards_left, Rules.SIDE_REWARDS_PER_DAY - rewardsLeft, Rules.SIDE_REWARDS_PER_DAY),
            color = if (rewardsLeft == 0) Lif.colors.gold else Lif.colors.dim, style = MaterialTheme.typography.labelMedium,
        )
        InfoButton(Guide.SIDE)
    }
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
        InfoButton(Guide.BOSS)
    }
    val theme = seasonTheme(def)
    val tint = theme?.color ?: p.red
    Panel(
        border = (if (b.defeated) p.green else tint).copy(alpha = if (theme != null) 0.8f else 0.5f),
        background = theme?.color?.copy(alpha = 0.06f) ?: p.panel,
        onClick = { onChallenge(b.challenge.id) },
    ) {
        if (theme != null) SeasonRibbon(theme)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(theme?.icon ?: Icons.Rounded.Whatshot, null, tint = if (b.defeated) p.green else tint)
            Spacer(Modifier.width(8.dp))
            Text(def.title.local(), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            Pill(def.rank, if (def.rank == "S") p.red else p.gold)
        }
        // Compact: name, health and the challenge in one line; the challenge's details open on tap.
        Spacer(Modifier.height(8.dp))
        if (b.defeated) {
            Text(stringResource(R.string.boss_defeated, shadow?.name?.local().orEmpty()), style = MaterialTheme.typography.bodyMedium, color = p.green)
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Bar(b.hp / b.maxHp.toFloat(), tint, height = 8.dp, modifier = Modifier.weight(1f))
                Spacer(Modifier.width(8.dp))
                Text("${b.hp} / ${b.maxHp}", style = MaterialTheme.typography.labelMedium, color = p.muted)
            }
            val c = b.challenge
            Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.boss_challenge), style = MaterialTheme.typography.labelLarge, color = p.gold, modifier = Modifier.weight(1f))
                Text(
                    if (c.isSuccessful()) stringResource(R.string.boss_challenge_done) else "−${(Rules.BOSS_CHALLENGE_DAMAGE * 100).toInt()}% HP",
                    style = MaterialTheme.typography.labelLarge, color = if (c.isSuccessful()) p.green else p.gold,
                )
                Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null, tint = p.muted, modifier = Modifier.size(18.dp))
            }
        }
    }
    if (def.season == null) upcomingSeason(content.bosses, LocalDate.now())?.let { SeasonTeaser(it) }
}

/** Missions marked done, with a flame sitting on the bar at the streak minimum; it lights up once reached. */
@Composable
private fun GoalBar(goal: com.lifup.app.domain.DayGoal) {
    val p = Lif.colors
    val safe = goal.safe
    BoxWithConstraints(Modifier.fillMaxWidth().height(18.dp), contentAlignment = Alignment.CenterStart) {
        val frac = goal.needed / goal.total.coerceAtLeast(1).toFloat()
        Bar(goal.kept / goal.total.coerceAtLeast(1).toFloat(), if (safe) p.green else p.accent)
        Box(
            Modifier.offset(x = maxWidth * frac - 9.dp).size(18.dp).clip(CircleShape).background(p.bg),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Rounded.LocalFireDepartment, stringResource(R.string.today_goal, goal.needed, goal.total),
                tint = if (safe) p.red else p.dim, modifier = Modifier.size(14.dp),
            )
        }
    }
}

/** Offers to turn a mission kept on only some days into an "N times a week" one. */
@Composable
private fun WeeklyHintCard(s: GameState, h: WeeklyHint) {
    val p = Lif.colors
    Panel(border = p.accent.copy(alpha = 0.6f), background = p.accent.copy(alpha = 0.06f)) {
        Row(verticalAlignment = Alignment.Top) {
            Icon(Icons.Rounded.EventRepeat, null, tint = p.accent)
            Spacer(Modifier.width(10.dp))
            Text(
                stringResource(R.string.weekly_hint_text, defTitle(s, h.defId), h.done, h.days, h.perWeek),
                style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f),
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = { act { dismissWeeklyHint() } }) { Text(stringResource(R.string.weekly_hint_no), color = p.muted) }
            TextButton(onClick = { act { acceptWeeklyHint() } }) { Text(stringResource(R.string.weekly_hint_yes, h.perWeek), color = p.accent) }
        }
    }
}

/** Small "Manage" action in the daily missions' header, opening the Forge. */
@Composable
private fun ManageAction(onClick: () -> Unit) {
    val p = Lif.colors
    val label = stringResource(R.string.manage_missions)
    Row(
        Modifier.clip(RoundedCornerShape(8.dp)).clickable(onClickLabel = label, onClick = onClick).padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Tune, contentDescription = null, tint = p.accent, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(4.dp))
        Text(stringResource(R.string.manage), color = p.accent, style = MaterialTheme.typography.labelLarge)
    }
}
