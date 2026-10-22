package com.lifup.app.ui.hero

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.FilterChip
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.Check
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import com.lifup.app.ui.shadowRankColor
import androidx.compose.material3.FilterChipDefaults
import com.lifup.app.domain.PowerKind
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.ShadowRank
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.content
import com.lifup.app.ui.shadowRankName
import com.lifup.app.ui.theme.Lif

/**
 * The Echoes tab: the squad on top, then the whole collection with rarity, power and favourite filters.
 * Favourites come first, but the order only catches up when the filter changes or the tab is
 * reopened, so tiles don't jump around while the player is starring them.
 */
@Composable
fun EchoesScreen(s: GameState, active: Boolean = true) {
    var openShadow by rememberSaveable { mutableStateOf<String?>(null) }
    var filter by rememberSaveable { mutableStateOf<ShadowRank?>(null) }
    var favOnly by rememberSaveable { mutableStateOf(false) }
    var power by rememberSaveable { mutableStateOf<PowerKind?>(null) }
    var shownFavs by remember { mutableStateOf(s.favoriteEchoes) }
    // The pager keeps the tab alive, so catch up when it goes off screen (no jump on the way back).
    val favorites by rememberUpdatedState(s.favoriteEchoes)
    LaunchedEffect(active) { if (!active) shownFavs = favorites }
    fun pick(rank: ShadowRank?, favs: Boolean) {
        filter = rank
        favOnly = favs
        shownFavs = s.favoriteEchoes
    }
    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Squad(s) { openShadow = it } }
        item {
            SectionTitle(stringResource(R.string.collection)) {
                IconButton(onClick = { pick(filter, !favOnly) }, modifier = Modifier.size(32.dp)) {
                    Icon(
                        if (favOnly) Icons.Rounded.Star else Icons.Rounded.StarBorder, stringResource(R.string.favorites),
                        tint = if (favOnly) Lif.colors.gold else Lif.colors.muted, modifier = Modifier.size(20.dp),
                    )
                }
                Text("${s.shadows.size}/${content.shadows.size}", color = Lif.colors.muted, style = MaterialTheme.typography.labelMedium)
            }
            // Two menus side by side: always fits, and each shows what it's filtering by.
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterMenu(
                    stringResource(R.string.filter_rarity), stringResource(R.string.all), filter, ShadowRank.entries,
                    name = { stringResource(shadowRankName(it)) }, color = { shadowRankColor(it) }, icon = null, modifier = Modifier.weight(1f),
                ) { pick(it, favOnly) }
                FilterMenu(
                    stringResource(R.string.filter_power), stringResource(R.string.all_powers), power, PowerKind.entries,
                    name = { stringResource(powerName(it)) }, color = { powerColor(it) }, icon = ::powerIcon, modifier = Modifier.weight(1f),
                ) { power = it; shownFavs = s.favoriteEchoes }
            }
        }
        item { Collection(s, filter, shownFavs, favOnly, power) { openShadow = it } }
    }
    openShadow?.let { ShadowSheet(s, it) { openShadow = null } }
}

/**
 * A chip that opens a menu of [options]: it shows the active one in its colour (or [title] when none is
 * picked), so a row of them always fits the screen. Rarities get a colour dot, powers their icon.
 */
@Composable
private fun <T> FilterMenu(
    title: String, allLabel: String, selected: T?, options: List<T>,
    name: @Composable (T) -> String, color: @Composable (T) -> Color, icon: ((T) -> ImageVector)?,
    modifier: Modifier, onPick: (T?) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    val accent = selected?.let { color(it) } ?: Lif.colors.accent
    @Composable fun Mark(o: T) {
        if (icon != null) Icon(icon(o), null, tint = color(o), modifier = Modifier.size(16.dp))
        else Box(Modifier.size(10.dp).background(color(o), CircleShape))
    }
    @Composable fun Tick(on: Boolean) { if (on) Icon(Icons.Rounded.Check, null, tint = Lif.colors.accent, modifier = Modifier.size(18.dp)) }
    Box(modifier) {
        FilterChip(
            selected = selected != null, onClick = { open = true }, modifier = Modifier.fillMaxWidth(),
            label = { Text(selected?.let { name(it) } ?: title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
            leadingIcon = selected?.let { s -> { Mark(s) } },
            trailingIcon = { Icon(Icons.Rounded.ArrowDropDown, null, modifier = Modifier.size(18.dp)) },
            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = accent.copy(alpha = 0.18f)),
            border = FilterChipDefaults.filterChipBorder(true, selected != null, selectedBorderColor = accent.copy(alpha = 0.6f)),
        )
        DropdownMenu(open, onDismissRequest = { open = false }, containerColor = Lif.colors.panel) {
            DropdownMenuItem(text = { Text(allLabel) }, trailingIcon = { Tick(selected == null) }, onClick = { onPick(null); open = false })
            options.forEach { o ->
                DropdownMenuItem(
                    text = { Text(name(o)) }, leadingIcon = { Mark(o) }, trailingIcon = { Tick(selected == o) },
                    onClick = { onPick(o); open = false },
                )
            }
        }
    }
}
