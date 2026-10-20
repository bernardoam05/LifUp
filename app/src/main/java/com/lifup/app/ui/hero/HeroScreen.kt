package com.lifup.app.ui.hero

import com.lifup.app.domain.defOf
import com.lifup.app.ui.fmtCompact
import com.lifup.app.ui.fmtNum
import androidx.compose.ui.graphics.Brush
import androidx.compose.runtime.remember
import androidx.compose.material3.TextButton
import kotlin.math.roundToInt
import com.lifup.app.ui.defTitle
import com.lifup.app.ui.guide.InfoButton
import com.lifup.app.ui.guide.Guide
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.Rules
import com.lifup.app.domain.ShadowDef
import com.lifup.app.domain.ShadowRank
import com.lifup.app.domain.StatKey
import com.lifup.app.domain.passives
import com.lifup.app.domain.statValue
import com.lifup.app.ui.accentRank
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.RankBadge
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.domain.Attr
import com.lifup.app.ui.attrColor
import com.lifup.app.ui.fmtCount
import com.lifup.app.ui.passiveText
import com.lifup.app.ui.icon
import com.lifup.app.domain.availableDefs
import com.lifup.app.domain.isWeekly
import com.lifup.app.domain.PowerKind
import com.lifup.app.domain.isKind
import com.lifup.app.domain.progresses
import com.lifup.app.domain.roundTarget
import com.lifup.app.domain.targetAt
import androidx.compose.foundation.layout.fillMaxHeight
import com.lifup.app.ui.color
import com.lifup.app.domain.habitOn
import com.lifup.app.domain.habitWindow
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import com.lifup.app.ui.attrShort
import com.lifup.app.ui.components.StatTile
import com.lifup.app.ui.content
import com.lifup.app.ui.hunterTitle
import com.lifup.app.ui.local
import com.lifup.app.ui.shadowIcon
import com.lifup.app.ui.shadowRankColor
import com.lifup.app.ui.shadowRankName
import com.lifup.app.ui.theme.Lif

/** Lets other screens open the Hero tab on a given section (e.g. the inventory after a purchase). */
object HeroNav { var section by mutableIntStateOf(0) }

@Composable
fun HeroScreen(s: GameState) {
    var openAchievement by rememberSaveable { mutableStateOf<String?>(null) }
    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Profile(s) }
        item {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                listOf(R.string.inventory, R.string.hero_achievements, R.string.hero_stats).forEachIndexed { i, label ->
                    SegmentedButton(selected = HeroNav.section == i, onClick = { HeroNav.section = i }, shape = SegmentedButtonDefaults.itemShape(i, 3)) {
                        Text(stringResource(label), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
        when (HeroNav.section) {
            0 -> item { InventorySection(s) }
            1 -> items(content.achievements, key = { it.id }) { def -> AchievementRow(s, def) { openAchievement = def.id } }
            else -> item { Stats(s) }
        }
    }
    openAchievement?.let { id -> content.achievements.firstOrNull { it.id == id }?.let { AchievementSheet(s, it) { openAchievement = null } } }
}

@Composable
private fun Profile(s: GameState) {
    val p = s.player
    val rank = HunterRank.of(p.level)
    val c = Lif.colors
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RankBadge(rank.label, accentRank(rank), 56.dp)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(p.name.ifBlank { stringResource(R.string.default_hunter) }.uppercase(), style = MaterialTheme.typography.headlineSmall, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                Text(stringResource(hunterTitle(rank)), style = MaterialTheme.typography.labelLarge, color = accentRank(rank))
                rank.next?.let { Text(stringResource(R.string.next_rank_at, it.label, it.minLevel), style = MaterialTheme.typography.labelSmall, color = c.dim) }
            }
        }
        Spacer(Modifier.height(12.dp))
        val a = p.attrXp
        listOf(Attr.STR to a.str, Attr.AGI to a.agi, Attr.INT to a.int, Attr.VIT to a.vit).forEach { (attr, xp) ->
            val label = attrShort(attr)
            val color = attrColor(attr)
            val level = Rules.attrLevel(xp)
            // Progress toward the next attribute point.
            val cur = (level - 10) * (level - 10) * 5
            val next = (level - 9) * (level - 9) * 5
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                Text(label, style = MaterialTheme.typography.labelLarge, color = color, modifier = Modifier.width(40.dp))
                Bar((xp - cur) / (next - cur).toFloat(), color, modifier = Modifier.weight(1f))
                Text(level.toString(), style = MaterialTheme.typography.titleMedium, modifier = Modifier.width(36.dp), textAlign = TextAlign.End)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatTile(stringResource(R.string.streak), "${p.streak}", c.red, Modifier.weight(1f))
            StatTile(stringResource(R.string.best_streak), "${p.bestStreak}", c.gold, Modifier.weight(1f))
            StatTile(stringResource(R.string.bosses), "${s.count(StatKey.BOSSES_DEFEATED)}", c.purple, Modifier.weight(1f))
        }
    }
}

@Composable
internal fun Squad(s: GameState, onOpen: (String) -> Unit) {
    val c = Lif.colors
    val passives = s.passives(content, System.currentTimeMillis())
    SectionTitle(stringResource(R.string.squad)) { Text("${s.squad.size}/${Rules.SQUAD_SIZE}", color = c.muted, style = MaterialTheme.typography.labelMedium); InfoButton(Guide.SHADOWS) }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(Rules.SQUAD_SIZE) { i ->
            val id = s.squad.getOrNull(i)
            val def = id?.let { content.shadowById[it] }
            Box(Modifier.weight(1f)) {
                if (def != null) ShadowTile(def, s.owned(def.id)?.level, onClick = { onOpen(def.id) })
                else Box(
                    Modifier.fillMaxWidth().aspectRatio(0.8f).clip(RoundedCornerShape(12.dp)).border(1.dp, c.border, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Rounded.Add, null, tint = c.dim) }
            }
        }
    }
    if (s.squad.isNotEmpty()) SquadEffects(s, passives.luck)
}

/**
 * Under the squad: what its passives do (one chip per effect, in the effect's colour), what they
 * actually brought this week and overall, and, with luck, the chances it changes.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SquadEffects(s: GameState, luck: Double) {
    val c = Lif.colors
    val members = s.squad.mapNotNull { id -> content.shadowById[id]?.let { it to (s.owned(id)?.level ?: 1) } }
    val amp = 1 + members.filter { it.first.passive == com.lifup.app.domain.Passive.ALL_BOOST }.sumOf { (d, l) -> Rules.passiveValue(d, l) }
    val effects = members.groupBy { it.first.passive }.map { (passive, ds) ->
        val sum = ds.sumOf { (d, l) -> Rules.passiveValue(d, l) }
        passive to if (passive == com.lifup.app.domain.Passive.ALL_BOOST) sum else sum * amp
    }
    Panel(Modifier.padding(top = 8.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            effects.forEach { (passive, value) -> Pill(passiveText(passive, value), passiveColor(passive)) }
        }
        if (!s.squadTotal.isEmpty()) {
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                GainColumn(stringResource(R.string.squad_week_label), s.squadWeek, Modifier.weight(1f))
                GainColumn(stringResource(R.string.squad_total_label), s.squadTotal, Modifier.weight(1f))
            }
        }
        if (luck > 0) {
            Spacer(Modifier.height(12.dp))
            LuckOddsLines(s.player.level, luck, R.string.luck_odds_squad)
        }
    }
}

/** One period of what the squad brought: XP, gold and saves, each in its colour, or a dash. */
@Composable
private fun GainColumn(label: String, g: com.lifup.app.domain.SquadGain, modifier: Modifier) {
    val c = Lif.colors
    Column(modifier.clip(RoundedCornerShape(10.dp)).background(c.panelHigh).padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = c.dim)
        if (g.isEmpty()) Text("—", style = MaterialTheme.typography.titleMedium, color = c.dim)
        if (g.xp > 0) Text("+${fmtCount(g.xp.toLong())} XP", style = MaterialTheme.typography.titleMedium, color = c.accent)
        if (g.gold > 0) Text(stringResource(R.string.squad_gain_gold, fmtCount(g.gold.toLong())), style = MaterialTheme.typography.titleMedium, color = c.gold)
        if (g.saves > 0) Text(stringResource(R.string.squad_gain_saves, g.saves), style = MaterialTheme.typography.labelMedium, color = c.green)
    }
}

/** What a given luck does to the chances it touches, as a table: without it → with it, at the player's level. */
@Composable
internal fun LuckOddsLines(level: Int, luck: Double, title: Int) {
    val c = Lif.colors
    val base = com.lifup.app.domain.luckOdds(level, 0.0)
    val lucky = com.lifup.app.domain.luckOdds(level, luck)
    fun pct(v: Double) = com.lifup.app.ui.fmtNum(v * 100) + "%"
    Text(stringResource(title).uppercase(), style = MaterialTheme.typography.labelSmall, color = c.dim)
    Spacer(Modifier.height(4.dp))
    @Composable
    fun row(label: String, from: Double, to: Double) = Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = c.text, modifier = Modifier.weight(1f))
        Text(pct(from), style = MaterialTheme.typography.labelMedium, color = c.dim)
        Text("  →  ", style = MaterialTheme.typography.labelMedium, color = c.dim)
        Text(pct(to), style = MaterialTheme.typography.labelMedium, color = c.purple)
    }
    row(stringResource(R.string.luck_item), base.item, lucky.item)
    row(stringResource(R.string.luck_portal), base.portalEcho, lucky.portalEcho)
    // The two best ranks reachable at this level say the most.
    lucky.atLeast.keys.sortedDescending().take(2).sorted().forEach { r ->
        val line = if (r == ShadowRank.entries.last()) R.string.luck_rank_top else R.string.luck_rank
        row(stringResource(line, stringResource(com.lifup.app.ui.shadowRankName(r))), base.atLeast[r] ?: 0.0, lucky.atLeast.getValue(r))
    }
}

/** "+340 XP · +55 gold · saved you 1×", or null when the squad brought nothing. */
@Composable
internal fun squadGainText(g: com.lifup.app.domain.SquadGain): String? {
    if (g.isEmpty()) return null
    return buildList {
        if (g.xp > 0) add("+${fmtCount(g.xp.toLong())} XP")
        if (g.gold > 0) add(stringResource(R.string.squad_gain_gold, fmtCount(g.gold.toLong())))
        if (g.saves > 0) add(stringResource(R.string.squad_gain_saves, g.saves))
    }.joinToString(" · ")
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun Collection(s: GameState, filter: ShadowRank?, favorites: Set<String>, favOnly: Boolean, power: PowerKind? = null, onOpen: (String) -> Unit) {
    // [favorites] is the order's snapshot; the star on each tile follows the live state.
    // An unknown echo's power stays a mystery, so a power filter only lists owned ones.
    val list = content.shadows.filter { (filter == null || it.rank == filter) && (!favOnly || it.id in favorites) && (power == null || (s.owned(it.id) != null && it.passive.isKind(power))) }
        .sortedWith(compareByDescending<ShadowDef> { it.id in favorites }.thenByDescending { s.owned(it.id) != null }.thenByDescending { it.rank.ordinal })
    if (list.isEmpty()) {
        Text(stringResource(if (favOnly) R.string.favorites_empty else R.string.power_empty), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
        return
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 4) {
        list.forEach { def ->
            Box(Modifier.weight(1f)) {
                ShadowTile(def, s.owned(def.id)?.level, inSquad = def.id in s.squad, onClick = { onOpen(def.id) })
                if (def.id in s.favoriteEchoes) Icon(
                    Icons.Rounded.Star, null, tint = Lif.colors.gold,
                    modifier = Modifier.align(Alignment.TopStart).padding(6.dp).size(16.dp),
                )
                s.newEchoes[def.id]?.let { first ->
                    Pill(if (first) stringResource(R.string.badge_new) else "+1", Lif.colors.green, modifier = Modifier.align(Alignment.TopEnd).padding(4.dp))
                }
            }
        }
        repeat((4 - list.size % 4) % 4) { Spacer(Modifier.weight(1f)) }
    }
}

@Composable
fun ShadowTile(def: ShadowDef, level: Int?, inSquad: Boolean = false, reveal: Boolean = false, onClick: () -> Unit) {
    val c = Lif.colors
    val color = shadowRankColor(def.rank)
    val owned = level != null || reveal
    Column(
        Modifier.fillMaxWidth().aspectRatio(0.8f).clip(RoundedCornerShape(12.dp))
            .background(if (owned) Brush.verticalGradient(listOf(color.copy(alpha = 0.16f), c.panel)) else Brush.verticalGradient(listOf(c.panel, c.panel)))
            .border(if (inSquad) 2.dp else 1.dp, if (owned) color.copy(alpha = if (inSquad) 1f else 0.5f) else c.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick).padding(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        EchoEmblem(def, known = owned, size = 46.dp)
        Spacer(Modifier.height(6.dp))
        Text(
            if (owned) def.name.local() else "???",
            style = MaterialTheme.typography.labelSmall, color = if (owned) c.text else c.dim,
            maxLines = 2, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
        )
        if (level != null) Text(stringResource(R.string.level_short, level), style = MaterialTheme.typography.labelSmall, color = color)
    }
}

@Composable
private fun AchievementRow(s: GameState, def: com.lifup.app.domain.AchievementDef, onClick: () -> Unit) {
    val c = Lif.colors
    val tier = s.achievements[def.id] ?: 0
    val maxed = tier >= def.tiers.size
    val target = def.tiers.getOrElse(tier) { def.tiers.last() }
    val value = s.statValue(def.stat)
    Panel(border = if (maxed) c.gold.copy(alpha = 0.5f) else c.border, onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.EmojiEvents, null, tint = tierColor(tier), modifier = Modifier.size(28.dp))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(def.title.local(), style = MaterialTheme.typography.titleMedium)
                Text(def.text(target), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
            Pill("$tier/${def.tiers.size}", if (maxed) c.gold else c.muted)
        }
        if (!maxed) {
            Spacer(Modifier.height(6.dp))
            Bar(value / target.toFloat(), c.gold)
            Row {
                Text("${fmtCompact(value)} / ${fmtCompact(target)}", style = MaterialTheme.typography.labelSmall, color = c.dim, modifier = Modifier.weight(1f))
                val shadowNext = def.shadowReward?.tier == tier + 1
                Text(
                    stringResource(if (shadowNext) R.string.achievement_next_shadow else R.string.achievement_next, com.lifup.app.domain.achievementGold(tier + 1)),
                    style = MaterialTheme.typography.labelSmall, color = if (shadowNext) c.purple else c.gold,
                )
            }
        } else Text(stringResource(R.string.achievement_maxed), style = MaterialTheme.typography.labelSmall, color = c.gold, modifier = Modifier.padding(top = 4.dp))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Stats(s: GameState) {
    val c = Lif.colors
    val tiles = listOf(
        R.string.stat_quests to s.count(StatKey.QUESTS_COMPLETED).toString(),
        R.string.stat_perfect to s.count(StatKey.PERFECT_DAYS).toString(),
        // Half an hour shows as 0.5, not 0.
        R.string.stat_focus_h to fmtNum(s.count(StatKey.FOCUS_MINUTES) / 60.0),
        R.string.stat_sessions to s.count(StatKey.FOCUS_SESSIONS).toString(),
        R.string.stat_steps to fmtCompact(s.statValue(StatKey.STEPS)),
        R.string.stat_portals to s.count(StatKey.PORTALS_CLEARED).toString(),
        R.string.stat_gold_earned to fmtCompact(s.count(StatKey.GOLD_EARNED)),
        R.string.stat_penalties to s.count(StatKey.PENALTIES_TAKEN).toString(),
        R.string.stat_side to s.count(StatKey.SIDE_COMPLETED).toString(),
    )
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3) {
        tiles.forEach { (label, value) -> StatTile(stringResource(label), value, modifier = Modifier.weight(1f)) }
    }
    SectionTitle(stringResource(R.string.history))
    ActivityCalendar(s)
    RecentDays(s)
    MissionRates(s)
    WeeklyRates(s)
}

/** "N times a week" missions are judged by the week: one card each with a bar per week, the last one live. */
@Composable
private fun WeeklyRates(s: GameState) {
    val c = Lif.colors
    val defs = s.availableDefs(content).filter { it.isWeekly() }
    if (defs.isEmpty()) return
    SectionTitle(stringResource(R.string.weekly_rates))
    Text(stringResource(R.string.weekly_rates_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
    Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        defs.forEach { def ->
            val past = s.weeklyHistory[def.id].orEmpty()
            val now = s.weekly[def.id]?.let { com.lifup.app.domain.WeekMark(it.week, it.done, it.goal) }
            val weeks = (past + listOfNotNull(now)).takeLast(Rules.WEEKLY_CHART_WEEKS)
            Panel {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    com.lifup.app.ui.components.IconBadge(def.icon(), def.color(c), 36.dp)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(defTitle(s, def.id), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            if (past.isEmpty()) stringResource(R.string.weekly_no_history)
                            else stringResource(R.string.weekly_goals_met, past.count { it.met }, past.size),
                            style = MaterialTheme.typography.labelSmall, color = c.muted,
                        )
                    }
                    now?.let { Text("${it.done}/${it.goal}", style = MaterialTheme.typography.titleLarge, color = if (it.met) c.green else c.text) }
                }
                Spacer(Modifier.height(10.dp))
                WeekBars(weeks, current = now != null)
            }
        }
        WeekLegend()
    }
}

/** The colour of a week: goal met, part of it, or no session at all. */
@Composable
private fun weekColor(w: com.lifup.app.domain.WeekMark): Color {
    val c = Lif.colors
    return when { w.met -> c.green; w.done > 0 -> c.gold; else -> c.red }
}

@Composable
private fun WeekLegend() {
    val c = Lif.colors
    @Composable
    fun key(color: Color, label: Int, outlined: Boolean = false) = Row(verticalAlignment = Alignment.CenterVertically) {
        val shape = RoundedCornerShape(2.dp)
        Box(Modifier.size(10.dp).clip(shape).then(if (outlined) Modifier.border(1.5.dp, color, shape) else Modifier.background(color)))
        Spacer(Modifier.width(4.dp))
        Text(stringResource(label), style = MaterialTheme.typography.labelSmall, color = c.dim)
    }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(start = 4.dp)) {
        key(c.green, R.string.week_key_met)
        key(c.gold, R.string.week_key_part)
        key(c.red, R.string.week_key_none)
        key(c.text, R.string.week_key_now, outlined = true)
    }
}

/** A bar per week, filled by sessions over the goal in the week's colour; the current week is outlined. */
@Composable
private fun WeekBars(weeks: List<com.lifup.app.domain.WeekMark>, current: Boolean) {
    val c = Lif.colors
    Row(Modifier.fillMaxWidth().height(44.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.Bottom) {
        // Empty slots on the left keep bars the same width while history is short.
        repeat(Rules.WEEKLY_CHART_WEEKS - weeks.size) { Box(Modifier.weight(1f).fillMaxHeight(0.12f).clip(RoundedCornerShape(3.dp)).background(c.border.copy(alpha = 0.4f))) }
        weeks.forEachIndexed { i, w ->
            val live = current && i == weeks.lastIndex
            val share = if (w.goal == 0) 0f else (w.done / w.goal.toFloat()).coerceIn(0f, 1f)
            val shape = RoundedCornerShape(3.dp)
            Box(
                Modifier.weight(1f).fillMaxHeight().clip(shape).background(c.border.copy(alpha = 0.4f))
                    .then(if (live) Modifier.border(1.5.dp, c.text, shape) else Modifier),
                contentAlignment = Alignment.BottomCenter,
            ) {
                // A closed week with no session still shows a red sliver; the live one only fills as sessions come.
                Box(Modifier.fillMaxWidth().fillMaxHeight(share.coerceAtLeast(if (live) 0f else 0.08f)).background(weekColor(w)))
            }
        }
    }
}

/** The last week day by day, folded by default: each day's missions as a bar in the colour of how it ended. */
@Composable
private fun RecentDays(s: GameState) {
    val c = Lif.colors
    val days = s.dayLog.takeLast(7).reversed()
    if (days.isEmpty()) return
    var open by rememberSaveable { mutableStateOf(false) }
    Panel(Modifier.padding(top = 8.dp), onClick = { open = !open }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.recent_days), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            Text(stringResource(R.string.recent_days_kept, days.count { it.passed || it.perfect }, days.size), style = MaterialTheme.typography.labelMedium, color = c.muted)
            Icon(if (open) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = c.dim, modifier = Modifier.padding(start = 4.dp).size(20.dp))
        }
        if (open) days.forEach { DayRow(it) }
    }
}

@Composable
private fun DayRow(d: com.lifup.app.domain.DayLog) {
    val c = Lif.colors
    val color = when { d.rest -> c.purple; d.perfect -> c.gold; d.penalty -> c.red; d.passed -> c.green; else -> c.muted }
    // Short results in a fixed column, so every bar is the same length; a penalty shows as a warning mark.
    val result = when {
        d.rest -> stringResource(R.string.day_rest)
        d.perfect -> stringResource(R.string.day_perfect)
        else -> "${d.done}/${d.total}"
    }
    Row(Modifier.fillMaxWidth().padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
            java.time.LocalDate.parse(d.day).format(java.time.format.DateTimeFormatter.ofPattern("EEE, d MMM")),
            style = MaterialTheme.typography.labelMedium, color = c.muted, modifier = Modifier.width(112.dp), maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
        Bar(if (d.total == 0) 0f else d.done / d.total.toFloat(), color, height = 6.dp, modifier = Modifier.weight(1f))
        Row(Modifier.width(84.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
            if (d.penalty) Icon(Icons.Rounded.Warning, stringResource(R.string.penalty_section), tint = color, modifier = Modifier.padding(end = 4.dp).size(14.dp))
            Text(result, style = MaterialTheme.typography.labelMedium, color = color, maxLines = 1)
        }
    }
}

/** Kept-rate per mission, weakest first: a card each, tapped open for its last 30 days. */
@Composable
private fun MissionRates(s: GameState) {
    val c = Lif.colors
    // Missions removed from the app have no name left to show.
    // Weekly missions have their own chart below (older stats may predate their switch to weekly).
    val stats = s.missionStats.entries.mapNotNull { e -> s.defOf(e.key, content)?.takeIf { e.value.total > 0 && !it.isWeekly() }?.let { it to e.value } }
        .sortedWith(compareBy({ it.second.rate }, { -it.second.total }))
    if (stats.isEmpty()) return
    var all by remember { mutableStateOf(false) }
    var open by remember { mutableStateOf<String?>(null) }
    SectionTitle(stringResource(R.string.mission_rates))
    Text(stringResource(R.string.mission_rates_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
    Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        (if (all) stats else stats.take(6)).forEach { (def, st) ->
            val pct = (st.rate * 100).roundToInt()
            val color = when { pct >= 75 -> c.green; pct >= 50 -> c.gold; else -> c.red }
            Panel(onClick = { open = if (open == def.id) null else def.id }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    com.lifup.app.ui.components.IconBadge(def.icon(), def.color(c), 36.dp)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(defTitle(s, def.id), style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(androidx.compose.ui.res.pluralStringResource(R.plurals.rate_times, st.total, st.done, st.total), style = MaterialTheme.typography.labelSmall, color = c.muted)
                            s.adapt[def.id]?.level?.takeIf { it != 0 && def.progresses() }?.let { step ->
                                Pill("${fmtNum(def.baseTarget)} → ${fmtNum(roundTarget(def.targetAt(step), def.unit))}", c.dim)
                            }
                        }
                    }
                    Text("$pct%", style = MaterialTheme.typography.titleLarge, color = color)
                }
                Spacer(Modifier.height(8.dp))
                Bar(st.rate.toFloat(), color, height = 6.dp)
                if (open == def.id) HabitHistory(s, def.id)
            }
        }
    }
    if (stats.size > 6) TextButton(onClick = { all = !all }) { Text(stringResource(if (all) R.string.show_less else R.string.show_all).uppercase()) }
}

/**
 * One mission over time: the last 30 days as a strip, oldest first (kept, missed, or not drawn
 * that day), and those 30 days against the 30 before, to see whether it's getting better.
 */
@Composable
private fun HabitHistory(s: GameState, id: String) {
    val c = Lif.colors
    val today = java.time.LocalDate.now()
    Column(Modifier.padding(top = 8.dp, bottom = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        // Closed days come from the history; today shows live: done, failed, or still open (outlined).
        val live = s.dailyQuests.firstOrNull { it.defId == id }?.takeIf { s.day == today.toString() }
        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            for (back in Rules.HABIT_STRIP_DAYS - 1 downTo 0) {
                val shape = RoundedCornerShape(2.dp)
                val cell = Modifier.weight(1f).aspectRatio(1f).clip(shape)
                when {
                    back == 0 && live != null && live.status == com.lifup.app.domain.QuestStatus.OPEN ->
                        Box(cell.border(1.5.dp, c.accent, shape))
                    back == 0 && live != null -> Box(cell.background(if (live.status == com.lifup.app.domain.QuestStatus.DONE) c.green else c.red))
                    else -> {
                        val color = when (s.habitOn(id, today.minusDays(back.toLong()))) { true -> c.green; false -> c.red; null -> c.border }
                        Box(cell.background(color))
                    }
                }
            }
        }
        val recent = s.habitWindow(id, today, 30)
        val before = s.habitWindow(id, today.minusDays(30), 30)
        val text = when {
            recent.total == 0 -> stringResource(R.string.habit_none_yet)
            before.total == 0 -> stringResource(R.string.habit_recent, recent.done, recent.total)
            else -> stringResource(R.string.habit_trend, recent.done, recent.total, (recent.rate * 100).roundToInt(), (before.rate * 100).roundToInt())
        }
        val up = before.total > 0 && recent.total > 0 && recent.rate > before.rate
        val down = before.total > 0 && recent.total > 0 && recent.rate < before.rate
        Text(text, style = MaterialTheme.typography.labelSmall, color = if (up) c.green else if (down) c.gold else c.muted)
    }
}
