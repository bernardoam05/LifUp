package com.lifup.app.ui.hero

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.Core
import com.lifup.app.domain.CoreMood
import com.lifup.app.domain.GameState
import com.lifup.app.domain.updateSettings
import com.lifup.app.ui.accentRank
import com.lifup.app.ui.act
import com.lifup.app.ui.components.CoreAvatar
import com.lifup.app.ui.theme.Lif

val CORE_STAGE_NAMES = listOf(R.string.core_stage_1, R.string.core_stage_2, R.string.core_stage_3, R.string.core_stage_4, R.string.core_stage_5)

/** Picks the Core's form among the unlocked ones (or "automatic": always the latest); locked ones show the rank they need. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CoreSheet(s: GameState, onDismiss: () -> Unit) {
    val c = Lif.colors
    val unlocked = Core.unlocked(s)
    val shown = Core.stage(s)
    val auto = s.settings.coreStage == null || s.settings.coreStage!! > unlocked
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.panel) {
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CoreAvatar(shown, CoreMood.HAPPY, 72.dp)
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text(stringResource(R.string.core_appearance), style = MaterialTheme.typography.titleLarge)
                    Text(stringResource(R.string.core_appearance_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
                }
            }
            FilterChip(selected = auto, onClick = { act { updateSettings { it.copy(coreStage = null) } } }, label = { Text(stringResource(R.string.core_auto)) })
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp), maxItemsInEachRow = 3) {
                for (stage in 1..Core.STAGES) {
                    val open = stage <= unlocked
                    val selected = !auto && stage == shown
                    val rank = Core.rankFor(stage)
                    Column(
                        Modifier.width(96.dp).clip(RoundedCornerShape(12.dp))
                            .border(if (selected) 2.dp else 1.dp, if (selected) c.accent else c.border, RoundedCornerShape(12.dp))
                            .clickable(enabled = open) { act { updateSettings { it.copy(coreStage = stage) } } }
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            CoreAvatar(stage, CoreMood.NEUTRAL, 72.dp, locked = !open, animate = selected || (auto && stage == shown))
                            if (!open) Icon(Icons.Rounded.Lock, null, tint = c.dim, modifier = Modifier.size(18.dp))
                        }
                        Text(stringResource(CORE_STAGE_NAMES[stage - 1]), style = MaterialTheme.typography.labelLarge, color = if (open) c.text else c.dim, textAlign = TextAlign.Center)
                        Text(
                            stringResource(R.string.core_rank, rank.label), style = MaterialTheme.typography.labelSmall,
                            color = if (open) accentRank(rank) else c.dim,
                        )
                    }
                }
            }
        }
    }
}
