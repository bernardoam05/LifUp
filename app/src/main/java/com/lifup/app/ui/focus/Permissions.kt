package com.lifup.app.ui.focus

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.updateSettings
import com.lifup.app.system.InstalledApp
import com.lifup.app.system.Permissions
import com.lifup.app.ui.act
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.theme.Lif
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Re-evaluates permission checks every time the screen resumes (users come back from Settings). */
@Composable
fun rememberResumeTick(): Int {
    var tick by remember { mutableIntStateOf(0) }
    LifecycleResumeEffect(Unit) {
        tick++
        onPauseOrDispose { }
    }
    return tick
}

@Composable
fun PermissionsPanel(s: GameState, startExpanded: Boolean = false) {
    val context = LocalContext.current
    val tick = rememberResumeTick()
    val notif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val activity = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val rows = remember(tick) {
        listOf(
            Triple(R.string.perm_usage, Permissions.usageAccess(context)) { Permissions.openUsageAccess(context); Unit },
            Triple(R.string.perm_overlay, Permissions.overlay(context)) { Permissions.openOverlay(context); Unit },
            Triple(R.string.perm_accessibility, Permissions.accessibility(context)) { Permissions.openAccessibility(context); Unit },
            Triple(R.string.perm_battery, Permissions.batteryUnrestricted(context)) { Permissions.openBattery(context) },
            Triple(R.string.perm_alarms, Permissions.exactAlarms(context)) { Permissions.openExactAlarms(context) },
            Triple(R.string.perm_notifications, Permissions.notifications(context)) {
                if (Build.VERSION.SDK_INT >= 33) notif.launch(Manifest.permission.POST_NOTIFICATIONS)
            },
            Triple(R.string.perm_activity, Permissions.activity(context)) {
                if (Build.VERSION.SDK_INT >= 29) activity.launch(Manifest.permission.ACTIVITY_RECOGNITION)
            },
        )
    }
    val missing = rows.count { !it.second }
    var expanded by rememberSaveable { mutableStateOf(startExpanded) }
    SectionTitle(stringResource(R.string.permissions)) {
        Text(if (missing == 0) stringResource(R.string.perm_all_ok) else stringResource(R.string.perm_missing, missing), color = if (missing == 0) Lif.colors.green else Lif.colors.gold, style = MaterialTheme.typography.labelMedium)
    }
    Panel(onClick = { expanded = !expanded }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.perm_explain), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted, modifier = Modifier.weight(1f))
            Icon(if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = Lif.colors.muted)
        }
        if (expanded || missing > 0) {
            rows.forEach { (label, ok, fix) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (ok) Icons.Rounded.CheckCircle else Icons.Rounded.ErrorOutline, null, tint = if (ok) Lif.colors.green else Lif.colors.gold, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(label), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    if (!ok) TextButton(onClick = fix) { Text(stringResource(R.string.fix).uppercase()) }
                }
            }
            if (!Permissions.accessibility(context) && Permissions.sideloaded(context)) {
                Text(stringResource(R.string.perm_restricted_hint), style = MaterialTheme.typography.bodySmall, color = Lif.colors.gold, modifier = Modifier.padding(top = 4.dp))
                TextButton(onClick = { Permissions.openAppDetails(context) }) { Text(stringResource(R.string.open_app_info).uppercase()) }
            }
            TextButton(onClick = { Permissions.openAutostart(context) }) { Text(stringResource(R.string.perm_autostart).uppercase()) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppPickerSheet(current: List<String>, onDismiss: () -> Unit) {
    val context = LocalContext.current
    var apps by remember { mutableStateOf<List<InstalledApp>?>(null) }
    val chosen = remember { mutableStateListOf<String>().apply { addAll(current) } }
    var query by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { apps = withContext(Dispatchers.IO) { Permissions.installedApps(context) } }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Lif.colors.panel) {
        Column(Modifier.padding(horizontal = 16.dp).navigationBarsPadding()) {
            Text(stringResource(R.string.choose_apps), style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), singleLine = true, leadingIcon = { Icon(Icons.Rounded.Search, null) }, placeholder = { Text(stringResource(R.string.search)) })
            val list = apps
            if (list == null) {
                CircularProgressIndicator(Modifier.padding(32.dp).align(Alignment.CenterHorizontally))
            } else {
                val filtered = list.filter { query.isBlank() || it.label.contains(query, ignoreCase = true) }
                    .sortedByDescending { it.pkg in chosen }
                LazyColumn(Modifier.weight(1f, fill = false).height(420.dp)) {
                    items(filtered, key = { it.pkg }) { app ->
                        Row(
                            Modifier.fillMaxWidth().clickable { if (app.pkg in chosen) chosen.remove(app.pkg) else chosen.add(app.pkg) }.padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(checked = app.pkg in chosen, onCheckedChange = null)
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text(app.label, style = MaterialTheme.typography.bodyLarge)
                                Text(app.pkg, style = MaterialTheme.typography.bodySmall, color = Lif.colors.dim)
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            PrimaryButton(stringResource(R.string.save_n, chosen.size), onClick = {
                val result = chosen.toList()
                act { updateSettings { it.copy(blockedApps = result) } }
                onDismiss()
            }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
        }
    }
}
