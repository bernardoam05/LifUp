package com.lifup.app.ui.guide

import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.DirectionsRun
import androidx.compose.material.icons.automirrored.rounded.HelpOutline
import androidx.compose.material.icons.automirrored.rounded.TrendingDown
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AllInclusive
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Backpack
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Checklist
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Coffee
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.HourglassBottom
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.KeyboardDoubleArrowUp
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Paid
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Restore
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.Upgrade
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.theme.Lif

enum class Tone { ACCENT, RED, GOLD, PURPLE }

/**
 * Short explanations of each game system, reachable from a "?" next to it and from Settings.
 * [body] holds one point per line as "Lead::text"; [points] gives each line its icon.
 */
enum class Guide(val title: Int, val hook: Int, val body: Int, val icon: ImageVector, val tone: Tone, val points: List<ImageVector>) {
    DAILY(R.string.guide_daily_title, R.string.guide_daily_hook, R.string.guide_daily, Icons.Rounded.TaskAlt, Tone.ACCENT,
        listOf(Icons.Rounded.Flag, Icons.AutoMirrored.Rounded.TrendingUp, Icons.Rounded.AutoAwesome, Icons.Rounded.SwapHoriz)),
    STREAK(R.string.guide_streak_title, R.string.guide_streak_hook, R.string.guide_streak, Icons.Rounded.LocalFireDepartment, Tone.RED,
        listOf(Icons.Rounded.LocalFireDepartment, Icons.Rounded.Restore, Icons.Rounded.Bedtime, Icons.Rounded.Shield)),
    PENALTY(R.string.guide_penalty_title, R.string.guide_penalty_hook, R.string.guide_penalty, Icons.Rounded.Warning, Tone.RED,
        listOf(Icons.AutoMirrored.Rounded.TrendingDown, Icons.Rounded.Timer, Icons.Rounded.Block)),
    SIDE(R.string.guide_side_title, R.string.guide_side_hook, R.string.guide_side, Icons.Rounded.Checklist, Tone.GOLD,
        listOf(Icons.Rounded.Add, Icons.Rounded.Paid, Icons.Rounded.Checklist, Icons.AutoMirrored.Rounded.Undo)),
    BOSS(R.string.guide_boss_title, R.string.guide_boss_hook, R.string.guide_boss, Icons.Rounded.Whatshot, Tone.RED,
        listOf(Icons.Rounded.Bolt, Icons.Rounded.Whatshot, Icons.Rounded.EmojiEvents, Icons.AutoMirrored.Rounded.DirectionsRun)),
    PORTAL(R.string.guide_portal_title, R.string.guide_portal_hook, R.string.guide_portal, Icons.Rounded.AutoAwesome, Tone.PURPLE,
        listOf(Icons.Rounded.Schedule, Icons.Rounded.KeyboardDoubleArrowUp, Icons.Rounded.PersonAdd, Icons.Rounded.HourglassBottom)),
    SHADOWS(R.string.guide_shadows_title, R.string.guide_shadows_hook, R.string.guide_shadows, Icons.Rounded.Groups, Tone.PURPLE,
        listOf(Icons.Rounded.Explore, Icons.Rounded.Groups, Icons.Rounded.Upgrade)),
    FOCUS(R.string.guide_focus_title, R.string.guide_focus_hook, R.string.guide_focus, Icons.Rounded.Psychology, Tone.PURPLE,
        listOf(Icons.Rounded.Link, Icons.Rounded.Timer, Icons.Rounded.Coffee, Icons.Rounded.AllInclusive, Icons.Rounded.Lock)),
    SHOP(R.string.guide_shop_title, R.string.guide_shop_hook, R.string.guide_shop, Icons.Rounded.Storefront, Tone.GOLD,
        listOf(Icons.Rounded.Inventory2, Icons.Rounded.Groups, Icons.Rounded.Backpack)),
}

@Composable
private fun Tone.color(): Color = when (this) {
    Tone.ACCENT -> Lif.colors.accent
    Tone.RED -> Lif.colors.red
    Tone.GOLD -> Lif.colors.gold
    Tone.PURPLE -> Lif.colors.purple
}

@Composable
fun InfoButton(topic: Guide, s: GameState? = null) {
    var open by rememberSaveable { mutableStateOf(false) }
    IconButton(onClick = { open = true }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.AutoMirrored.Rounded.HelpOutline, stringResource(topic.title), tint = Lif.colors.dim, modifier = Modifier.size(18.dp))
    }
    if (open) GuideSheet(topic, s) { open = false }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuideSheet(topic: Guide, s: GameState?, onDismiss: () -> Unit) {
    val color = topic.tone.color()
    val points = stringResource(topic.body).lines().filter { it.isNotBlank() }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Lif.colors.panel) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).navigationBarsPadding().padding(bottom = 20.dp)) {
            Header(topic, color)
            Spacer(Modifier.height(16.dp))
            points.forEachIndexed { i, line ->
                val (lead, text) = line.split("::", limit = 2).let { it[0] to it.getOrElse(1) { "" } }
                Point(topic.points.getOrElse(i) { topic.icon }, lead, text, color)
            }
            // The one setting people miss: offer it right where penalties are explained.
            if (topic == Guide.PENALTY && s != null) Panel(modifier = Modifier.padding(top = 4.dp)) { PenaltyBlockToggle(s) }
            Spacer(Modifier.height(12.dp))
            PrimaryButton(stringResource(R.string.got_it), onClick = onDismiss, modifier = Modifier.fillMaxWidth(), color = color)
        }
    }
}

@Composable
private fun Header(topic: Guide, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(52.dp).clip(CircleShape).background(color.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) {
            Icon(topic.icon, null, tint = color, modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(stringResource(topic.title), style = MaterialTheme.typography.titleLarge)
            Text(stringResource(topic.hook), style = MaterialTheme.typography.bodyMedium, color = color)
        }
    }
}

@Composable
private fun Point(icon: ImageVector, lead: String, text: String, color: Color) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(Lif.colors.panelHigh), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(lead, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            if (text.isNotEmpty()) Text(text, style = MaterialTheme.typography.bodyMedium, color = Lif.colors.muted)
        }
    }
}

/** "How it works" in Settings: one row that unfolds into every topic. */
@Composable
fun GuideList(s: GameState) {
    var open by rememberSaveable { mutableStateOf<Guide?>(null) }
    var expanded by rememberSaveable { mutableStateOf(false) }
    Panel {
        Row(Modifier.fillMaxWidth().clickable { expanded = !expanded }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Rounded.HelpOutline, null, tint = Lif.colors.accent, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Text(stringResource(R.string.guide_section), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            Icon(if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = Lif.colors.dim)
        }
        if (expanded) Guide.entries.forEach { topic ->
            Row(Modifier.fillMaxWidth().clickable { open = topic }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(topic.icon, null, tint = topic.tone.color(), modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Text(stringResource(topic.title), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Icon(Icons.Rounded.ChevronRight, null, tint = Lif.colors.dim)
            }
        }
    }
    open?.let { GuideSheet(it, s) { open = null } }
}
