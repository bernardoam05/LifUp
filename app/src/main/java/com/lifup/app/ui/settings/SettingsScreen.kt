package com.lifup.app.ui.settings

import com.lifup.app.domain.daysToNextMission
import com.lifup.app.domain.drawnCount
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.foundation.clickable
import androidx.compose.animation.AnimatedVisibility
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Build
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.BuildConfig
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.data.Backup
import com.lifup.app.data.LegacyImport
import com.lifup.app.domain.GameState
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.Rigor
import com.lifup.app.domain.Rules
import com.lifup.app.domain.rename
import com.lifup.app.domain.setBlockOnPenalty
import com.lifup.app.domain.updateSettings
import com.lifup.app.system.Permissions
import com.lifup.app.ui.LocalSnackbar
import com.lifup.app.ui.accentRank
import com.lifup.app.ui.act
import com.lifup.app.ui.components.ConfirmDialog
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.components.Stepper
import com.lifup.app.ui.content
import com.lifup.app.ui.focus.ToggleRow
import com.lifup.app.ui.gameState
import com.lifup.app.ui.theme.Lif
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen(onBack: () -> Unit, openForge: () -> Unit) {
    val s = gameState()
    val set = s.settings
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf<String?>(null) }
    var confirmReset by rememberSaveable { mutableStateOf(false) }
    var pendingImport by remember { mutableStateOf<GameState?>(null) }
    var pasteOpen by rememberSaveable { mutableStateOf(false) }
    val okMsg = stringResource(R.string.backup_saved)
    val badMsg = stringResource(R.string.backup_invalid)

    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val ok = withContext(Dispatchers.IO) {
                runCatching { context.contentResolver.openOutputStream(uri)?.use { it.write(Backup.export(LifUpApp.store.current).toByteArray()) } }.isSuccess
            }
            message = if (ok) okMsg else badMsg
        }
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val text = withContext(Dispatchers.IO) { runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes().decodeToString() } }.getOrNull() }
            pendingImport = text?.let { Backup.import(it, content) }
            if (pendingImport == null) message = badMsg
        }
    }

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(4.dp)) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back)) }
            Text(stringResource(R.string.settings), style = MaterialTheme.typography.titleLarge)
        }
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).navigationBarsPadding()) {
            message?.let { Text(it, color = Lif.colors.accent, style = MaterialTheme.typography.labelLarge) }

            SectionTitle(stringResource(R.string.profile))
            var name by remember { mutableStateOf(s.player.name) }
            OutlinedTextField(
                name, { v -> name = v.take(24); val n = name; act { rename(n) } },
                label = { Text(stringResource(R.string.hunter_name)) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            )

            SectionTitle(stringResource(R.string.difficulty)) { com.lifup.app.ui.guide.InfoButton(com.lifup.app.ui.guide.Guide.STREAK) }
            Panel {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    Rigor.entries.forEachIndexed { i, r ->
                        SegmentedButton(selected = set.rigor == r, onClick = { act { updateSettings { it.copy(rigor = r) } } }, shape = SegmentedButtonDefaults.itemShape(i, 3)) {
                            Text(stringResource(rigorName(r)))
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(stringResource(rigorInfo(set.rigor)), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
                Spacer(Modifier.height(8.dp))
                val auto = set.dailyPoolOverride == null
                val autoCount = s.copy(settings = set.copy(dailyPoolOverride = null)).drawnCount()
                val next = s.copy(settings = set.copy(dailyPoolOverride = null)).daysToNextMission()
                ToggleRow(
                    stringResource(R.string.auto_missions),
                    stringResource(R.string.auto_missions_info, autoCount) + " " +
                        (next?.let { stringResource(R.string.load_next, it, Rules.MAX_DAY_MISSIONS) } ?: stringResource(R.string.load_max, Rules.MAX_DAY_MISSIONS)),
                    auto,
                ) { on -> act { updateSettings { it.copy(dailyPoolOverride = if (on) null else autoCount) } } }
                if (!auto) Stepper(set.dailyPoolOverride!!, { v -> act { updateSettings { it.copy(dailyPoolOverride = v) } } }, 1..10, stringResource(R.string.extra_daily_missions))
                Spacer(Modifier.height(12.dp))
                Text(stringResource(R.string.attr_focus_title), style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(4.dp))
                com.lifup.app.ui.FocusPicker(set.focusAttrs) { f -> act { updateSettings { it.copy(focusAttrs = f) } } }
            }

            FoldSection(stringResource(R.string.penalties), trailing = { com.lifup.app.ui.guide.InfoButton(com.lifup.app.ui.guide.Guide.PENALTY) }) {
                Panel {
                    com.lifup.app.ui.guide.PenaltyBlockToggle(s)
                    ToggleRow(stringResource(R.string.side_penalize), stringResource(R.string.side_penalize_info), set.sidePenalize) { v ->
                        act { updateSettings { it.copy(sidePenalize = v) } }
                    }
                }
            }

            FoldSection(stringResource(R.string.body)) {
                Panel {
                    Stepper(set.heightCm, { v -> act { updateSettings { it.copy(heightCm = v) } } }, 120..220, stringResource(R.string.height), " cm", step = 2)
                    Text(stringResource(R.string.height_info), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
                }
            }

            com.lifup.app.ui.focus.PermissionsPanel(s)

            FoldSection(stringResource(R.string.notifications)) {
                Panel {
                    ToggleRow(stringResource(R.string.notifications), stringResource(R.string.notifications_info), set.notifications) { v -> act { updateSettings { it.copy(notifications = v) } } }
                    if (set.notifications) Stepper(set.reminderHour, { v -> act { updateSettings { it.copy(reminderHour = v) } } }, 12..23, stringResource(R.string.reminder_hour), "h")
                    ToggleRow(stringResource(R.string.sound), stringResource(R.string.sound_info), set.sound) { v -> act { updateSettings { it.copy(sound = v) } } }
                    ToggleRow(stringResource(R.string.vibration), stringResource(R.string.vibration_info), set.vibration) { v -> act { updateSettings { it.copy(vibration = v) } } }
                }
            }

            FoldSection(stringResource(R.string.theme)) {
                Panel {
                    val current = HunterRank.of(s.player.level)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = set.themeRank == null, onClick = { act { updateSettings { it.copy(themeRank = null) } } }, label = { Text(stringResource(R.string.theme_auto)) })
                        HunterRank.entries.filter { it.ordinal <= current.ordinal }.forEach { r ->
                            FilterChip(selected = set.themeRank == r, onClick = { act { updateSettings { it.copy(themeRank = r) } } }, label = { Text(r.label, color = accentRank(r)) })
                        }
                    }
                    Text(stringResource(R.string.theme_info), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
                }
            }

            SectionTitle(stringResource(R.string.missions))
            GhostButton(stringResource(R.string.forge), onClick = openForge, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Build)

            FoldSection(stringResource(R.string.backup)) {
                Panel {
                    Text(stringResource(R.string.backup_info), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GhostButton(stringResource(R.string.export), onClick = { exporter.launch("lifup-backup.json") }, modifier = Modifier.weight(1f), icon = Icons.Rounded.Upload)
                        GhostButton(stringResource(R.string.import_), onClick = { importer.launch(arrayOf("application/json", "text/plain", "*/*")) }, modifier = Modifier.weight(1f), icon = Icons.Rounded.Download)
                    }
                    TextButton(onClick = { pasteOpen = true }) { Text(stringResource(R.string.paste_old_backup).uppercase()) }
                    AutoBackups { pendingImport = it }
                    val legacy = remember { LegacyImport.readAsyncStorage(context) }
                    if (legacy != null) {
                        GhostButton(stringResource(R.string.import_old_app), onClick = {
                            pendingImport = LegacyImport.decodeBackup(legacy)?.let { LegacyImport.toState(it, content) }
                        }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.History)
                    }
                }
            }

            CrashReportRow()

            Spacer(Modifier.height(12.dp))
            com.lifup.app.ui.guide.GuideList(s)

            SectionTitle(stringResource(R.string.about))
            Text(stringResource(R.string.version, BuildConfig.VERSION_NAME), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
            TextButton(onClick = { confirmReset = true }) { Text(stringResource(R.string.reset_progress).uppercase(), color = Lif.colors.red) }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (confirmReset) ConfirmDialog(
        stringResource(R.string.reset_progress), stringResource(R.string.reset_text), stringResource(R.string.reset_confirm),
        onConfirm = { scope.launch { LifUpApp.store.replace(GameState()); LifUpApp.store.dispatch() } },
        onDismiss = { confirmReset = false }, danger = true,
    )
    pendingImport?.let { imported ->
        ConfirmDialog(
            stringResource(R.string.import_), stringResource(R.string.import_confirm_text, imported.player.level, imported.shadows.size), stringResource(R.string.import_),
            onConfirm = { scope.launch { LifUpApp.store.replace(imported); LifUpApp.store.dispatch() } },
            onDismiss = { pendingImport = null }, danger = true,
        )
    }
    if (pasteOpen) {
        var text by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { pasteOpen = false },
            containerColor = Lif.colors.panel,
            title = { Text(stringResource(R.string.paste_old_backup)) },
            text = { OutlinedTextField(text, { text = it }, Modifier.fillMaxWidth().height(160.dp)) },
            confirmButton = {
                TextButton(onClick = {
                    pendingImport = Backup.import(text, content)
                    if (pendingImport == null) message = badMsg
                    pasteOpen = false
                }) { Text(stringResource(R.string.import_).uppercase()) }
            },
            dismissButton = { TextButton(onClick = { pasteOpen = false }) { Text(stringResource(R.string.cancel).uppercase()) } },
        )
    }
}

fun rigorName(r: Rigor) = when (r) { Rigor.EASY -> R.string.rigor_easy; Rigor.NORMAL -> R.string.rigor_normal; Rigor.HARD -> R.string.rigor_hard }
fun rigorInfo(r: Rigor) = when (r) { Rigor.EASY -> R.string.rigor_easy_info; Rigor.NORMAL -> R.string.rigor_normal_info; Rigor.HARD -> R.string.rigor_hard_info }

/** Daily copies kept by the app; restoring one goes through the usual import confirmation. */
@Composable
private fun AutoBackups(onRestore: (GameState) -> Unit) {
    val entries = remember { LifUpApp.store.snapshots.list() }
    Spacer(Modifier.height(8.dp))
    Text(stringResource(R.string.auto_backups), style = MaterialTheme.typography.titleSmall)
    Text(stringResource(R.string.auto_backups_info), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
    if (entries.isEmpty()) Text(stringResource(R.string.auto_backups_none), style = MaterialTheme.typography.bodySmall, color = Lif.colors.dim)
    entries.forEach { e ->
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(java.time.LocalDate.parse(e.day).format(java.time.format.DateTimeFormatter.ofLocalizedDate(java.time.format.FormatStyle.MEDIUM)), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            TextButton(onClick = { LifUpApp.store.readSnapshot(e.file)?.let(onRestore) }) { Text(stringResource(R.string.restore).uppercase()) }
        }
    }
}

/** The last crash report, if any, until the user shares or deletes it. */
@Composable
private fun CrashReportRow() {
    val context = LocalContext.current
    var report by remember { mutableStateOf(com.lifup.app.system.CrashLog.read(context)) }
    val text = report ?: return
    SectionTitle(stringResource(R.string.crash_title))
    Panel(border = Lif.colors.red.copy(alpha = 0.5f)) {
        Text(stringResource(R.string.crash_text), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { com.lifup.app.system.CrashLog.share(context, text) }) { Text(stringResource(R.string.crash_share).uppercase()) }
            TextButton(onClick = { com.lifup.app.system.CrashLog.clear(context); report = null }) { Text(stringResource(R.string.delete).uppercase(), color = Lif.colors.red) }
        }
    }
}

/** A settings group that opens on tap, so the page reads as a short list of topics. */
@Composable
private fun FoldSection(title: String, trailing: @Composable () -> Unit = {}, content: @Composable () -> Unit) {
    var open by rememberSaveable(title) { mutableStateOf(false) }
    SectionTitle(title, Modifier.clickable { open = !open }) {
        trailing()
        Icon(if (open) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = Lif.colors.muted)
    }
    AnimatedVisibility(open) { Column { content() } }
}
