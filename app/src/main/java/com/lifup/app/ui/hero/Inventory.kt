package com.lifup.app.ui.hero

import com.lifup.app.domain.defOf
import com.lifup.app.ui.guide.InfoButton
import com.lifup.app.ui.guide.Guide
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Paid
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.GameState
import com.lifup.app.domain.ItemDef
import com.lifup.app.domain.ItemEffect
import com.lifup.app.domain.QuestOrigin
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.Rules
import com.lifup.app.domain.buyItem
import com.lifup.app.domain.buyShadow
import com.lifup.app.domain.price
import com.lifup.app.domain.useItem
import com.lifup.app.ui.Feedback
import com.lifup.app.ui.act
import com.lifup.app.ui.components.ConfirmDialog
import com.lifup.app.ui.components.EmptyNote
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.components.rememberNow
import com.lifup.app.ui.content
import com.lifup.app.ui.fmtShort
import com.lifup.app.ui.hero.ShadowSheet
import com.lifup.app.ui.hero.ShadowTile
import com.lifup.app.ui.itemIcon
import com.lifup.app.ui.lang
import com.lifup.app.ui.local
import com.lifup.app.ui.questTitle
import com.lifup.app.ui.shadowRankColor
import com.lifup.app.ui.theme.Lif


/** Owned items and running effects; items gained since the last visit carry a NEW tag. */
@Composable
fun InventorySection(s: GameState) {
    var pickFor by rememberSaveable { mutableStateOf<String?>(null) }
    val now = rememberNow(30_000)
    val context = LocalContext.current
    val owned = content.items.filter { s.items(it.id) > 0 }
    val buffs = s.buffs.filter { it.expiresAt > now }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (buffs.isNotEmpty() || s.doubleXpNext) {
            SectionTitle(stringResource(R.string.active_effects))
            if (s.doubleXpNext) Pill(stringResource(R.string.double_xp_active), Lif.colors.gold)
            buffs.forEach { b ->
                Panel {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(itemIcon(b.itemId), Lif.colors.accent, 32.dp)
                        Spacer(Modifier.width(10.dp))
                        Text(content.itemById[b.itemId]?.name?.local().orEmpty(), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                        Text(fmtShort(b.expiresAt - now), style = MaterialTheme.typography.labelMedium, color = Lif.colors.accent)
                    }
                }
            }
        }
        SectionTitle(stringResource(R.string.inventory)) { Text("${s.inventory.values.sum()}", color = Lif.colors.muted, style = MaterialTheme.typography.labelMedium) }
        if (owned.isEmpty()) EmptyNote(stringResource(R.string.inventory_empty))
        owned.forEach { item ->
            InventoryRow(s, item, isNew = item.id in s.newItems) {
                when (item.effect) {
                    ItemEffect.COMPLETE_QUEST, ItemEffect.SWAP_QUEST -> pickFor = item.id
                    else -> { act { useItem(item.id) }; Feedback.buzz(context) }
                }
            }
        }
    }
    pickFor?.let { itemId -> QuestPicker(s, itemId) { pickFor = null } }
}

@Composable
private fun InventoryRow(s: GameState, item: ItemDef, isNew: Boolean, onUse: () -> Unit) {
    val c = Lif.colors
    val passive = item.effect == ItemEffect.STREAK_SHIELD || item.effect == ItemEffect.SPELL_BREAKER
    val usable = when (item.effect) {
        ItemEffect.REMOVE_PENALTY -> s.penalty.active
        ItemEffect.DOUBLE_NEXT_XP -> !s.doubleXpNext
        else -> !passive
    }
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(itemIcon(item.id), c.accent)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${item.name.local()}  ×${s.items(item.id)}", style = MaterialTheme.typography.titleMedium)
                    if (isNew) { Spacer(Modifier.width(6.dp)); Pill(stringResource(R.string.badge_new), c.green) }
                }
                Text(item.description.local(), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
            if (passive) Text(stringResource(R.string.automatic), style = MaterialTheme.typography.labelMedium, color = c.dim)
            else TextButton(onClick = onUse, enabled = usable) { Text(stringResource(R.string.use).uppercase()) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QuestPicker(s: GameState, itemId: String, onDismiss: () -> Unit) {
    val item = content.itemById[itemId] ?: return
    val swap = item.effect == ItemEffect.SWAP_QUEST
    val quests = s.dailyQuests.filter { q ->
        q.status == QuestStatus.OPEN && q.origin == QuestOrigin.DAILY &&
            (!swap || s.defOf(q.defId, content)?.kind == DefKind.POOL)
    }
    val context = LocalContext.current
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Lif.colors.panel) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.pick_quest), style = MaterialTheme.typography.titleLarge)
            if (quests.isEmpty()) EmptyNote(stringResource(R.string.no_open_quests))
            quests.forEach { q ->
                Panel(onClick = { act { useItem(itemId, q.id) }; Feedback.buzz(context); onDismiss() }) {
                    Text(questTitle(q, lang()), style = MaterialTheme.typography.titleMedium)
                    Text("+${q.xp} XP · +${q.gold}", style = MaterialTheme.typography.labelSmall, color = Lif.colors.accent)
                }
            }
        }
    }
}
