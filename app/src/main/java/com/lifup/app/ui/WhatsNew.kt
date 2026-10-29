package com.lifup.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.BuildConfig
import com.lifup.app.R
import com.lifup.app.system.Updater
import com.lifup.app.ui.theme.Lif

/** On the first launch after an update, the release's notes, one change per line; waits for the crash prompt. */
@Composable
fun WhatsNew() {
    val context = LocalContext.current
    var notes by remember { mutableStateOf<String?>(null) }
    val lang = lang()
    LaunchedEffect(Unit) { notes = Updater.whatsNew(context, lang) }
    val text = notes ?: return
    if (CrashUi.report != null) return
    val close = { Updater.seenWhatsNew(context); notes = null }
    val lines = text.lines().map { it.trim() }.filter { it.isNotEmpty() }
    AlertDialog(
        onDismissRequest = close,
        containerColor = Lif.colors.panel,
        title = { Text(stringResource(R.string.whats_new_title, BuildConfig.VERSION_NAME)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                lines.forEach { line ->
                    val bullet = line.startsWith("- ") || line.startsWith("* ")
                    Row {
                        if (bullet) Text("•  ", color = Lif.colors.accent, style = MaterialTheme.typography.bodyMedium)
                        Text(if (bullet) line.drop(2) else line, color = Lif.colors.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = close) { Text(stringResource(R.string.whats_new_ok).uppercase()) } },
    )
}
