package com.lifup.app.ui.hero

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
import com.lifup.app.ui.components.StatTile
import com.lifup.app.ui.content
import com.lifup.app.ui.hunterTitle
import com.lifup.app.ui.local
import com.lifup.app.ui.shadowIcon
import com.lifup.app.ui.shadowRankColor
import com.lifup.app.ui.shadowRankName
import com.lifup.app.ui.theme.Lif

@Composable
fun HeroScreen(s: GameState) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var openShadow by rememberSaveable { mutableStateOf<String?>(null) }
    var filter by rememberSaveable { mutableStateOf<ShadowRank?>(null) }
    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Profile(s) }
        item {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                listOf(R.string.hero_shadows, R.string.hero_achievements, R.string.hero_stats).forEachIndexed { i, label ->
                    SegmentedButton(selected = tab == i, onClick = { tab = i }, shape = SegmentedButtonDefaults.itemShape(i, 3)) { Text(stringResource(label)) }
                }
            }
        }
        when (tab) {
            0 -> {
                item { Squad(s) { openShadow = it } }
                item {
                    SectionTitle(stringResource(R.string.collection)) {
                        Text("${s.shadows.size}/${content.shadows.size}", color = Lif.colors.muted, style = MaterialTheme.typography.labelMedium)
                    }
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = filter == null, onClick = { filter = null }, label = { Text(stringResource(R.string.all)) })
                        ShadowRank.entries.forEach { r ->
                            FilterChip(selected = filter == r, onClick = { filter = if (filter == r) null else r }, label = { Text(stringResource(shadowRankName(r))) })
                        }
                    }
                }
                item { Collection(s, filter) { openShadow = it } }
            }
            1 -> items(content.achievements, key = { it.id }) { def -> AchievementRow(s, def) }
            else -> item { Stats(s) }
        }
    }
    openShadow?.let { ShadowSheet(s, it) { openShadow = null } }
}

@Composable
private fun Profile(s: GameState) {
    val p = s.player
    val rank = HunterRank.of(p.level)
    val c = Lif.colors
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RankBadge(rank.name, accentRank(rank), 56.dp)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(p.name.ifBlank { stringResource(R.string.default_hunter) }.uppercase(), style = MaterialTheme.typography.headlineSmall)
                Text(stringResource(hunterTitle(rank)), style = MaterialTheme.typography.labelLarge, color = accentRank(rank))
                rank.next?.let { Text(stringResource(R.string.next_rank_at, it.name, it.minLevel), style = MaterialTheme.typography.labelSmall, color = c.dim) }
            }
        }
        Spacer(Modifier.height(12.dp))
        val a = p.attrXp
        listOf(
            Triple("STR", a.str, c.red), Triple("AGI", a.agi, c.green), Triple("INT", a.int, c.blue), Triple("VIT", a.vit, c.gold),
        ).forEach { (label, xp, color) ->
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
private fun Squad(s: GameState, onOpen: (String) -> Unit) {
    val c = Lif.colors
    val passives = s.passives(content, System.currentTimeMillis())
    SectionTitle(stringResource(R.string.squad)) { Text("${s.squad.size}/${Rules.SQUAD_SIZE}", color = c.muted, style = MaterialTheme.typography.labelMedium) }
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
    fun pct(v: Double) = (v * 100).toInt()
    val active = buildList {
        if (passives.xp > 0) add(stringResource(R.string.squad_xp, pct(passives.xp)))
        if (passives.gold > 0) add(stringResource(R.string.squad_gold, pct(passives.gold)))
        if (passives.bossDamage > 0) add(stringResource(R.string.squad_boss, pct(passives.bossDamage)))
        if (passives.penaltyReduce > 0) add(stringResource(R.string.squad_penalty, pct(passives.penaltyReduce)))
        if (passives.focusMastery > 0) add(stringResource(R.string.squad_focus, pct(passives.focusMastery)))
        if (passives.luck > 0) add(stringResource(R.string.squad_luck, pct(passives.luck)))
        if (passives.immunity) add(stringResource(R.string.passive_immunity))
        if (passives.streakProtect) add(stringResource(R.string.passive_streak))
    }
    if (active.isNotEmpty()) Text(active.joinToString(" · "), style = MaterialTheme.typography.labelMedium, color = c.accent, modifier = Modifier.padding(top = 6.dp))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Collection(s: GameState, filter: ShadowRank?, onOpen: (String) -> Unit) {
    val list = content.shadows.filter { filter == null || it.rank == filter }
        .sortedWith(compareByDescending<ShadowDef> { s.owned(it.id) != null }.thenByDescending { it.rank.ordinal })
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 4) {
        list.forEach { def ->
            Box(Modifier.weight(1f)) { ShadowTile(def, s.owned(def.id)?.level, inSquad = def.id in s.squad, onClick = { onOpen(def.id) }) }
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
            .background(if (owned) color.copy(alpha = 0.10f) else c.panel)
            .border(if (inSquad) 2.dp else 1.dp, if (owned) color.copy(alpha = if (inSquad) 1f else 0.5f) else c.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick).padding(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(if (owned) shadowIcon(def.shadowClass) else Icons.Rounded.Lock, null, tint = if (owned) color else c.dim, modifier = Modifier.size(28.dp))
        Spacer(Modifier.height(4.dp))
        Text(
            if (owned) def.name.local() else "???",
            style = MaterialTheme.typography.labelSmall, color = if (owned) c.text else c.dim,
            maxLines = 2, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
        )
        if (level != null) Text(stringResource(R.string.level_short, level), style = MaterialTheme.typography.labelSmall, color = color)
    }
}

@Composable
private fun AchievementRow(s: GameState, def: com.lifup.app.domain.AchievementDef) {
    val c = Lif.colors
    val tier = s.achievements[def.id] ?: 0
    val maxed = tier >= def.tiers.size
    val target = def.tiers.getOrElse(tier) { def.tiers.last() }
    val value = s.statValue(def.stat)
    val tierColors = listOf(c.dim, Color(0xFFCD7F32), Color(0xFFC0C0C0), c.gold, c.accent, c.purple)
    Panel(border = if (maxed) c.gold.copy(alpha = 0.5f) else c.border) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.EmojiEvents, null, tint = tierColors[tier.coerceAtMost(tierColors.lastIndex)], modifier = Modifier.size(28.dp))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(def.title.local(), style = MaterialTheme.typography.titleMedium)
                Text(def.description.local().replace("{target}", target.toString()), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
            Pill("$tier/${def.tiers.size}", if (maxed) c.gold else c.muted)
        }
        if (!maxed) {
            Spacer(Modifier.height(6.dp))
            Bar(value / target.toFloat(), c.gold)
            Text("$value / $target", style = MaterialTheme.typography.labelSmall, color = c.dim)
        }
        def.shadowReward?.let { r ->
            val shadow = content.shadowById[r.shadowId]
            if (shadow != null) Text(stringResource(R.string.achievement_shadow_reward, r.tier, if (tier >= r.tier) shadow.name.local() else "???"), style = MaterialTheme.typography.labelSmall, color = c.purple)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Stats(s: GameState) {
    val c = Lif.colors
    val tiles = listOf(
        R.string.stat_quests to s.count(StatKey.QUESTS_COMPLETED),
        R.string.stat_perfect to s.count(StatKey.PERFECT_DAYS),
        R.string.stat_focus_h to s.count(StatKey.FOCUS_MINUTES) / 60,
        R.string.stat_sessions to s.count(StatKey.FOCUS_SESSIONS),
        R.string.stat_km to s.statValue(StatKey.GPS_KM),
        R.string.stat_portals to s.count(StatKey.PORTALS_CLEARED),
        R.string.stat_gold_earned to s.count(StatKey.GOLD_EARNED),
        R.string.stat_penalties to s.count(StatKey.PENALTIES_TAKEN),
        R.string.stat_side to s.count(StatKey.SIDE_COMPLETED),
    )
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3) {
        tiles.forEach { (label, value) -> StatTile(stringResource(label), value.toString(), modifier = Modifier.weight(1f)) }
    }
    SectionTitle(stringResource(R.string.history))
    // Last 8 weeks as a heat strip: green perfect, red penalty, purple rest, grey partial.
    val days = s.dayLog.takeLast(56)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp), maxItemsInEachRow = 14) {
        days.forEach { d ->
            val color = when {
                d.rest -> c.purple
                d.perfect -> c.green
                d.penalty -> c.red
                d.total > 0 && d.done > 0 -> c.gold.copy(alpha = 0.5f)
                else -> c.border
            }
            Box(Modifier.size(18.dp).clip(RoundedCornerShape(4.dp)).background(color))
        }
    }
    if (days.isEmpty()) Text(stringResource(R.string.history_empty), style = MaterialTheme.typography.bodySmall, color = c.dim)
    Spacer(Modifier.height(8.dp))
    s.dayLog.takeLast(14).reversed().forEach { d ->
        Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
            Text(d.day, style = MaterialTheme.typography.labelMedium, color = c.muted, modifier = Modifier.weight(1f))
            Text(
                when {
                    d.rest -> stringResource(R.string.day_rest)
                    d.perfect -> stringResource(R.string.day_perfect)
                    d.penalty -> stringResource(R.string.day_penalty, d.done, d.total)
                    else -> "${d.done}/${d.total}"
                },
                style = MaterialTheme.typography.labelMedium,
                color = when { d.perfect -> c.green; d.penalty -> c.red; d.rest -> c.purple; else -> c.text },
            )
        }
    }
}
