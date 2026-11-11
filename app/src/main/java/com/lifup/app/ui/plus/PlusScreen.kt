package com.lifup.app.ui.plus

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Widgets
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.Core
import com.lifup.app.domain.CoreMood
import com.lifup.app.domain.PlusProducts
import com.lifup.app.system.PlusBilling
import com.lifup.app.ui.components.CoreAvatar
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.gameState
import com.lifup.app.ui.theme.Lif

/** LifUp+: what it adds, the one-time purchase, tips, and the promise that progress is never for sale. */
@Composable
fun PlusScreen(onBack: () -> Unit) {
    val p = Lif.colors
    val s = gameState()
    val context = LocalContext.current
    val activity = context as? Activity
    val offers by PlusBilling.offers.collectAsState()
    val thanks by PlusBilling.thanks.collectAsState()
    LaunchedEffect(Unit) { PlusBilling.start(context) }
    fun price(id: String) = offers.firstOrNull { it.id == id }?.price

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back), tint = p.muted) }
        }
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            CoreAvatar(Core.stage(s), CoreMood.EXCITED, 150.dp)
            Text("LifUp+", style = MaterialTheme.typography.displaySmall)
            Text(stringResource(R.string.plus_tagline), style = MaterialTheme.typography.bodyMedium, color = p.muted, textAlign = TextAlign.Center)
        }

        SectionTitle(stringResource(R.string.plus_includes))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Perk(Icons.Rounded.AutoAwesome, p.purple, R.string.plus_perk_skins, R.string.plus_perk_skins_text)
            Perk(Icons.Rounded.Insights, p.green, R.string.plus_perk_stats, R.string.plus_perk_stats_text)
            Perk(Icons.Rounded.Groups, p.purple, R.string.plus_perk_squads, R.string.plus_perk_squads_text)
            Perk(Icons.Rounded.Groups, p.accent, R.string.plus_perk_pairs, R.string.plus_perk_pairs_text)
            Perk(Icons.Rounded.Widgets, p.accent, R.string.plus_perk_widget, R.string.plus_perk_widget_text)
            Text(stringResource(R.string.plus_more_coming), style = MaterialTheme.typography.bodySmall, color = p.dim, modifier = Modifier.padding(start = 4.dp))
        }

        Spacer(Modifier.size(16.dp))
        when {
            !PlusBilling.available -> Panel(border = p.green.copy(alpha = 0.6f)) { Text(stringResource(R.string.plus_included_github), style = MaterialTheme.typography.bodyMedium, color = p.text) }
            s.plus -> Panel(border = p.green.copy(alpha = 0.6f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CheckCircle, null, tint = p.green)
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(R.string.plus_owned), style = MaterialTheme.typography.titleMedium)
                }
            }
            else -> Panel(border = p.accent) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.plus_one_time), style = MaterialTheme.typography.bodyMedium, color = p.muted, modifier = Modifier.weight(1f))
                    Text(price(PlusProducts.PLUS) ?: "…", style = MaterialTheme.typography.headlineSmall)
                }
                Spacer(Modifier.size(10.dp))
                PrimaryButton(
                    stringResource(R.string.plus_buy), onClick = { activity?.let { PlusBilling.buy(it, PlusProducts.PLUS) } },
                    modifier = Modifier.fillMaxWidth(), enabled = price(PlusProducts.PLUS) != null,
                )
                Text(stringResource(R.string.plus_buy_note), style = MaterialTheme.typography.labelSmall, color = p.dim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
            }
        }

        if (PlusBilling.available) {
            Spacer(Modifier.size(12.dp))
            Panel {
                Text(stringResource(R.string.plus_tip_title), style = MaterialTheme.typography.titleMedium)
                Text(stringResource(if (thanks) R.string.plus_tip_thanks else R.string.plus_tip_text), style = MaterialTheme.typography.bodySmall, color = if (thanks) p.gold else p.muted)
                Spacer(Modifier.size(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PlusProducts.TIPS.forEach { id ->
                        GhostButton(price(id) ?: "…", onClick = { activity?.let { PlusBilling.buy(it, id) } }, modifier = Modifier.weight(1f), color = p.gold, enabled = price(id) != null)
                    }
                }
            }
        }

        Column(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Shield, null, tint = p.green, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.plus_never_progress), style = MaterialTheme.typography.labelMedium, color = p.muted)
            }
            if (PlusBilling.available) TextButton(onClick = { PlusBilling.restore() }) { Text(stringResource(R.string.plus_restore), color = p.accent) }
        }
    }
}

@Composable
private fun Perk(icon: ImageVector, tint: androidx.compose.ui.graphics.Color, title: Int, text: Int) {
    Panel {
        Row(verticalAlignment = Alignment.Top) {
            Icon(icon, null, tint = tint)
            Spacer(Modifier.width(12.dp))
            Column {
                Text(stringResource(title), style = MaterialTheme.typography.titleSmall)
                Text(stringResource(text), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
            }
        }
    }
}
