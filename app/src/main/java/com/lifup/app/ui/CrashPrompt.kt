package com.lifup.app.ui

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.lifup.app.R
import com.lifup.app.system.CrashLog
import com.lifup.app.ui.theme.Lif

/** After a crash, offers once to share the report; it stays available in Settings until deleted. */
@Composable
fun CrashPrompt() {
    val context = LocalContext.current
    var report by remember { mutableStateOf(CrashLog.read(context)?.takeIf { !CrashSeen.shown }) }
    val text = report ?: return
    val close = { CrashSeen.shown = true; report = null }
    AlertDialog(
        onDismissRequest = close,
        containerColor = Lif.colors.panel,
        title = { Text(stringResource(R.string.crash_title)) },
        text = { Text(stringResource(R.string.crash_text), color = Lif.colors.muted) },
        confirmButton = { TextButton(onClick = { CrashLog.share(context, text); CrashLog.clear(context); close() }) { Text(stringResource(R.string.crash_share).uppercase()) } },
        dismissButton = { TextButton(onClick = close) { Text(stringResource(R.string.later).uppercase(), color = Lif.colors.muted) } },
    )
}

/** Shown at most once per process. */
private object CrashSeen { var shown = false }
