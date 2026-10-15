package com.lifup.app.ui.hero

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.GroupAdd
import androidx.compose.material.icons.rounded.GroupRemove
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Rules
import com.lifup.app.domain.SourceType
import com.lifup.app.domain.toggleSquad
import com.lifup.app.domain.upgradeCost
import com.lifup.app.domain.upgradeShadow
import com.lifup.app.ui.act
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.content
import com.lifup.app.ui.local
import com.lifup.app.ui.passiveText
import com.lifup.app.ui.shadowIcon
import com.lifup.app.ui.shadowRankColor
import com.lifup.app.ui.shadowRankName
import com.lifup.app.ui.theme.Lif

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShadowSheet(s: GameState, id: String, reveal: Boolean = false, onDismiss: () -> Unit) {
    val def = content.shadowById[id] ?: return
    val owned = s.owned(id)
    val known = owned != null || reveal
    val c = Lif.colors
    val color = shadowRankColor(def.rank)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.panel) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(if (known) shadowIcon(def.shadowClass) else Icons.Rounded.Lock, color, 56.dp)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (known) def.name.local() else "???", style = MaterialTheme.typography.headlineSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Pill(stringResource(shadowRankName(def.rank)), color)
                        if (owned != null) Pill(stringResource(R.string.level_short, owned.level), color, filled = true)
                    }
                }
            }
            val level = owned?.level ?: 1
            Panel(background = c.panelHigh) {
                Text(stringResource(R.string.passive).uppercase(), style = MaterialTheme.typography.labelMedium, color = c.dim)
                Text(passiveText(def.passive, Rules.passiveValue(def, level)), style = MaterialTheme.typography.titleMedium, color = c.accent)
                if (owned != null && Rules.passiveValue(def, level) > 0) {
                    Text(stringResource(R.string.next_level_value, passiveText(def.passive, Rules.passiveValue(def, level + 1))), style = MaterialTheme.typography.labelSmall, color = c.dim)
                }
            }
            Text(
                when (def.source.type) {
                    SourceType.EXTRACTION -> stringResource(R.string.source_extraction)
                    SourceType.SHOP -> stringResource(R.string.source_shop)
                    SourceType.ACHIEVEMENT -> stringResource(R.string.source_achievement)
                    SourceType.STREAK -> stringResource(R.string.source_streak)
                    SourceType.BOSS -> stringResource(R.string.source_boss, content.bossById[def.source.bossId]?.title?.local().orEmpty())
                },
                style = MaterialTheme.typography.labelMedium, color = c.muted,
            )
            if (owned != null) {
                val cost = s.upgradeCost(content, id)!!
                val inSquad = id in s.squad
                val canUpgrade = !cost.levelCapped && s.player.gold >= cost.gold && owned.copies >= cost.copies
                Text(
                    if (cost.levelCapped) stringResource(R.string.upgrade_capped)
                    else stringResource(R.string.upgrade_cost, cost.gold, owned.copies, cost.copies),
                    style = MaterialTheme.typography.labelMedium, color = if (canUpgrade) c.text else c.dim,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GhostButton(
                        stringResource(if (inSquad) R.string.unequip else R.string.equip),
                        onClick = { act { toggleSquad(id) } },
                        enabled = inSquad || s.squad.size < Rules.SQUAD_SIZE,
                        modifier = Modifier.weight(1f),
                        icon = if (inSquad) Icons.Rounded.GroupRemove else Icons.Rounded.GroupAdd,
                    )
                    PrimaryButton(stringResource(R.string.upgrade), onClick = { act { upgradeShadow(id) } }, enabled = canUpgrade, modifier = Modifier.weight(1f), icon = Icons.Rounded.ArrowUpward)
                }
            }
        }
    }
}
