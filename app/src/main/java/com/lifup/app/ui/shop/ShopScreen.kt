package com.lifup.app.ui.shop

import com.lifup.app.ui.hero.HeroNav
import com.lifup.app.ui.Tab
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.SnackbarDuration
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

@Composable
fun ShopScreen(s: GameState) {
    var shadowInfo by rememberSaveable { mutableStateOf<String?>(null) }
    var buying by rememberSaveable { mutableStateOf<String?>(null) }
    val now = rememberNow(30_000)
    val context = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item { SectionTitle(stringResource(R.string.shadow_offers)) { Text(stringResource(R.string.weekly), color = Lif.colors.dim, style = MaterialTheme.typography.labelMedium); InfoButton(Guide.SHOP) } }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    s.shop.shadowOffers.mapNotNull { content.shadowById[it] }.forEach { def ->
                        val cost = s.price(content, Rules.shopShadowPrice(def.rank), now)
                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                            ShadowTile(def, s.owned(def.id)?.level, reveal = true) { shadowInfo = def.id }
                            TextButton(onClick = { buying = "shadow:${def.id}" }, enabled = s.player.gold >= cost) {
                                Icon(Icons.Rounded.Paid, null, tint = Lif.colors.gold)
                                Spacer(Modifier.width(4.dp))
                                Text("$cost", color = if (s.player.gold >= cost) Lif.colors.text else Lif.colors.dim)
                            }
                        }
                    }
                }
            }
            item { SectionTitle(stringResource(R.string.items)) }
            items(content.items, key = { it.id }) { item -> ShopRow(s, item, now) { buying = "item:${item.id}" } }
    }
    shadowInfo?.let { ShadowSheet(s, it, reveal = true) { shadowInfo = null } }
    buying?.let { key -> BuyConfirm(s, key, now) { buying = null } }
}

/** [key] is "item:<id>" or "shadow:<id>". */
@Composable
private fun BuyConfirm(s: GameState, key: String, now: Long, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val (kind, id) = key.split(":", limit = 2)
    val shadow = if (kind == "shadow") content.shadowById[id] else null
    val item = if (kind == "item") content.itemById[id] else null
    val name = shadow?.name?.local() ?: item?.name?.local() ?: return onDismiss()
    val cost = s.price(content, shadow?.let { Rules.shopShadowPrice(it.rank) } ?: item!!.cost, now)
    val snackbar = com.lifup.app.ui.LocalSnackbar.current
    val goTo = com.lifup.app.ui.LocalTabSwitcher.current
    val scope = rememberCoroutineScope()
    val boughtMsg = stringResource(R.string.bought_item, name)
    val seeLabel = stringResource(R.string.see_in_inventory)
    ConfirmDialog(
        title = stringResource(R.string.buy_confirm_title),
        text = stringResource(R.string.buy_confirm_text, name, cost, s.player.gold - cost),
        confirm = stringResource(R.string.buy),
        onConfirm = {
            act { if (shadow != null) buyShadow(id) else buyItem(id) }
            Feedback.buzz(context)
            // Items land in the Hero tab's inventory: offer a shortcut there.
            if (item != null) scope.launch {
                val r = snackbar.showSnackbar(boughtMsg, actionLabel = seeLabel, duration = SnackbarDuration.Short)
                if (r == SnackbarResult.ActionPerformed) { HeroNav.section = 0; goTo(Tab.HERO) }
            }
        },
        onDismiss = onDismiss,
    )
}

@Composable
private fun ShopRow(s: GameState, item: ItemDef, now: Long, onBuy: () -> Unit) {
    val c = Lif.colors
    val cost = s.price(content, item.cost, now)
    val left = s.shop.stock[item.id]
    val soldOut = left != null && left <= 0
    val affordable = s.player.gold >= cost && !soldOut
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
            TextButton(onClick = onBuy, enabled = affordable) {
                Icon(Icons.Rounded.Paid, null, tint = if (affordable) c.gold else c.dim)
                Spacer(Modifier.width(4.dp))
                Text(if (soldOut) stringResource(R.string.sold_out) else "$cost", color = if (affordable) c.text else c.dim, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

