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
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.AchievementDef
import com.lifup.app.domain.GameState
import com.lifup.app.domain.achievementGold
import com.lifup.app.domain.statValue
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.content
import com.lifup.app.ui.local
import com.lifup.app.ui.shadowRankName
import com.lifup.app.ui.theme.Lif

/** Trophy colour per reached tier: none, bronze, silver, gold, then the theme accents. */
@Composable
fun tierColor(tier: Int): Color {
    val c = Lif.colors
    val colors = listOf(c.dim, Color(0xFFCD7F32), Color(0xFFC0C0C0), c.gold, c.accent, c.purple)
    return colors[tier.coerceIn(0, colors.lastIndex)]
}

@Composable
fun AchievementDef.text(target: Long) =
    (descriptionOne?.takeIf { target == 1L } ?: description).local().replace("{target}", target.toString())

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementSheet(s: GameState, def: AchievementDef, onDismiss: () -> Unit) {
    val c = Lif.colors
    val tier = s.achievements[def.id] ?: 0
    val value = s.statValue(def.stat)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.panel) {
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.EmojiEvents, null, tint = tierColor(tier), modifier = Modifier.size(40.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(def.title.local(), style = MaterialTheme.typography.titleLarge)
                    Text(stringResource(R.string.achievement_tiers_done, tier, def.tiers.size), style = MaterialTheme.typography.labelMedium, color = c.muted)
                }
            }
            Text(stringResource(R.string.achievement_current, value), style = MaterialTheme.typography.bodyMedium, color = c.text)
            def.tiers.forEachIndexed { i, target -> TierRow(def, i + 1, target, value, reached = i < tier, next = i == tier) }
            Text(stringResource(R.string.achievement_note), style = MaterialTheme.typography.bodySmall, color = c.dim)
        }
    }
}

@Composable
private fun TierRow(def: AchievementDef, tier: Int, target: Long, value: Long, reached: Boolean, next: Boolean) {
    val c = Lif.colors
    val shadow = def.shadowReward?.takeIf { it.tier == tier }?.let { content.shadowById[it.shadowId] }
    Panel(border = if (next) c.gold.copy(alpha = 0.6f) else c.border, background = if (reached) c.green.copy(alpha = 0.06f) else c.panel) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                when { reached -> Icons.Rounded.CheckCircle; next -> Icons.Rounded.RadioButtonUnchecked; else -> Icons.Rounded.Lock },
                null, tint = if (reached) c.green else if (next) c.gold else c.dim, modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.achievement_tier, tier), style = MaterialTheme.typography.labelMedium, color = tierColor(tier))
                Text(def.text(target), style = MaterialTheme.typography.bodyMedium)
            }
            Pill(stringResource(R.string.achievement_gold, achievementGold(tier)), c.gold)
        }
        if (shadow != null) {
            val name = if (reached) shadow.name.local() else stringResource(R.string.achievement_hidden_shadow, stringResource(shadowRankName(shadow.rank)))
            Text(stringResource(R.string.achievement_shadow, name), style = MaterialTheme.typography.labelMedium, color = c.purple, modifier = Modifier.padding(top = 4.dp))
        }
        if (next) {
            Spacer(Modifier.size(6.dp))
            Bar(value / target.toFloat(), c.gold)
            Text("$value / $target", style = MaterialTheme.typography.labelSmall, color = c.dim)
        }
    }
}
