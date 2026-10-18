package com.lifup.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.Attr
import com.lifup.app.ui.theme.Lif

const val MAX_FOCUS_ATTRS = 2

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

/** "Balanced" or up to [MAX_FOCUS_ATTRS] attributes, each with the kind of missions it brings. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FocusPicker(selected: Set<Attr>, onChange: (Set<Attr>) -> Unit) {
    val c = Lif.colors
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        FilterChip(selected = selected.isEmpty(), onClick = { onChange(emptySet()) }, label = { Text(stringResource(R.string.attr_focus_balanced)) })
        Attr.entries.forEach { a ->
            val on = a in selected
            val color = attrColor(a)
            FilterChip(
                selected = on,
                enabled = on || selected.size < MAX_FOCUS_ATTRS,
                onClick = { onChange(if (on) selected - a else selected + a) },
                label = {
                    Column(Modifier.padding(vertical = 4.dp)) {
                        Text(stringResource(attrNameRes(a)), color = if (on) color else c.text)
                        Text(stringResource(attrWhatRes(a)), style = MaterialTheme.typography.labelSmall, color = c.muted)
                    }
                },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = color.copy(alpha = 0.15f)),
            )
        }
    }
    Text(stringResource(R.string.attr_focus_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
}
