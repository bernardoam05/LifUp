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
import androidx.compose.runtime.getValue
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

/** The Echoes tab: the squad on top, then the whole collection with rarity filters. */
@Composable
fun EchoesScreen(s: GameState) {
    var openShadow by rememberSaveable { mutableStateOf<String?>(null) }
    var filter by rememberSaveable { mutableStateOf<ShadowRank?>(null) }
    LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
    openShadow?.let { ShadowSheet(s, it) { openShadow = null } }
}
