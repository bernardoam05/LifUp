package com.lifup.app.ui.rewards

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
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
    // Marked read on opening (the badge clears), but what was unread stays highlighted while the sheet is open.
    val unread = remember { s.unreadNotices }
    LaunchedEffect(Unit) { act { markNoticesRead() } }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Lif.colors.panel,
    ) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp).navigationBarsPadding().padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.recent_activity), style = MaterialTheme.typography.titleLarge)
            if (s.noticeHistory.isEmpty()) EmptyNote(stringResource(R.string.recent_activity_empty))
            s.noticeHistory.asReversed().forEach { notice ->
                Panel(background = if (notice.id in unread) Lif.colors.accent.copy(alpha = 0.10f) else Lif.colors.panelHigh) {
                    Text(toastMessage(s, notice), style = MaterialTheme.typography.bodyMedium, color = Lif.colors.text)
                }
            }
        }
    }
}
