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
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import com.lifup.app.domain.Rules.MAX_FOCUS_ATTRS
import com.lifup.app.ui.theme.Lif

@Composable
fun attrShort(a: Attr): String = stringResource(when (a) {
    Attr.STR -> R.string.attr_str_short
    Attr.AGI -> R.string.attr_agi_short
    Attr.INT -> R.string.attr_int_short
    Attr.VIT -> R.string.attr_vit_short
})

@Composable
fun attrColor(a: Attr): Color = when (a) {
    Attr.STR -> Lif.colors.red
    Attr.AGI -> Lif.colors.green
    Attr.INT -> Lif.colors.blue
    Attr.VIT -> Lif.colors.gold
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

private enum class FocusMode(val label: Int) {
    BALANCED(R.string.attr_focus_balanced), ADAPTIVE(R.string.attr_focus_catchup), CHOSEN(R.string.attr_focus_choose)
}

/**
 * First the mode (Balanced / Adaptive / Choose), then the attributes: picked by the player (up to
 * [MAX_FOCUS_ATTRS]) or, in Adaptive, shown lit for the ones that fell behind ([lagging]).
 * A null [catchUp] hides Adaptive (onboarding, before there is anything to catch up on).
 */
@Composable
fun FocusPicker(
    selected: Set<Attr>, onChange: (Set<Attr>) -> Unit,
    catchUp: Boolean? = null, lagging: Set<Attr> = emptySet(), onCatchUp: (Boolean) -> Unit = {},
) {
    val c = Lif.colors
    // "Choose" with nothing picked yet still shows the grid, though the draw stays balanced.
    var choosing by remember { mutableStateOf(selected.isNotEmpty()) }
    val mode = when {
        catchUp == true -> FocusMode.ADAPTIVE
        choosing || selected.isNotEmpty() -> FocusMode.CHOSEN
        else -> FocusMode.BALANCED
    }
    val modes = FocusMode.entries.filter { it != FocusMode.ADAPTIVE || catchUp != null }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            modes.forEachIndexed { i, m ->
                SegmentedButton(
                    selected = mode == m,
                    onClick = {
                        choosing = m == FocusMode.CHOSEN
                        if (catchUp != null) onCatchUp(m == FocusMode.ADAPTIVE)
                        if (m == FocusMode.BALANCED) onChange(emptySet())
                    },
                    shape = SegmentedButtonDefaults.itemShape(i, modes.size),
                ) { Text(stringResource(m.label), maxLines = 1) }
            }
        }
        val info = when (mode) {
            FocusMode.BALANCED -> stringResource(R.string.attr_focus_balanced_info)
            FocusMode.CHOSEN -> stringResource(R.string.attr_focus_hint)
            FocusMode.ADAPTIVE -> if (lagging.isEmpty()) stringResource(R.string.attr_focus_catchup_even)
                else stringResource(R.string.attr_focus_catchup_now, lagging.map { stringResource(attrNameRes(it)) }.joinToString(", "))
        }
        Text(info, style = MaterialTheme.typography.bodySmall, color = c.muted)
        when (mode) {
            FocusMode.BALANCED -> Unit
            FocusMode.ADAPTIVE -> AttrGrid(lit = lagging, enabled = { false }) {}
            FocusMode.CHOSEN -> AttrGrid(lit = selected, enabled = { it in selected || selected.size < MAX_FOCUS_ATTRS }) { a ->
                onChange(if (a in selected) selected - a else selected + a)
            }
        }
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
