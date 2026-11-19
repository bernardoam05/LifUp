package com.lifup.app.ui.rewards

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.markNoticesRead
import com.lifup.app.ui.act
import com.lifup.app.ui.components.EmptyNote
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.theme.Lif

/** Durable copy of transient notices, so sheets and dialogs can never make an event disappear. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoticeHistorySheet(s: GameState, onDismiss: () -> Unit) {
    // Snapshot taken on opening. Queued toasts keep running behind the sheet and land in the history
    // (as unread) while it is open; showing them live made the sheet grow, and growing during the
    // hide animation made it jitter. They show up, highlighted, the next time it opens.
    val notices = remember { s.noticeHistory.asReversed() }
    // Marked read on opening (the badge clears), but what was unread stays highlighted while the sheet is open.
    val unread = remember { s.unreadNotices }
    LaunchedEffect(Unit) { act { markNoticesRead() } }
    // A fixed ceiling, so a long history scrolls inside the sheet instead of pushing it to the top.
    val maxListHeight = (LocalConfiguration.current.screenHeightDp * 0.6f).dp
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Lif.colors.panel,
    ) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 24.dp)) {
            Text(
                stringResource(R.string.recent_activity),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 8.dp),
            )
            if (notices.isEmpty()) {
                Column(Modifier.padding(horizontal = 20.dp)) { EmptyNote(stringResource(R.string.recent_activity_empty)) }
            } else {
                LazyColumn(
                    Modifier.fillMaxWidth().heightIn(max = maxListHeight),
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(notices, key = { it.id }) { notice ->
                        Panel(background = if (notice.id in unread) Lif.colors.accent.copy(alpha = 0.10f) else Lif.colors.panelHigh) {
                            Text(toastMessage(s, notice), style = MaterialTheme.typography.bodyMedium, color = Lif.colors.text)
                        }
                    }
                }
            }
        }
    }
}
