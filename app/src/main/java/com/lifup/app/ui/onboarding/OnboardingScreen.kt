package com.lifup.app.ui.onboarding

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.data.LegacyImport
import com.lifup.app.domain.Rigor
import com.lifup.app.domain.finishOnboarding
import com.lifup.app.ui.act
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.content
import com.lifup.app.ui.settings.rigorInfo
import com.lifup.app.ui.settings.rigorName
import com.lifup.app.ui.theme.Lif
import kotlinx.coroutines.launch

@Composable
fun OnboardingScreen() {
    var page by rememberSaveable { mutableIntStateOf(0) }
    var name by rememberSaveable { mutableStateOf("") }
    var rigor by rememberSaveable { mutableStateOf(Rigor.NORMAL) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val legacy = remember { LegacyImport.readAsyncStorage(context) }
    val notif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val c = Lif.colors

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp)) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Spacer(Modifier.height(24.dp))
            when (page) {
                0 -> {
                    Text(stringResource(R.string.onb_welcome).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                    Text(stringResource(R.string.onb_title), style = MaterialTheme.typography.displaySmall)
                    Text(stringResource(R.string.onb_intro), style = MaterialTheme.typography.bodyLarge, color = c.muted)
                    if (legacy != null) GhostButton(stringResource(R.string.import_old_app), onClick = {
                        LegacyImport.decodeBackup(legacy)?.let { LegacyImport.toState(it, content) }?.let { st ->
                            scope.launch { LifUpApp.store.replace(st); LifUpApp.store.dispatch() }
                        }
                    }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.History, color = c.gold)
                }
                1 -> {
                    Text(stringResource(R.string.onb_how).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                    Feature(Icons.Rounded.TaskAlt, c.accent, R.string.onb_f_missions, R.string.onb_f_missions_text)
                    Feature(Icons.Rounded.Warning, c.red, R.string.onb_f_penalty, R.string.onb_f_penalty_text)
                    Feature(Icons.Rounded.Psychology, c.purple, R.string.onb_f_focus, R.string.onb_f_focus_text)
                    Feature(Icons.Rounded.Whatshot, c.gold, R.string.onb_f_boss, R.string.onb_f_boss_text)
                    Feature(Icons.Rounded.AutoAwesome, c.green, R.string.onb_f_shadows, R.string.onb_f_shadows_text)
                }
                else -> {
                    Text(stringResource(R.string.onb_register).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                    OutlinedTextField(name, { name = it.take(24) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.hunter_name)) }, singleLine = true)
                    Text(stringResource(R.string.difficulty), style = MaterialTheme.typography.titleMedium)
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        Rigor.entries.forEachIndexed { i, r ->
                            SegmentedButton(selected = rigor == r, onClick = { rigor = r }, shape = SegmentedButtonDefaults.itemShape(i, 3)) { Text(stringResource(rigorName(r))) }
                        }
                    }
                    Text(stringResource(rigorInfo(rigor)), style = MaterialTheme.typography.bodyMedium, color = c.muted)
                    Text(stringResource(R.string.onb_change_later), style = MaterialTheme.typography.bodySmall, color = c.dim)
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            repeat(3) { i -> Box(Modifier.padding(end = 6.dp).size(8.dp).clip(CircleShape).background(if (i == page) c.accent else c.border)) }
            Spacer(Modifier.weight(1f))
            if (page > 0) GhostButton(stringResource(R.string.back), onClick = { page-- })
            Spacer(Modifier.width(8.dp))
            PrimaryButton(stringResource(if (page < 2) R.string.next else R.string.onb_start), onClick = {
                if (page < 2) page++
                else {
                    if (Build.VERSION.SDK_INT >= 33) notif.launch(Manifest.permission.POST_NOTIFICATIONS)
                    val n = name; val r = rigor
                    act { finishOnboarding(n, r) }
                }
            })
        }
    }
}

@Composable
private fun Feature(icon: ImageVector, color: androidx.compose.ui.graphics.Color, title: Int, text: Int) {
    Row {
        IconBadge(icon, color, 42.dp)
        Spacer(Modifier.width(14.dp))
        Column {
            Text(stringResource(title), style = MaterialTheme.typography.titleMedium)
            Text(stringResource(text), style = MaterialTheme.typography.bodyMedium, color = Lif.colors.muted)
        }
    }
}
