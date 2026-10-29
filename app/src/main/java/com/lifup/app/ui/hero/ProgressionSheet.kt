package com.lifup.app.ui.hero

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.LevelMilestone
import com.lifup.app.domain.Rules
import com.lifup.app.domain.expectedDailyXp
import com.lifup.app.domain.levelMilestones
import com.lifup.app.ui.accentRank
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.RankBadge
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.content
import com.lifup.app.ui.hunterTitle
import com.lifup.app.ui.local
import com.lifup.app.ui.theme.Lif
import kotlin.math.ceil

/** Where the level stands, what the next levels bring and the rank ladder; opened from the HUD or the Hero profile. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProgressionSheet(s: GameState, onDismiss: () -> Unit) {
    val p = s.player
    val c = Lif.colors
    val rank = HunterRank.of(p.level)
    val daily = remember(s.day, p.level) { s.expectedDailyXp(content) }
    val milestones = remember(p.level) { levelMilestones(content, p.level, 4) }
    /** XP still needed to reach [level], from where the player stands now. */
    fun xpTo(level: Int) = (Rules.xpForLevel(p.level) - p.xp).toLong() + (p.level + 1 until level).sumOf { Rules.xpForLevel(it).toLong() }
    fun daysTo(level: Int) = if (daily > 0) ceil(xpTo(level) / daily.toDouble()).toInt().coerceAtLeast(1) else null

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.panel) {
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                RankBadge(rank.label, accentRank(rank), 48.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.level_short, p.level), style = MaterialTheme.typography.titleLarge)
                    Text(stringResource(hunterTitle(rank)), style = MaterialTheme.typography.labelLarge, color = accentRank(rank))
                }
            }
            if (p.level < Rules.MAX_LEVEL) {
                Bar(p.xp / Rules.xpForLevel(p.level).toFloat())
                Text(stringResource(R.string.progression_xp_left, xpTo(p.level + 1), p.level + 1), style = MaterialTheme.typography.bodyMedium, color = if (p.xp < 0) c.red else c.text)
                daysTo(p.level + 1)?.let { Text(pluralStringResource(R.plurals.progression_days, it, it), style = MaterialTheme.typography.bodySmall, color = c.muted) }
            }

            if (milestones.isNotEmpty()) {
                SectionTitle(stringResource(R.string.progression_next))
                milestones.forEach { m -> MilestoneRow(m, daysTo(m.level)) }
                val items = Rules.LEVEL_ITEMS.mapNotNull { content.itemById[it]?.name?.local() }.joinToString(", ")
                Text(stringResource(R.string.progression_items_note, items), style = MaterialTheme.typography.bodySmall, color = c.dim)
            }

            SectionTitle(stringResource(R.string.progression_ranks))
            HunterRank.entries.forEach { r ->
                val reached = p.level >= r.minLevel
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.alpha(if (reached) 1f else 0.5f)) {
                    RankBadge(r.label, accentRank(r))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(hunterTitle(r)), style = MaterialTheme.typography.titleSmall, color = if (reached) accentRank(r) else c.text)
                        Text(stringResource(R.string.progression_rank_level, r.minLevel), style = MaterialTheme.typography.labelSmall, color = c.dim)
                    }
                    Icon(if (reached) Icons.Rounded.CheckCircle else Icons.Rounded.Lock, null, tint = if (reached) c.green else c.dim, modifier = Modifier.size(18.dp))
                }
            }
            Text(stringResource(R.string.progression_ranks_note), style = MaterialTheme.typography.bodySmall, color = c.dim)
        }
    }
}

@Composable
private fun MilestoneRow(m: LevelMilestone, days: Int?) {
    val c = Lif.colors
    Panel(border = m.rank?.let { accentRank(it).copy(alpha = 0.6f) } ?: c.border) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.level_short, m.level), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            days?.let { Text(pluralStringResource(R.plurals.progression_days_short, it, it), style = MaterialTheme.typography.labelSmall, color = c.dim) }
        }
        Spacer(Modifier.size(4.dp))
        m.rank?.let { Text(stringResource(R.string.progression_new_rank, it.label, stringResource(hunterTitle(it))), style = MaterialTheme.typography.bodyMedium, color = accentRank(it)) }
        if (m.gold > 0) Text(stringResource(R.string.progression_gold, m.gold), style = MaterialTheme.typography.bodyMedium, color = c.gold)
        if (m.items > 0) Text(pluralStringResource(R.plurals.progression_items, m.items, m.items), style = MaterialTheme.typography.bodyMedium, color = c.text)
        m.echoId?.let { id -> content.shadowById[id]?.let { Text(stringResource(R.string.progression_echo, it.name.local()), style = MaterialTheme.typography.bodyMedium, color = c.accent) } }
        if (m.rankEcho) Text(stringResource(R.string.progression_rank_echo), style = MaterialTheme.typography.bodyMedium, color = c.accent)
    }
}
