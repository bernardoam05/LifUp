package com.lifup.app.ui.shop

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

@Composable
fun ShopScreen(s: GameState) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var pickFor by rememberSaveable { mutableStateOf<String?>(null) }
    var shadowInfo by rememberSaveable { mutableStateOf<String?>(null) }
    val now = rememberNow(30_000)
    val context = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                listOf(R.string.shop, R.string.inventory).forEachIndexed { i, label ->
                    SegmentedButton(selected = tab == i, onClick = { tab = i }, shape = SegmentedButtonDefaults.itemShape(i, 2)) {
                        Text(if (i == 1) "${stringResource(label)} (${s.inventory.values.sum()})" else stringResource(label))
                    }
                }
            }
        }
        if (tab == 0) {
            item { SectionTitle(stringResource(R.string.shadow_offers)) { Text(stringResource(R.string.weekly), color = Lif.colors.dim, style = MaterialTheme.typography.labelMedium) } }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    s.shop.shadowOffers.mapNotNull { content.shadowById[it] }.forEach { def ->
                        val cost = s.price(content, Rules.shopShadowPrice(def.rank), now)
                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                            ShadowTile(def, s.owned(def.id)?.level, reveal = true) { shadowInfo = def.id }
                            TextButton(onClick = { act { buyShadow(def.id) }; Feedback.buzz(context) }, enabled = s.player.gold >= cost) {
                                Icon(Icons.Rounded.Paid, null, tint = Lif.colors.gold)
                                Spacer(Modifier.width(4.dp))
                                Text("$cost", color = if (s.player.gold >= cost) Lif.colors.text else Lif.colors.dim)
                            }
                        }
                    }
                }
            }
            item { SectionTitle(stringResource(R.string.items)) }
            items(content.items, key = { it.id }) { item -> ShopRow(s, item, now) }
        } else {
            val owned = content.items.filter { s.items(it.id) > 0 }
            val buffs = s.buffs.filter { it.expiresAt > now }
            if (buffs.isNotEmpty() || s.doubleXpNext) {
                item { SectionTitle(stringResource(R.string.active_effects)) }
                if (s.doubleXpNext) item { Pill(stringResource(R.string.double_xp_active), Lif.colors.gold) }
                items(buffs, key = { it.itemId }) { b ->
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
            item { SectionTitle(stringResource(R.string.inventory)) }
            if (owned.isEmpty()) item { EmptyNote(stringResource(R.string.inventory_empty)) }
            items(owned, key = { it.id }) { item ->
                InventoryRow(s, item) {
                    when (item.effect) {
                        ItemEffect.COMPLETE_QUEST, ItemEffect.SWAP_QUEST -> pickFor = item.id
                        else -> { act { useItem(item.id) }; Feedback.buzz(context) }
                    }
                }
            }
        }
    }
    pickFor?.let { itemId -> QuestPicker(s, itemId) { pickFor = null } }
    shadowInfo?.let { ShadowSheet(s, it, reveal = true) { shadowInfo = null } }
}

@Composable
private fun ShopRow(s: GameState, item: ItemDef, now: Long) {
    val c = Lif.colors
    val cost = s.price(content, item.cost, now)
    val left = s.shop.stock[item.id]
    val soldOut = left != null && left <= 0
    val affordable = s.player.gold >= cost && !soldOut
    val context = LocalContext.current
    Panel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(itemIcon(item.id), c.accent)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.name.local(), style = MaterialTheme.typography.titleMedium)
                Text(item.description.local(), style = MaterialTheme.typography.bodySmall, color = c.muted)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                    if (left != null) Pill(stringResource(R.string.stock_left, left, item.weeklyStock ?: 0), if (soldOut) c.red else c.muted)
                    if (s.items(item.id) > 0) Pill(stringResource(R.string.owned_n, s.items(item.id)), c.green)
                }
            }
            TextButton(onClick = { act { buyItem(item.id) }; Feedback.buzz(context) }, enabled = affordable) {
                Icon(Icons.Rounded.Paid, null, tint = if (affordable) c.gold else c.dim)
                Spacer(Modifier.width(4.dp))
                Text(if (soldOut) stringResource(R.string.sold_out) else "$cost", color = if (affordable) c.text else c.dim, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun InventoryRow(s: GameState, item: ItemDef, onUse: () -> Unit) {
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
                Text("${item.name.local()}  ×${s.items(item.id)}", style = MaterialTheme.typography.titleMedium)
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
            (!swap || (content.questDefById[q.defId] ?: s.customDefs.firstOrNull { it.id == q.defId })?.kind == DefKind.POOL)
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
