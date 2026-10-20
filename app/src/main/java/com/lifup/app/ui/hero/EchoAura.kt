package com.lifup.app.ui.hero

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.Dp
import com.lifup.app.domain.EchoAura
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** Colours an aura is painted with: the rarity's, the passive's glow and gold. */
data class AuraColors(val rank: Color, val glow: Color, val gold: Color)

/**
 * The moving halo behind a mythic echo's frame. [t] runs 0→1 over [PERIOD_MS] and every style
 * loops on it, so one clock drives them all.
 */
@Composable
fun MythicAura(aura: EchoAura, size: Dp, colors: AuraColors, modifier: Modifier = Modifier) {
    val clock = rememberInfiniteTransition(label = "aura")
    val t by clock.animateFloat(0f, 1f, infiniteRepeatable(tween(PERIOD_MS, easing = LinearEasing)), label = "t")
    Canvas(modifier.size(size)) {
        when (aura) {
            EchoAura.SPIN -> spin(t, colors)
            EchoAura.RAYS -> rays(t, colors)
            EchoAura.ORBIT -> orbit(t, colors)
            EchoAura.PULSE -> pulse(t, colors)
            EchoAura.FLAME -> flame(t, colors)
            EchoAura.RUNES -> runes(t, colors)
            EchoAura.STAR -> star(t, colors)
            EchoAura.ECLIPSE -> eclipse(t, colors)
            EchoAura.GEAR -> gear(t, colors)
        }
    }
}

private const val PERIOD_MS = 8000
private const val TAU = 2 * PI

private val DrawScope.r get() = size.minDimension / 2f

private fun DrawScope.point(radius: Float, degrees: Double) =
    Offset(center.x + radius * cos(degrees * PI / 180).toFloat(), center.y + radius * sin(degrees * PI / 180).toFloat())

private fun DrawScope.hexPath(radius: Float, turn: Double = -90.0) = Path().apply {
    for (i in 0 until 6) {
        val p = point(radius, 60.0 * i + turn)
        if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y)
    }
    close()
}

/** A ring of colour turning slowly around the frame. */
private fun DrawScope.spin(t: Float, c: AuraColors) = rotate(360f * t) {
    drawPath(hexPath(r), Brush.sweepGradient(listOf(c.rank, c.glow, c.gold, c.rank), center))
}

/** Sun rays turning behind the frame. */
private fun DrawScope.rays(t: Float, c: AuraColors) = rotate(90f * t) {
    for (i in 0 until 12) {
        val a = 30.0 * i
        val ray = Path().apply {
            moveTo(center.x, center.y)
            point(r, a - 7).let { lineTo(it.x, it.y) }
            point(r, a + 7).let { lineTo(it.x, it.y) }
            close()
        }
        drawPath(ray, if (i % 2 == 0) c.gold else c.glow, alpha = 0.85f)
    }
}

/** Three orbs circling on a faint track. */
private fun DrawScope.orbit(t: Float, c: AuraColors) {
    val track = r * 0.9f
    drawCircle(c.rank.copy(alpha = 0.45f), track, style = Stroke(r * 0.04f))
    listOf(c.gold, c.glow, c.rank).forEachIndexed { i, color ->
        val p = point(track, 360.0 * t + 120.0 * i)
        drawCircle(Brush.radialGradient(listOf(color, color.copy(alpha = 0f)), p, r * 0.2f), r * 0.2f, p)
        drawCircle(color, r * 0.08f, p)
    }
}

/** Waves leaving the frame, one after the other. */
private fun DrawScope.pulse(t: Float, c: AuraColors) {
    for (k in 0 until 3) {
        val p = (t * 2 + k / 3f) % 1f
        drawPath(hexPath(r * (0.72f + 0.28f * p)), c.glow, alpha = 1 - p, style = Stroke(r * 0.07f * (1 - p) + 1f))
    }
}

/** A crown of flickering flames. */
private fun DrawScope.flame(t: Float, c: AuraColors) {
    for (i in 0 until 14) {
        val flick = 0.75f + 0.25f * sin((t * 6 + i * 0.37f) * TAU).toFloat()
        val p = point(r * 0.8f, 360.0 / 14 * i + 20 * t)
        val radius = r * 0.24f * flick
        drawCircle(Brush.radialGradient(listOf(c.gold, c.glow, c.glow.copy(alpha = 0f)), p, radius), radius, p)
    }
}

/** Two rings of marks turning in opposite directions. */
private fun DrawScope.runes(t: Float, c: AuraColors) {
    val outer = r * 0.92f
    rotate(120f * t) {
        for (i in 0 until 12) drawArc(
            c.glow, 30f * i, 18f, useCenter = false,
            topLeft = Offset(center.x - outer, center.y - outer), size = Size(outer * 2, outer * 2), style = Stroke(r * 0.08f),
        )
    }
    rotate(-120f * t) {
        for (i in 0 until 24) drawCircle(c.gold, r * 0.035f, point(r * 0.8f, 15.0 * i))
    }
}

/** Two hexagons turning against each other into a moving star. */
private fun DrawScope.star(t: Float, c: AuraColors) {
    rotate(60f * t) { drawPath(hexPath(r), c.gold, style = Stroke(r * 0.07f)) }
    rotate(-60f * t) { drawPath(hexPath(r, -60.0), c.glow, style = Stroke(r * 0.07f)) }
}

/** A dark disc with a breathing corona and a bright edge sweeping around it. */
private fun DrawScope.eclipse(t: Float, c: AuraColors) {
    val breath = 0.6f + 0.4f * sin(t * 2 * TAU).toFloat()
    drawCircle(Brush.radialGradient(listOf(Color.Transparent, c.glow.copy(alpha = breath), Color.Transparent), center, r), r)
    val edge = r * 0.86f
    drawArc(
        Brush.sweepGradient(listOf(Color.Transparent, c.gold, Color.Transparent), center), 360f * t, 160f, useCenter = false,
        topLeft = Offset(center.x - edge, center.y - edge), size = Size(edge * 2, edge * 2), style = Stroke(r * 0.06f),
    )
}

/** A toothed wheel turning behind the frame. */
private fun DrawScope.gear(t: Float, c: AuraColors) = rotate(45f * t) {
    val teeth = 16
    val path = Path()
    for (i in 0 until teeth * 2) {
        val radius = if (i % 2 == 0) r else r * 0.86f
        val a = 360.0 / (teeth * 2) * i
        val p1 = point(radius, a - 360.0 / (teeth * 4))
        val p2 = point(radius, a + 360.0 / (teeth * 4))
        if (i == 0) path.moveTo(p1.x, p1.y) else path.lineTo(p1.x, p1.y)
        path.lineTo(p2.x, p2.y)
    }
    path.close()
    drawPath(path, Brush.sweepGradient(listOf(c.rank, c.gold, c.rank), center))
}
