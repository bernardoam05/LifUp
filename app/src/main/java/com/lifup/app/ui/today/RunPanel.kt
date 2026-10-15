package com.lifup.app.ui.today

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.DirectionsRun
import androidx.compose.material.icons.rounded.EditNote
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.GpsFixed
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Quest
import com.lifup.app.domain.Tx
import com.lifup.app.domain.finishRun
import com.lifup.app.domain.logDistance
import com.lifup.app.domain.pauseRun
import com.lifup.app.domain.resumeRun
import com.lifup.app.domain.runCheckpoint
import com.lifup.app.domain.startRun
import com.lifup.app.system.AutoTracker
import com.lifup.app.system.GpsService
import com.lifup.app.system.GpsTracker
import com.lifup.app.system.Permissions
import com.lifup.app.ui.act
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.rememberNow
import com.lifup.app.ui.fmtDuration
import com.lifup.app.ui.focus.rememberResumeTick
import com.lifup.app.ui.theme.Lif
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Distance quests: step-counter run (default, no GPS), precise GPS, or logging distance done untracked. */
@Composable
fun RunPanel(s: GameState, q: Quest, tracking: Boolean) {
    val p = Lif.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val gps by GpsTracker.session.collectAsStateWithLifecycle()
    val stepsOk = remember(rememberResumeTick()) { AutoTracker.stepsAvailable(context) }
    val run = s.run?.takeIf { it.questId == q.id }
    var logging by rememberSaveable { mutableStateOf(false) }
    val activity = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val gpsPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted[Manifest.permission.ACCESS_FINE_LOCATION] == true) GpsService.start(context, q.id)
    }

    /** Reads the step counter, then runs [action] with it (null without sensor or permission). */
    fun withSteps(action: Tx.(Long?) -> Unit) = scope.launch {
        val n = AutoTracker.stepCounter(context)
        LifUpApp.store.dispatch { action(n) }
    }

    LaunchedEffect(run?.running) {
        while (run?.running == true) {
            delay(30_000)
            withSteps { n -> n?.let { runCheckpoint(it) } }
        }
    }

    val g = gps?.takeIf { it.questId == q.id }
    when {
        g != null -> {
            Text(
                stringResource(R.string.gps_live, g.km, g.speedKmh) + if (!g.hasFix) " · " + stringResource(R.string.gps_waiting) else "",
                style = MaterialTheme.typography.titleMedium, color = p.green,
            )
            if (g.rejected > 0) Text(stringResource(R.string.gps_rejected, g.rejected), style = MaterialTheme.typography.bodySmall, color = p.gold)
            GhostButton(stringResource(R.string.gps_stop), onClick = { GpsService.stop(context) }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Stop, color = p.red)
        }
        run != null -> {
            val now = rememberNow(1_000)
            Row {
                Text(fmtDuration(run.elapsed(now)), style = MaterialTheme.typography.displaySmall, color = if (run.running) p.green else p.muted, modifier = Modifier.weight(1f))
                Column {
                    Text(stringResource(R.string.run_km, run.km), style = MaterialTheme.typography.titleMedium, color = p.green)
                    Text(stringResource(R.string.run_steps, run.steps), style = MaterialTheme.typography.labelMedium, color = p.muted)
                }
            }
            Text(stringResource(if (run.running) R.string.run_hint_running else R.string.run_hint_paused), style = MaterialTheme.typography.bodySmall, color = p.muted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (run.running) GhostButton(stringResource(R.string.run_pause), onClick = { withSteps { n -> n?.let { pauseRun(it) } } }, modifier = Modifier.weight(1f), icon = Icons.Rounded.Pause)
                else GhostButton(stringResource(R.string.run_resume), onClick = { withSteps { n -> n?.let { resumeRun(it) } } }, modifier = Modifier.weight(1f), icon = Icons.Rounded.PlayArrow, color = p.green)
                PrimaryButton(stringResource(R.string.run_finish), onClick = { withSteps { n -> finishRun(n) } }, modifier = Modifier.weight(1f), icon = Icons.Rounded.Flag, color = p.green)
            }
        }
        !tracking -> Unit
        stepsOk -> {
            PrimaryButton(stringResource(R.string.run_start), onClick = { withSteps { n -> n?.let { startRun(q.id, it) } } }, modifier = Modifier.fillMaxWidth(), icon = Icons.AutoMirrored.Rounded.DirectionsRun, color = p.green)
            Text(stringResource(R.string.run_explain, s.settings.heightCm), style = MaterialTheme.typography.bodySmall, color = p.muted)
        }
        !AutoTracker.hasStepSensor(context) -> Text(stringResource(R.string.run_no_sensor), style = MaterialTheme.typography.bodySmall, color = p.gold)
        else -> PrimaryButton(stringResource(R.string.run_enable_steps), onClick = {
            if (Build.VERSION.SDK_INT >= 29) activity.launch(Manifest.permission.ACTIVITY_RECOGNITION)
        }, modifier = Modifier.fillMaxWidth(), icon = Icons.AutoMirrored.Rounded.DirectionsRun, color = p.green)
    }

    if (g == null && run == null) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (tracking) GhostButton(stringResource(R.string.run_gps), onClick = {
                if (Permissions.location(context)) GpsService.start(context, q.id)
                else gpsPermission.launch(
                    if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.POST_NOTIFICATIONS)
                    else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
                )
            }, modifier = Modifier.weight(1f), icon = Icons.Rounded.GpsFixed)
            GhostButton(stringResource(R.string.run_log), onClick = { logging = true }, modifier = Modifier.weight(1f), icon = Icons.Rounded.EditNote)
        }
    }
    if (logging) LogDistanceDialog(q, onDismiss = { logging = false })
}

@Composable
private fun LogDistanceDialog(q: Quest, onDismiss: () -> Unit) {
    var text by remember { mutableStateOf("") }
    val km = text.replace(',', '.').toDoubleOrNull()?.takeIf { it > 0 && it <= 100 }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.run_log_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.run_log_text), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted)
                OutlinedTextField(text, { text = it.take(6) }, singleLine = true, label = { Text("km") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            }
        },
        confirmButton = {
            TextButton(onClick = { km?.let { act { logDistance(q.id, it) } }; onDismiss() }, enabled = km != null) { Text(stringResource(R.string.run_log_save).uppercase()) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel).uppercase()) } },
        containerColor = Lif.colors.panel,
    )
}

