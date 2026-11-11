package com.lifup.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.Feature
import com.lifup.app.ui.theme.Lif

fun featureName(f: Feature) = when (f) {
    Feature.BOSS -> R.string.feature_boss
    Feature.SHOP -> R.string.feature_shop
    Feature.EXTRA -> R.string.feature_extra
    Feature.PORTAL -> R.string.feature_portal
    Feature.ECHOES -> R.string.feature_echoes
    Feature.PAIRS -> R.string.feature_pairs
}

fun featureHint(f: Feature) = when (f) {
    Feature.BOSS -> R.string.feature_boss_hint
    Feature.SHOP -> R.string.feature_shop_hint
    Feature.EXTRA -> R.string.feature_extra_hint
    Feature.PORTAL -> R.string.feature_portal_hint
    Feature.ECHOES -> R.string.feature_echoes_hint
    Feature.PAIRS -> R.string.feature_pairs_hint
}

/** A tab whose feature hasn't opened yet: what it is and the level it opens at. */
@Composable
fun LockedScreen(f: Feature) {
    val c = Lif.colors
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Rounded.Lock, null, tint = c.dim, modifier = Modifier.size(40.dp))
        Text(stringResource(featureName(f)), style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Text(stringResource(featureHint(f)), style = MaterialTheme.typography.bodyMedium, color = c.muted, textAlign = TextAlign.Center)
        Text(stringResource(R.string.feature_opens_at, f.level), style = MaterialTheme.typography.labelLarge, color = c.accent)
    }
}
