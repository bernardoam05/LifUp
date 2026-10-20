package com.lifup.app.ui.hero

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Star
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
 * The Echoes tab: the squad on top, then the whole collection with rarity and favourite filters.
 * Favourites come first, but the order only catches up when the filter changes or the tab is
 * reopened, so tiles don't jump around while the player is starring them.
 */
@Composable
fun EchoesScreen(s: GameState, active: Boolean = true) {
    var openShadow by rememberSaveable { mutableStateOf<String?>(null) }
    var filter by rememberSaveable { mutableStateOf<ShadowRank?>(null) }
    var favOnly by rememberSaveable { mutableStateOf(false) }
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
                Text("${s.shadows.size}/${content.shadows.size}", color = Lif.colors.muted, style = MaterialTheme.typography.labelMedium)
            }
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = filter == null && !favOnly, onClick = { pick(null, false) }, label = { Text(stringResource(R.string.all)) })
                FilterChip(
                    selected = favOnly, onClick = { pick(null, !favOnly) },
                    leadingIcon = { Icon(Icons.Rounded.Star, null, tint = Lif.colors.gold, modifier = Modifier.size(16.dp)) },
                    label = { Text(stringResource(R.string.favorites)) },
                )
                ShadowRank.entries.forEach { r ->
                    FilterChip(selected = filter == r, onClick = { pick(if (filter == r) null else r, false) }, label = { Text(stringResource(shadowRankName(r))) })
                }
            }
        }
        item { Collection(s, filter, shownFavs, favOnly) { openShadow = it } }
    }
    openShadow?.let { ShadowSheet(s, it) { openShadow = null } }
}
