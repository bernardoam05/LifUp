package com.lifup.app.ui.hero

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifup.app.domain.Passive
import com.lifup.app.domain.ShadowDef
import com.lifup.app.domain.ShadowRank
import com.lifup.app.ui.shadowIcon
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
fun passiveColor(p: Passive): Color = when (p) {
    Passive.XP_BOOST, Passive.TRAINING_XP, Passive.MIND_XP, Passive.EXPLORER_XP, Passive.DAILY_BONUS -> Lif.colors.accent
    Passive.GOLD_BOOST, Passive.SHOP_DISCOUNT, Passive.ALL_BOOST -> Lif.colors.gold
    Passive.BOSS_DAMAGE -> Lif.colors.red
    Passive.PENALTY_REDUCE, Passive.PENALTY_IMMUNITY, Passive.STREAK_PROTECT -> Lif.colors.green
    Passive.FOCUS_MASTERY, Passive.SHADOW_LUCK -> Lif.colors.purple
}

/**
 * An echo's emblem: rarity frame, a glow in the colour of its passive and its class figure.
 * Unknown echoes show only the dark figure, so the collection teases what's left to find.
 */
@Composable
fun EchoEmblem(def: ShadowDef, known: Boolean, size: Dp, modifier: Modifier = Modifier) {
    val c = Lif.colors
    val rank = shadowRankColor(def.rank)
    val shape = def.rank.shape()
    val glow = passiveColor(def.passive)
    val borderWidth = if (def.rank >= ShadowRank.COMMANDER) size * 0.06f else size * 0.035f
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        if (known && def.rank == ShadowRank.MARSHAL) {
            // Mythic: a slowly turning ring of colour behind the frame.
            val spin = rememberInfiniteTransition(label = "mythic")
            val angle by spin.animateFloat(0f, 360f, infiniteRepeatable(tween(6000, easing = LinearEasing)), label = "angle")
            Box(Modifier.size(size).rotate(angle).clip(shape).background(Brush.sweepGradient(listOf(rank, glow, c.gold, rank))))
        }
        Box(
            Modifier.size(if (known && def.rank == ShadowRank.MARSHAL) size - borderWidth * 2 else size).clip(shape)
                .background(if (known) Brush.radialGradient(listOf(glow.copy(alpha = 0.45f), c.panel)) else Brush.radialGradient(listOf(c.panelHigh, c.panel)))
                .then(if (known && def.rank == ShadowRank.MARSHAL) Modifier else Modifier.border(borderWidth, if (known) rank else c.border, shape)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                shadowIcon(def.shadowClass), null,
                tint = if (known) Color.White.copy(alpha = 0.92f) else c.border,
                modifier = Modifier.size(size * 0.5f),
            )
            if (!known) Text("?", color = c.dim, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.22f).sp, modifier = Modifier.align(Alignment.BottomEnd))
        }
    }
}
