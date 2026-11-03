package com.lifup.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Build
import androidx.compose.material.icons.rounded.NewReleases
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.lifup.app.BuildConfig
import com.lifup.app.R
import com.lifup.app.domain.NoteKind
import com.lifup.app.domain.NoteLine
import com.lifup.app.domain.VersionNotes
import com.lifup.app.system.ReleaseNotes
import com.lifup.app.system.Updater
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.theme.Lif

/**
 * On the first launch after an update, the notes of every release since the last ones seen (a skipped update
 * isn't missed); waits for the crash prompt.
 */
@Composable
fun WhatsNew() {
    val context = LocalContext.current
    var notes by remember { mutableStateOf<List<VersionNotes>>(emptyList()) }
    val lang = lang()
    LaunchedEffect(Unit) { notes = Updater.whatsNew(context, lang) }
    if (notes.isEmpty() || CrashUi.report != null) return
    val close = { Updater.seenWhatsNew(context); notes = emptyList() }
    AlertDialog(
        onDismissRequest = close,
        containerColor = Lif.colors.panel,
        icon = { IconBadge(Icons.Rounded.NewReleases, Lif.colors.accent) },
        title = { Text(stringResource(R.string.whats_new_title, BuildConfig.VERSION_NAME)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                notes.forEach { VersionBlock(it, showHeader = notes.size > 1) }
            }
        },
        confirmButton = { TextButton(onClick = close) { Text(stringResource(R.string.whats_new_ok).uppercase()) } },
    )
}

/** Every release's notes bundled with the app, newest first; opened from Settings → About. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PatchNotesSheet(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val lang = lang()
    val all = remember(lang) { ReleaseNotes.all(context, lang) }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Lif.colors.panel) {
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.patch_notes), style = MaterialTheme.typography.titleLarge)
            if (all.isEmpty()) Text(stringResource(R.string.patch_notes_none), style = MaterialTheme.typography.bodyMedium, color = Lif.colors.muted)
            all.forEach { v -> Panel { VersionBlock(v, showHeader = true) } }
        }
    }
}

/** A release: its number (marked when it's the one running), then one row per change. */
@Composable
private fun VersionBlock(v: VersionNotes, showHeader: Boolean) {
    val c = Lif.colors
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (showHeader) Row(verticalAlignment = Alignment.CenterVertically) {
            Text("v${v.version}", style = MaterialTheme.typography.titleMedium, color = c.text, fontWeight = FontWeight.Bold)
            if (v.version == BuildConfig.VERSION_NAME) {
                Spacer(Modifier.width(8.dp))
                Pill(stringResource(R.string.patch_notes_current), c.accent)
            }
        }
        v.lines.forEach { NoteRow(it) }
    }
}

/** A change with an icon for what kind it is, its first sentence as a headline and the details muted under it. */
@Composable
private fun NoteRow(line: NoteLine) {
    val c = Lif.colors
    val (icon, color) = noteStyle(line.kind)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        IconBadge(icon, color, size = 30.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f).padding(top = 4.dp)) {
            Text(line.lead, style = MaterialTheme.typography.bodyMedium, color = c.text, fontWeight = FontWeight.SemiBold)
            if (line.rest.isNotEmpty()) Text(line.rest, style = MaterialTheme.typography.bodySmall, color = c.muted, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun noteStyle(kind: NoteKind): Pair<androidx.compose.ui.graphics.vector.ImageVector, Color> {
    val c = Lif.colors
    return when (kind) {
        NoteKind.NEW -> Icons.Rounded.AutoAwesome to c.accent
        NoteKind.FIX -> Icons.Rounded.Build to c.green
        NoteKind.TWEAK -> Icons.Rounded.Tune to c.gold
        NoteKind.OTHER -> Icons.Rounded.NewReleases to c.purple
    }
}
