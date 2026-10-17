package com.lifup.app.ui.guide

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.HelpOutline
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.theme.Lif

/** Short explanations of each game system, reachable from a "?" next to it and from Settings. */
enum class Guide(val title: Int, val body: Int) {
    DAILY(R.string.guide_daily_title, R.string.guide_daily),
    STREAK(R.string.guide_streak_title, R.string.guide_streak),
    PENALTY(R.string.guide_penalty_title, R.string.guide_penalty),
    SIDE(R.string.guide_side_title, R.string.guide_side),
    BOSS(R.string.guide_boss_title, R.string.guide_boss),
    PORTAL(R.string.guide_portal_title, R.string.guide_portal),
    SHADOWS(R.string.guide_shadows_title, R.string.guide_shadows),
    FOCUS(R.string.guide_focus_title, R.string.guide_focus),
    SHOP(R.string.guide_shop_title, R.string.guide_shop),
}

@Composable
fun InfoButton(topic: Guide, s: GameState? = null) {
    var open by rememberSaveable { mutableStateOf(false) }
    IconButton(onClick = { open = true }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.AutoMirrored.Rounded.HelpOutline, stringResource(topic.title), tint = Lif.colors.dim, modifier = Modifier.size(18.dp))
    }
    if (open) GuideSheet(topic, s) { open = false }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuideSheet(topic: Guide, s: GameState?, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Lif.colors.panel) {
        Column(Modifier.padding(horizontal = 20.dp).navigationBarsPadding().padding(bottom = 24.dp)) {
            Text(stringResource(topic.title), style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            Text(stringResource(topic.body), style = MaterialTheme.typography.bodyMedium, color = Lif.colors.muted)
            // The one setting people miss: offer it right where penalties are explained.
            if (topic == Guide.PENALTY && s != null) {
                Spacer(Modifier.height(12.dp))
                PenaltyBlockToggle(s)
            }
        }
    }
}

/** Every topic as a list, for Settings. */
@Composable
fun GuideList(s: GameState) {
    var open by rememberSaveable { mutableStateOf<Guide?>(null) }
    Panel {
        Guide.entries.forEach { topic ->
            Row(Modifier.fillMaxWidth().clickable { open = topic }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(topic.title), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Rounded.ChevronRight, null, tint = Lif.colors.dim)
            }
        }
    }
    open?.let { GuideSheet(it, s) { open = null } }
}
