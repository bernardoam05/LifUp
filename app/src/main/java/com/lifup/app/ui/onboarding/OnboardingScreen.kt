package com.lifup.app.ui.onboarding

import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.TextButton
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.DrawGroup
import com.lifup.app.domain.QuestDef
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.drawGroup
import com.lifup.app.domain.isWeekly
import com.lifup.app.ui.color
import com.lifup.app.ui.familyName
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.icon
import com.lifup.app.ui.local
import com.lifup.app.ui.unitLabel
import androidx.compose.foundation.layout.imePadding
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
    // What the player wants to work on: families left out and missions taken off start switched off in the Forge.
    val all = remember { content.quests.filter { !it.retired && !it.optional && !it.isWeekly() && (it.kind == DefKind.CORE || it.kind == DefKind.POOL) } }
    var families by rememberSaveable { mutableStateOf(DrawGroup.entries.toSet()) }
    var removed by rememberSaveable { mutableStateOf(emptySet<String>()) }
    var fixed by rememberSaveable { mutableStateOf<String?>(null) }
    val kept = all.filter { it.drawGroup() in families && it.id !in removed }
    // The everyday mission: one a tap can settle, with no permission or hour attached.
    val fixable = kept.filter { it.auto == null && it.fromHour == null && it.type != QuestType.LIMIT && it.type != QuestType.FORBIDDEN }
    val fixedDef = fixable.firstOrNull { it.id == fixed } ?: fixable.firstOrNull { it.kind == DefKind.CORE } ?: fixable.firstOrNull()
    val poolLeft = kept.count { it.kind == DefKind.POOL && it.id != fixedDef?.id }
    val ready = fixedDef != null && poolLeft >= MIN_POOL
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val legacy = remember { LegacyImport.readAsyncStorage(context) }
    val notif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val c = Lif.colors

    Column(Modifier.fillMaxSize().statusBarsPadding().imePadding().navigationBarsPadding().padding(24.dp)) {
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
                        Text(stringResource(R.string.onb_register).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                        OutlinedTextField(name, { name = it.take(24) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.hunter_name)) }, singleLine = true)
                        Text(stringResource(R.string.difficulty), style = MaterialTheme.typography.titleMedium)
                        Rigor.entries.forEach { r -> RigorCard(r, rigor == r) { rigor = r } }
                        Text(stringResource(R.string.onb_penalty_note), style = MaterialTheme.typography.bodySmall, color = c.muted)
                        Text(stringResource(R.string.onb_change_later), style = MaterialTheme.typography.bodySmall, color = c.dim)
                    }
                    else -> {
                        Spacer(Modifier.height(16.dp))
                        Text(stringResource(R.string.onb_missions).uppercase(), style = MaterialTheme.typography.titleSmall, color = c.accent)
                        Text(stringResource(R.string.onb_areas_q), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.onb_areas_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
                        DrawGroup.entries.forEach { g ->
                            val defs = all.filter { it.drawGroup() == g }
                            if (defs.isNotEmpty()) FamilyCard(
                                g, defs, g in families, removed,
                                // Two areas at least, so the daily draw has something to balance.
                                onToggle = { if (g !in families) families = families + g else if (families.size > 2) families = families - g },
                                onMission = { id -> removed = if (id in removed) removed - id else removed + id },
                            )
                        }
                        Text(stringResource(R.string.onb_fixed), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.onb_fixed_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
                        if (fixedDef != null) FixedHabit(fixedDef, fixable) { fixed = it }
                        if (!ready) Text(stringResource(R.string.onb_too_few, MIN_POOL), style = MaterialTheme.typography.bodySmall, color = c.red)
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
            PrimaryButton(stringResource(if (page < 2) R.string.next else R.string.onb_start), enabled = page < 2 || ready, onClick = {
                if (page < 2) page++
                else {
                    if (Build.VERSION.SDK_INT >= 33) notif.launch(Manifest.permission.POST_NOTIFICATIONS)
                    val n = name; val r = rigor
                    val off = all.filter { it !in kept }.map { it.id }.toSet()
                    val habit = fixedDef?.id
                    act { finishOnboarding(n, r, off = off, fixed = habit) }
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
        com.lifup.app.ui.components.CoreAvatar(1, com.lifup.app.domain.CoreMood.HAPPY, 170.dp)
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

/** Pool missions that must stay on for the daily draw to have a choice. */
private const val MIN_POOL = 6

@Composable
private fun defDetail(def: QuestDef) = def.description.local().replace("{target}", fmtNum(def.baseTarget)).replace("{unit}", unitLabel(def.unit))

/** One area: on or off as a whole, and its missions one by one for whoever wants to take some off. */
@Composable
private fun FamilyCard(g: DrawGroup, defs: List<QuestDef>, selected: Boolean, removed: Set<String>, onToggle: () -> Unit, onMission: (String) -> Unit) {
    val c = Lif.colors
    val color = defs.first().color(c)
    var open by rememberSaveable(g) { mutableStateOf(false) }
    Panel(border = if (selected) color else c.border, background = if (selected) color.copy(alpha = 0.08f) else c.panel, onClick = onToggle) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(defs.first().icon(), if (selected) color else c.dim, 40.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(stringResource(familyName(g)), style = MaterialTheme.typography.titleMedium, color = if (selected) color else c.dim)
                if (selected) Text(
                    stringResource(R.string.onb_family_count, defs.count { it.id !in removed }, defs.size),
                    style = MaterialTheme.typography.bodySmall, color = c.muted,
                )
            }
            if (selected) TextButton(onClick = { open = !open }) { Text(stringResource(if (open) R.string.onb_review_close else R.string.onb_review).uppercase(), color = c.muted) }
            if (selected) Icon(Icons.Rounded.CheckCircle, null, tint = color)
        }
        if (selected && open) Column(Modifier.padding(top = 8.dp)) {
            defs.forEach { def ->
                val on = def.id !in removed
                Row(Modifier.fillMaxWidth().clickable { onMission(def.id) }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = on, onCheckedChange = null)
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(def.title.local(), style = MaterialTheme.typography.bodyLarge, color = if (on) c.text else c.dim)
                        Text(defDetail(def), style = MaterialTheme.typography.bodySmall, color = if (on) c.muted else c.dim)
                    }
                }
            }
        }
    }
}

/** The mission that comes up every day, and a list to pick another. */
@Composable
private fun FixedHabit(def: QuestDef, options: List<QuestDef>, onPick: (String) -> Unit) {
    val c = Lif.colors
    var picking by rememberSaveable { mutableStateOf(false) }
    Panel(border = c.accent, onClick = { picking = true }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(def.icon(), def.color(c), 40.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(def.title.local(), style = MaterialTheme.typography.titleMedium)
                Text(defDetail(def), style = MaterialTheme.typography.bodySmall, color = c.muted)
            }
            Text(stringResource(R.string.onb_change).uppercase(), style = MaterialTheme.typography.labelLarge, color = c.accent)
        }
    }
    if (picking) AlertDialog(
        onDismissRequest = { picking = false },
        containerColor = c.panel,
        title = { Text(stringResource(R.string.onb_fixed)) },
        text = {
            LazyColumn(Modifier.height(380.dp)) {
                items(options, key = { it.id }) { o ->
                    Row(Modifier.fillMaxWidth().clickable { onPick(o.id); picking = false }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(o.icon(), o.color(c), 32.dp)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(o.title.local(), style = MaterialTheme.typography.bodyLarge, color = if (o.id == def.id) c.accent else c.text)
                            Text(defDetail(o), style = MaterialTheme.typography.bodySmall, color = c.muted)
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { picking = false }) { Text(stringResource(R.string.back).uppercase(), color = c.muted) } },
    )
}

/** Difficulty as a card: icon, name and the one line that tells them apart. */
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
