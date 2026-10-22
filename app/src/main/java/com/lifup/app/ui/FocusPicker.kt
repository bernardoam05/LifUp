package com.lifup.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.Attr
import com.lifup.app.domain.Settings
import com.lifup.app.domain.Rules.MAX_FOCUS_ATTRS
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.theme.Palette

@Composable
fun attrShort(a: Attr): String = stringResource(when (a) {
    Attr.STR -> R.string.attr_str_short
    Attr.AGI -> R.string.attr_agi_short
    Attr.INT -> R.string.attr_int_short
    Attr.VIT -> R.string.attr_vit_short
})

@Composable
fun attrColor(a: Attr): Color = attrColor(a, Lif.colors)

/** Strength is orange, not red: red stays for failures and penalties. */
fun attrColor(a: Attr, p: Palette): Color = when (a) {
    Attr.STR -> p.orange
    Attr.AGI -> p.green
    Attr.INT -> p.blue
    Attr.VIT -> p.gold
}

private fun attrNameRes(a: Attr) = when (a) {
    Attr.STR -> R.string.attr_str
    Attr.AGI -> R.string.attr_agi
    Attr.INT -> R.string.attr_int
    Attr.VIT -> R.string.attr_vit
}

private fun attrWhatRes(a: Attr) = when (a) {
    Attr.STR -> R.string.attr_str_what
    Attr.AGI -> R.string.attr_agi_what
    Attr.INT -> R.string.attr_int_what
    Attr.VIT -> R.string.attr_vit_what
}

/** How the day's missions are drawn: one card each in the picker. */
enum class DrawMode(val label: Int, val short: Int) {
    BALANCED(R.string.attr_focus_balanced, R.string.mode_balanced_short),
    ADAPTIVE(R.string.attr_focus_catchup, R.string.mode_catchup_short),
    CHOSEN(R.string.attr_focus_choose, R.string.mode_choose_short),
    RANDOM(R.string.attr_focus_random, R.string.mode_random_short),
}

fun Settings.drawMode(): DrawMode = when {
    randomDraw -> DrawMode.RANDOM
    catchUp -> DrawMode.ADAPTIVE
    focusAttrs.isNotEmpty() -> DrawMode.CHOSEN
    else -> DrawMode.BALANCED
}

/**
 * First the profile, as a grid of cards (they fit any width, unlike a row of segments), then what it
 * means: the attributes picked by the player (up to [MAX_FOCUS_ATTRS]) or, in Adaptive, the ones that fell
 * behind ([lagging]). A null [mode] (onboarding) offers only Balanced and Choose.
 */
@Composable
fun FocusPicker(
    selected: Set<Attr>, onChange: (Set<Attr>) -> Unit,
    mode: DrawMode? = null, lagging: Set<Attr> = emptySet(), onMode: (DrawMode) -> Unit = {},
) {
    val c = Lif.colors
    // "Choose" with nothing picked yet still shows the grid, though the draw stays balanced.
    var choosing by remember { mutableStateOf(selected.isNotEmpty()) }
    val base = mode ?: if (selected.isNotEmpty()) DrawMode.CHOSEN else DrawMode.BALANCED
    val current = if (choosing && base == DrawMode.BALANCED) DrawMode.CHOSEN else base
    val modes = if (mode == null) listOf(DrawMode.BALANCED, DrawMode.CHOSEN) else DrawMode.entries
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        modes.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { m ->
                    ModeCard(m, current == m, Modifier.weight(1f)) {
                        choosing = m == DrawMode.CHOSEN
                        if (m != DrawMode.CHOSEN) onChange(emptySet())
                        onMode(m)
                    }
                }
            }
        }
        val info = when (current) {
            DrawMode.BALANCED -> stringResource(R.string.attr_focus_balanced_info)
            DrawMode.CHOSEN -> stringResource(R.string.attr_focus_hint)
            DrawMode.RANDOM -> stringResource(R.string.attr_focus_random_info)
            DrawMode.ADAPTIVE -> if (lagging.isEmpty()) stringResource(R.string.attr_focus_catchup_even)
                else stringResource(R.string.attr_focus_catchup_now, lagging.map { stringResource(attrNameRes(it)) }.joinToString(", "))
        }
        Text(info, style = MaterialTheme.typography.bodySmall, color = c.muted)
        when (current) {
            DrawMode.ADAPTIVE -> AttrGrid(lit = lagging, enabled = { false }) {}
            DrawMode.CHOSEN -> AttrGrid(lit = selected, enabled = { it in selected || selected.size < MAX_FOCUS_ATTRS }) { a ->
                onChange(if (a in selected) selected - a else selected + a)
            }
            else -> Unit
        }
    }
}

/** One profile: its name and a few words, lit in the accent when chosen. */
@Composable
private fun ModeCard(m: DrawMode, on: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val c = Lif.colors
    val shape = RoundedCornerShape(12.dp)
    Column(
        modifier.clip(shape)
            .background(if (on) c.accent.copy(alpha = 0.15f) else Color.Transparent)
            .border(1.dp, if (on) c.accent else c.muted.copy(alpha = 0.3f), shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(stringResource(m.label), color = if (on) c.accent else c.text, style = MaterialTheme.typography.titleSmall, maxLines = 1)
        Text(stringResource(m.short), style = MaterialTheme.typography.labelSmall, color = c.muted, maxLines = 1)
    }
}

/** The four attributes as equal cards, two per row; [lit] ones in their colour. */
@Composable
private fun AttrGrid(lit: Set<Attr>, enabled: (Attr) -> Boolean, onClick: (Attr) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Attr.entries.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { a -> AttrCard(a, a in lit, enabled(a), Modifier.weight(1f)) { onClick(a) } }
            }
        }
    }
}

@Composable
private fun AttrCard(a: Attr, on: Boolean, enabled: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val c = Lif.colors
    val color = attrColor(a)
    val shape = RoundedCornerShape(12.dp)
    Column(
        modifier.clip(shape)
            .background(if (on) color.copy(alpha = 0.15f) else Color.Transparent)
            .border(1.dp, if (on) color else c.muted.copy(alpha = 0.3f), shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(stringResource(attrNameRes(a)), color = if (on) color else if (enabled) c.text else c.dim, style = MaterialTheme.typography.titleSmall)
        Text(stringResource(attrWhatRes(a)), style = MaterialTheme.typography.labelSmall, color = c.muted)
    }
}
