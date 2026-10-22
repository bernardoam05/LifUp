package com.lifup.app.ui.onboarding

import androidx.compose.material.icons.automirrored.rounded.TrendingDown
import androidx.compose.material.icons.rounded.Block
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Paid
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material3.Icon
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import com.lifup.app.ui.components.Panel
import kotlinx.coroutines.delay
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
import com.lifup.app.domain.Attr
import com.lifup.app.ui.FocusPicker
import com.lifup.app.domain.finishOnboarding
import com.lifup.app.ui.act
import com.lifup.app.ui.components.GhostButton
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.content
import com.lifup.app.ui.settings.rigorName
import com.lifup.app.ui.theme.Lif
import kotlinx.coroutines.launch

@Composable
fun OnboardingScreen() {
    var page by rememberSaveable { mutableIntStateOf(0) }
    var name by rememberSaveable { mutableStateOf("") }
    var rigor by rememberSaveable { mutableStateOf(Rigor.NORMAL) }
    var focus by rememberSaveable { mutableStateOf(emptySet<Attr>()) }
    var block by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val legacy = remember { LegacyImport.readAsyncStorage(context) }
    val notif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val c = Lif.colors

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp)) {
        // Pages slide sideways in the direction of travel.
        AnimatedContent(
            targetState = page,
            transitionSpec = {
                val dir = if (targetState > initialState) 1 else -1
                (slideInHorizontally { it * dir / 3 } + fadeIn()) togetherWith (slideOutHorizontally { -it * dir / 3 } + fadeOut())
            },
            modifier = Modifier.weight(1f),
            label = "onboarding",
        ) { p ->
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                when (p) {
                    0 -> Welcome(legacy != null) {
                        LegacyImport.decodeBackup(legacy!!)?.let { LegacyImport.toState(it, content) }?.let { st ->
                            scope.launch { LifUpApp.store.replace(st); LifUpApp.store.dispatch() }
                        }
                    }
                    1 -> {
                        Spacer(Modifier.height(16.dp))
                        Text(stringResource(R.string.onb_how).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                        val features = listOf(
                            Triple(Icons.Rounded.TaskAlt, c.accent, R.string.onb_f_missions to R.string.onb_f_missions_text),
                            Triple(Icons.Rounded.Warning, c.red, R.string.onb_f_penalty to R.string.onb_f_penalty_text),
                            Triple(Icons.Rounded.Psychology, c.purple, R.string.onb_f_focus to R.string.onb_f_focus_text),
                            Triple(Icons.Rounded.Whatshot, c.gold, R.string.onb_f_boss to R.string.onb_f_boss_text),
                            Triple(Icons.Rounded.AutoAwesome, c.green, R.string.onb_f_shadows to R.string.onb_f_shadows_text),
                        )
                        features.forEachIndexed { i, (icon, color, texts) -> Feature(icon, color, texts.first, texts.second, delayMs = i * 90) }
                    }
                    else -> {
                        Spacer(Modifier.height(16.dp))
                        Text(stringResource(R.string.onb_register).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                        OutlinedTextField(name, { name = it.take(24) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.hunter_name)) }, singleLine = true)
                        Text(stringResource(R.string.difficulty), style = MaterialTheme.typography.titleMedium)
                        Rigor.entries.forEach { r -> RigorCard(r, rigor == r) { rigor = r } }
                        Text(stringResource(R.string.onb_penalty_question), style = MaterialTheme.typography.titleMedium)
                        ConsequenceCard(Icons.Rounded.Block, c.red, R.string.onb_penalty_block, R.string.onb_penalty_block_text, block) { block = true }
                        ConsequenceCard(Icons.AutoMirrored.Rounded.TrendingDown, c.gold, R.string.onb_penalty_cut, R.string.onb_penalty_cut_text, !block) { block = false }
                        if (block) Text(stringResource(R.string.onb_penalty_block_setup), style = MaterialTheme.typography.bodySmall, color = c.muted)
                        Text(stringResource(R.string.attr_focus_question), style = MaterialTheme.typography.titleMedium)
                        FocusPicker(focus, { focus = it })
                        Text(stringResource(R.string.onb_change_later), style = MaterialTheme.typography.bodySmall, color = c.dim)
                    }
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            repeat(3) { i ->
                val w by animateDpAsState(if (i == page) 22.dp else 8.dp, label = "dot")
                Box(Modifier.padding(end = 6.dp).size(width = w, height = 8.dp).clip(CircleShape).background(if (i == page) c.accent else c.border))
            }
            Spacer(Modifier.weight(1f))
            if (page > 0) GhostButton(stringResource(R.string.back), onClick = { page-- })
            Spacer(Modifier.width(8.dp))
            PrimaryButton(stringResource(if (page < 2) R.string.next else R.string.onb_start), onClick = {
                if (page < 2) page++
                else {
                    if (Build.VERSION.SDK_INT >= 33) notif.launch(Manifest.permission.POST_NOTIFICATIONS)
                    val n = name; val r = rigor; val f = focus; val b = block
                    act { finishOnboarding(n, r, f, b) }
                }
            })
        }
    }
}

/** First page: the emblem breathing softly, the promise, and the three things you earn. */
@Composable
private fun Welcome(canImport: Boolean, onImport: () -> Unit) {
    val c = Lif.colors
    val pulse = rememberInfiniteTransition(label = "glow")
    val glow by pulse.animateFloat(0.25f, 0.6f, infiniteRepeatable(tween(1800), RepeatMode.Reverse), label = "alpha")
    val scale by pulse.animateFloat(0.96f, 1.04f, infiniteRepeatable(tween(1800), RepeatMode.Reverse), label = "scale")
    Spacer(Modifier.height(24.dp))
    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(Modifier.size(190.dp).scale(scale).clip(CircleShape).background(Brush.radialGradient(listOf(c.accent.copy(alpha = glow), Color.Transparent))))
        Image(painterResource(R.drawable.ic_launcher_foreground), null, Modifier.size(170.dp))
    }
    Text(stringResource(R.string.onb_welcome).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
    Text(stringResource(R.string.onb_title), style = MaterialTheme.typography.displaySmall)
    Text(stringResource(R.string.onb_intro), style = MaterialTheme.typography.bodyLarge, color = c.muted)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        EarnChip(Icons.Rounded.Bolt, "XP", c.accent)
        EarnChip(Icons.Rounded.Paid, stringResource(R.string.gold), c.gold)
        EarnChip(Icons.Rounded.AutoAwesome, stringResource(R.string.hero_shadows), c.purple)
    }
    if (canImport) GhostButton(stringResource(R.string.import_old_app), onClick = onImport, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.History, color = c.gold)
}

@Composable
private fun EarnChip(icon: ImageVector, label: String, color: Color) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(color.copy(alpha = 0.14f)).padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = color)
    }
}

/** A feature row that fades and slides in a moment after the previous one. */
@Composable
private fun Feature(icon: ImageVector, color: Color, title: Int, text: Int, delayMs: Int) {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(delayMs.toLong()); shown = true }
    AnimatedVisibility(shown, enter = fadeIn(tween(350)) + slideInVertically(tween(350)) { it / 3 }) {
        Row {
            IconBadge(icon, color, 42.dp)
            Spacer(Modifier.width(14.dp))
            Column {
                Text(stringResource(title), style = MaterialTheme.typography.titleMedium)
                Text(stringResource(text), style = MaterialTheme.typography.bodyMedium, color = Lif.colors.muted)
            }
        }
    }
}

/** Difficulty as a card: icon, name and the one line that tells them apart. */
/** One way a failed day can cost you; same look as the difficulty cards above. */
@Composable
private fun ConsequenceCard(icon: ImageVector, color: Color, title: Int, text: Int, selected: Boolean, onClick: () -> Unit) {
    val c = Lif.colors
    Panel(border = if (selected) color else c.border, background = if (selected) color.copy(alpha = 0.08f) else c.panel, onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(icon, color, 40.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(stringResource(title), style = MaterialTheme.typography.titleMedium, color = if (selected) color else c.text)
                Text(stringResource(text), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
            if (selected) Icon(Icons.Rounded.CheckCircle, null, tint = color)
        }
    }
}

@Composable
private fun RigorCard(r: Rigor, selected: Boolean, onClick: () -> Unit) {
    val c = Lif.colors
    val (icon, color, short) = when (r) {
        Rigor.EASY -> Triple(Icons.Rounded.Spa, c.green, R.string.rigor_easy_short)
        Rigor.NORMAL -> Triple(Icons.Rounded.LocalFireDepartment, c.gold, R.string.rigor_normal_short)
        Rigor.HARD -> Triple(Icons.Rounded.Whatshot, c.red, R.string.rigor_hard_short)
    }
    Panel(border = if (selected) color else c.border, background = if (selected) color.copy(alpha = 0.08f) else c.panel, onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(icon, color, 40.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(stringResource(rigorName(r)), style = MaterialTheme.typography.titleMedium, color = if (selected) color else c.text)
                Text(stringResource(short), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
            if (selected) Icon(Icons.Rounded.CheckCircle, null, tint = color)
        }
    }
}
