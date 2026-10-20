package com.lifup.app.ui.hero

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.CutCornerShape
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifup.app.domain.EchoAura
import com.lifup.app.domain.Passive
import com.lifup.app.domain.PowerKind
import com.lifup.app.domain.kind
import com.lifup.app.R
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.MonetizationOn
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.ui.graphics.vector.ImageVector
import com.lifup.app.domain.ShadowDef
import com.lifup.app.domain.ShadowRank
import com.lifup.app.ui.shadowRankColor
import com.lifup.app.ui.theme.Lif
import kotlin.math.cos
import kotlin.math.sin

/** Pointy-top hexagon for legendary echoes. */
private val Hexagon = GenericShape { size, _ ->
    val r = minOf(size.width, size.height) / 2f
    val cx = size.width / 2f
    val cy = size.height / 2f
    for (i in 0 until 6) {
        val a = Math.toRadians(60.0 * i - 90)
        val x = cx + r * cos(a).toFloat()
        val y = cy + r * sin(a).toFloat()
        if (i == 0) moveTo(x, y) else lineTo(x, y)
    }
    close()
}

/** Each rarity gets its own frame, so rank reads at a glance without relying on colour alone. */
private fun ShadowRank.shape(): Shape = when (this) {
    ShadowRank.NORMAL -> CircleShape
    ShadowRank.ELITE -> RoundedCornerShape(30)
    ShadowRank.KNIGHT -> CutCornerShape(28)
    ShadowRank.COMMANDER, ShadowRank.MARSHAL -> Hexagon
}

/** The colour of what an echo does: growth, wealth, combat, protection, focus or fortune. */
@Composable
fun passiveColor(p: Passive): Color = powerColor(p.kind())

@Composable
fun powerColor(k: PowerKind): Color = when (k) {
    PowerKind.GROWTH -> Lif.colors.accent
    PowerKind.WEALTH -> Lif.colors.gold
    PowerKind.COMBAT -> Lif.colors.red
    PowerKind.PROTECTION -> Lif.colors.green
    PowerKind.FORTUNE -> Lif.colors.purple
}

fun powerIcon(k: PowerKind): ImageVector = when (k) {
    PowerKind.GROWTH -> Icons.AutoMirrored.Rounded.TrendingUp
    PowerKind.WEALTH -> Icons.Rounded.MonetizationOn
    PowerKind.COMBAT -> Icons.Rounded.Whatshot
    PowerKind.PROTECTION -> Icons.Rounded.Shield
    PowerKind.FORTUNE -> Icons.Rounded.AutoAwesome
}

fun powerName(k: PowerKind): Int = when (k) {
    PowerKind.GROWTH -> R.string.power_growth
    PowerKind.WEALTH -> R.string.power_wealth
    PowerKind.COMBAT -> R.string.power_combat
    PowerKind.PROTECTION -> R.string.power_protection
    PowerKind.FORTUNE -> R.string.power_fortune
}

/**
 * An echo's emblem: rarity frame, a glow in the colour of its passive and its own figure; mythic
 * ones also move, each with its own aura.
 * Unknown echoes show only the dark figure, so the collection teases what's left to find.
 */
@Composable
fun EchoEmblem(def: ShadowDef, known: Boolean, size: Dp, modifier: Modifier = Modifier) {
    val c = Lif.colors
    val rank = shadowRankColor(def.rank)
    val shape = def.rank.shape()
    val glow = passiveColor(def.passive)
    val borderWidth = if (def.rank >= ShadowRank.COMMANDER) size * 0.06f else size * 0.035f
    val mythic = known && def.rank == ShadowRank.MARSHAL
    val aura = def.aura ?: EchoAura.SPIN
    // A ring shows through a thin gap; the other auras need room around a smaller frame.
    val inner = when {
        !mythic -> size
        aura == EchoAura.SPIN -> size - borderWidth * 2
        else -> size * 0.72f
    }
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        if (mythic) MythicAura(aura, size, AuraColors(rank, glow, c.gold))
        Box(
            Modifier.size(inner).clip(shape)
                .background(if (known) Brush.radialGradient(listOf(glow.copy(alpha = 0.45f), c.panel)) else Brush.radialGradient(listOf(c.panelHigh, c.panel)))
                .then(if (mythic && aura == EchoAura.SPIN) Modifier else Modifier.border(borderWidth, if (known) rank else c.border, shape)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                def.figure(), null,
                tint = if (known) Color.White.copy(alpha = 0.92f) else c.border,
                modifier = Modifier.size(inner * 0.5f),
            )
            if (!known) Text("?", color = c.dim, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.22f).sp, modifier = Modifier.align(Alignment.BottomEnd))
        }
    }
}
