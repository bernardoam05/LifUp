package com.lifup.app.ui.hero

import com.lifup.app.domain.swapSquad
import androidx.compose.foundation.layout.size
import androidx.compose.ui.draw.alpha
import com.lifup.app.domain.squadLocked
import com.lifup.app.domain.toggleFavoriteEcho
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import com.lifup.app.domain.EchoOrigin
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.material3.TextButton
import androidx.compose.material3.AlertDialog
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
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
    var swapping by remember { mutableStateOf(false) }
    if (swapping) SwapDialog(s, id) { swapping = false }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.panel) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                EchoEmblem(def, known = known, size = 72.dp)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (known) def.name.local() else "???", style = MaterialTheme.typography.headlineSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Pill(stringResource(shadowRankName(def.rank)), color)
                        if (owned != null) Pill(stringResource(R.string.level_short, owned.level), color, filled = true)
                    }
                }
                if (owned != null) {
                    val fav = id in s.favoriteEchoes
                    IconButton(onClick = { act { toggleFavoriteEcho(id) } }) {
                        Icon(
                            if (fav) Icons.Rounded.Star else Icons.Rounded.StarBorder,
                            stringResource(if (fav) R.string.favorite_remove else R.string.favorite_add),
                            tint = if (fav) c.gold else c.muted,
                        )
                    }
                }
            }
            val level = owned?.level ?: 1
            Panel(background = c.panelHigh) {
                Text(stringResource(R.string.passive).uppercase(), style = MaterialTheme.typography.labelMedium, color = c.dim)
                Text(passiveText(def.passive, Rules.passiveValue(def, level, s.player.level)), style = MaterialTheme.typography.titleMedium, color = c.accent)
                if (owned != null && Rules.passiveValue(def, level + 1, s.player.level) != Rules.passiveValue(def, level, s.player.level)) {
                    Text(stringResource(R.string.next_level_value, passiveText(def.passive, Rules.passiveValue(def, level + 1, s.player.level))), style = MaterialTheme.typography.labelSmall, color = c.dim)
                }
                if (def.passive == com.lifup.app.domain.Passive.SHADOW_LUCK) {
                    Spacer(Modifier.height(6.dp))
                    LuckOddsLines(s.player.level, Rules.passiveValue(def, level), R.string.luck_odds_echo)
                }
            }
            owned?.origin?.let { Text(originText(owned), style = MaterialTheme.typography.labelMedium, color = c.text) }
            if (owned?.origin == null) Text(
                when (def.source.type) {
                    SourceType.EXTRACTION -> stringResource(R.string.source_extraction)
                    SourceType.SHOP -> stringResource(R.string.source_shop)
                    SourceType.ACHIEVEMENT -> stringResource(R.string.source_achievement)
                    SourceType.STREAK -> stringResource(R.string.source_streak)
                    SourceType.BOSS -> stringResource(R.string.source_boss, content.bossById[def.source.bossId]?.title?.local().orEmpty())
                    SourceType.LEVEL -> stringResource(R.string.source_level, def.source.level ?: 0)
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
                    // A full squad offers a swap instead of a disabled button; members that joined today stay put.
                    val full = !inSquad && s.squad.size >= Rules.SQUAD_SIZE
                    val locked = if (inSquad) s.squadLocked(id) else full && s.squad.all { s.squadLocked(it) }
                    GhostButton(
                        stringResource(if (locked) R.string.squad_locked else if (inSquad) R.string.unequip else if (full) R.string.squad_swap else R.string.equip),
                        onClick = { if (full) swapping = true else act { toggleSquad(id) } },
                        modifier = Modifier.weight(1f), enabled = !locked,
                        icon = if (locked) Icons.Rounded.Lock else if (inSquad) Icons.Rounded.GroupRemove else if (full) Icons.Rounded.SwapHoriz else Icons.Rounded.GroupAdd,
                    )
                    PrimaryButton(stringResource(R.string.upgrade), onClick = { act { upgradeShadow(id) } }, enabled = canUpgrade, modifier = Modifier.weight(1f), icon = Icons.Rounded.ArrowUpward)
                }
            }
        }
    }
}

/** "Obtained 18 Oct · Defeated X": when and how this echo first joined. */
@Composable
private fun originText(o: com.lifup.app.domain.OwnedShadow): String {
    val ref = o.originRef.orEmpty()
    val how = when (o.origin) {
        EchoOrigin.PERFECT_DAY -> stringResource(R.string.origin_perfect_day)
        EchoOrigin.PORTAL -> stringResource(R.string.origin_portal)
        EchoOrigin.ESSENCE -> stringResource(R.string.origin_essence)
        EchoOrigin.SHOP -> stringResource(R.string.origin_shop)
        EchoOrigin.ACHIEVEMENT -> stringResource(R.string.origin_achievement, content.achievementById[ref]?.title?.local().orEmpty())
        EchoOrigin.STREAK -> stringResource(R.string.origin_streak, ref.toIntOrNull() ?: 0)
        EchoOrigin.BOSS -> stringResource(R.string.origin_boss, content.bossById[ref]?.title?.local().orEmpty())
        EchoOrigin.LEVEL -> stringResource(R.string.origin_level, ref.toIntOrNull() ?: 0)
        null -> ""
    }
    val date = o.obtainedOn?.let { java.time.LocalDate.parse(it).format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy")) }
    return if (date != null) stringResource(R.string.origin_line, date, how) else how
}

/** Picks which squad member steps out for the new echo. */
@Composable
private fun SwapDialog(s: GameState, inId: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.squad_swap_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                s.squad.mapNotNull { content.shadowById[it] }.forEach { out ->
                    val locked = s.squadLocked(out.id)
                    Panel(onClick = if (locked) null else { { act { swapSquad(out.id, inId) }; onDismiss() } }, padding = PaddingValues(10.dp)) {
                        Row(Modifier.alpha(if (locked) 0.5f else 1f), verticalAlignment = Alignment.CenterVertically) {
                            EchoEmblem(out, known = true, size = 36.dp)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(out.name.local(), style = MaterialTheme.typography.titleSmall)
                                Text(
                                    if (locked) stringResource(R.string.squad_locked) else passiveText(out.passive, Rules.passiveValue(out, s.owned(out.id)?.level ?: 1, s.player.level)),
                                    style = MaterialTheme.typography.labelSmall, color = Lif.colors.muted,
                                )
                            }
                            if (locked) Icon(Icons.Rounded.Lock, null, tint = Lif.colors.dim, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
