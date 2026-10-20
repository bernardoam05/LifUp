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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.unit.Dp
import com.lifup.app.domain.EchoAura
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

/** Colours an aura is painted with: the rarity's, the passive's glow and gold. */
data class AuraColors(val rank: Color, val glow: Color, val gold: Color)

/**
 * The moving halo behind a mythic echo's frame; every mythic has its own. [t] runs 0→1 over
 * [PERIOD_MS] and every style loops on it, so one clock drives them all. The frame covers the
 * middle (about 72% of the size), so the auras live in the band around it.
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
            EchoAura.VOID -> void(t)
            EchoAura.SHARDS -> shards(t, colors)
            EchoAura.CLOCK -> clock(t, colors)
            EchoAura.WINGS -> wings(t, colors)
            EchoAura.CROWN -> crown(t, colors)
            EchoAura.SPARKS -> sparks(t, colors)
            EchoAura.LIGHTNING -> lightning(t, colors)
            EchoAura.COMET -> comet(t, colors)
            EchoAura.SMOKE -> smoke(t)
            EchoAura.SEASONS -> seasons(t)
            EchoAura.FROST -> frost(t)
            EchoAura.THORNS -> thorns(t)
        }
    }
}

private const val PERIOD_MS = 8000
private const val TAU = 2 * PI

// The darker auras' own tones, so they read as dark whatever the echo's colours.
private val Ink = Color(0xFF07040D)
private val Violet = Color(0xFF5B21B6)
private val Blood = Color(0xFF8B0F1A)
private val Ice = Color(0xFFBDE7FF)

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

private fun wave(x: Float) = sin(x * TAU).toFloat()

/** A stable pseudo-random number in 0..1 for [i] (and [salt]), so shapes don't jump between frames. */
private fun noise(i: Int, salt: Int = 0): Float {
    val x = sin((i * 12.9898 + salt * 78.233)) * 43758.5453
    return (x - floor(x)).toFloat()
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

/** Waves leaving the frame one after another, over a steady glow. */
private fun DrawScope.pulse(t: Float, c: AuraColors) {
    drawPath(hexPath(r * 0.8f), c.glow, alpha = 0.35f)
    for (k in 0 until 3) {
        val p = (t * 2 + k / 3f) % 1f
        drawPath(hexPath(r * (0.74f + 0.26f * p)), c.glow, alpha = 1 - p * 0.8f, style = Stroke(r * 0.12f * (1 - p) + 2f))
    }
}

/** A crown of flickering flames. */
private fun DrawScope.flame(t: Float, c: AuraColors) {
    for (i in 0 until 14) {
        val flick = 0.75f + 0.25f * wave(t * 6 + i * 0.37f)
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

/** A black corona that breathes, with a blood-red edge sweeping around it. */
private fun DrawScope.eclipse(t: Float, c: AuraColors) {
    val breath = 0.55f + 0.45f * wave(t * 2)
    drawCircle(Brush.radialGradient(listOf(Ink, Ink, Blood.copy(alpha = 0.9f * breath), Color(0xFFE11D48).copy(alpha = 0.5f * breath), Color.Transparent), center, r), r)
    val edge = r * 0.88f
    drawArc(
        Brush.sweepGradient(listOf(Color.Transparent, Blood, c.gold, Color.Transparent), center), 360f * t, 200f, useCenter = false,
        topLeft = Offset(center.x - edge, center.y - edge), size = Size(edge * 2, edge * 2), style = Stroke(r * 0.09f, cap = StrokeCap.Round),
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

/** A black hole: spiral arms turning inward and specks of light falling in. */
private fun DrawScope.void(t: Float) {
    drawCircle(Brush.radialGradient(listOf(Ink, Ink, Violet.copy(alpha = 0.55f), Color.Transparent), center, r), r)
    for (arm in 0 until 3) {
        val path = Path()
        for (s in 0..24) {
            val f = s / 24f
            val p = point(r * (1f - 0.3f * f), 120.0 * arm + 360.0 * t + 140.0 * f)
            if (s == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
        }
        drawPath(path, Brush.sweepGradient(listOf(Violet, Color(0xFFC084FC), Violet), center), style = Stroke(r * 0.06f, cap = StrokeCap.Round))
    }
    for (i in 0 until 8) {
        val p = (t * 2 + i / 8f) % 1f
        drawCircle(Color.White, r * 0.025f * (1 - p) + 0.5f, point(r * (1f - 0.28f * p), 45.0 * i - 200.0 * p), alpha = 1 - p)
    }
}

/** Dark crystal splinters drifting around the frame, each turning on its own. */
private fun DrawScope.shards(t: Float, c: AuraColors) {
    for (i in 0 until 9) {
        val a = 40.0 * i + 30 * t + 10 * wave(t + noise(i))
        val p = point(r * (0.86f + 0.06f * wave(t * 2 + noise(i, 1))), a)
        val s = r * (0.1f + 0.08f * noise(i, 2))
        rotate(360f * t * (if (i % 2 == 0) 1 else -1) + 90f * noise(i, 3), p) {
            val tri = Path().apply {
                moveTo(p.x, p.y - s)
                lineTo(p.x + s * 0.7f, p.y + s * 0.8f)
                lineTo(p.x - s * 0.6f, p.y + s * 0.5f)
                close()
            }
            drawPath(tri, Brush.linearGradient(listOf(Ink, Violet, c.glow), Offset(p.x, p.y - s), Offset(p.x, p.y + s)))
            drawPath(tri, c.glow, alpha = 0.8f, style = Stroke(1.5f))
        }
    }
}

/** A dial: the hour fills slowly around the ring while a bright hand runs ahead. */
private fun DrawScope.clock(t: Float, c: AuraColors) {
    val ring = r * 0.9f
    val box = Size(ring * 2, ring * 2)
    val corner = Offset(center.x - ring, center.y - ring)
    drawCircle(c.rank.copy(alpha = 0.35f), ring, style = Stroke(r * 0.1f))
    drawArc(c.gold, -90f, 360f * t, useCenter = false, topLeft = corner, size = box, style = Stroke(r * 0.1f))
    for (i in 0 until 12) {
        val long = i % 3 == 0
        drawLine(Color.White, point(r * (if (long) 0.78f else 0.82f), 30.0 * i), point(r * 0.98f, 30.0 * i), strokeWidth = if (long) r * 0.06f else r * 0.03f, alpha = 0.85f)
    }
    drawCircle(Color.White, r * 0.07f, point(ring, -90.0 + 360.0 * ((t * 12) % 1f)))
}

/** Dark wings either side of the frame, beating slowly (a fallen angel's). */
private fun DrawScope.wings(t: Float, c: AuraColors) {
    val flap = 0.75f + 0.25f * wave(t * 3)
    for (side in listOf(-1, 1)) {
        for (f in 0 until 6) {
            val angle = (if (side < 0) 180f else 0f) + side * (f * 14f - 40f) * flap
            rotate(angle) {
                val len = r * (0.62f - f * 0.04f)
                val from = center.x + r * 0.38f
                drawOval(
                    Brush.horizontalGradient(listOf(Ink, Violet, c.gold), from, from + len),
                    topLeft = Offset(from, center.y - r * 0.08f), size = Size(len, r * 0.16f),
                )
            }
        }
    }
}

/** The thousandth: a turning ring of every colour, a golden crown of points and sparkles around it. */
private fun DrawScope.crown(t: Float, c: AuraColors) {
    rotate(360f * t) {
        drawCircle(Brush.sweepGradient(listOf(Color(0xFFFF4D5E), Color(0xFFFFD866), Color(0xFF10D9A0), Color(0xFF4F8CFF), Color(0xFFA27BFF), Color(0xFFFF4D5E)), center), r * 0.86f)
    }
    for (i in 0 until 8) {
        val lift = 1f + 0.08f * wave(t * 2 + i / 8f)
        val a = 45.0 * i - 90
        val spike = Path().apply {
            point(r * 0.7f, a - 12).let { moveTo(it.x, it.y) }
            point(r * lift, a).let { lineTo(it.x, it.y) }
            point(r * 0.7f, a + 12).let { lineTo(it.x, it.y) }
            close()
        }
        drawPath(spike, Brush.radialGradient(listOf(c.gold, Color(0xFFFFF4C2)), center, r))
    }
    for (i in 0 until 6) {
        val twinkle = (wave(t * 4 + noise(i)) + 1) / 2
        drawCircle(Color.White, r * 0.05f * twinkle, point(r * 0.95f, 60.0 * i + 22.5), alpha = twinkle)
    }
}

/** Sparks thrown off the frame, as from a grinder. */
private fun DrawScope.sparks(t: Float, c: AuraColors) {
    for (i in 0 until 18) {
        val p = (t * 3 + noise(i)) % 1f
        val a = 360.0 * noise(i, 1) + 40 * t
        val from = point(r * (0.72f + 0.28f * p), a)
        val to = point(r * (0.72f + 0.28f * p + 0.1f), a + 4)
        drawLine(if (i % 3 == 0) Color.White else c.gold, from, to, strokeWidth = r * 0.04f * (1 - p) + 1f, alpha = 1 - p, cap = StrokeCap.Round)
    }
}

/** Jagged bolts that strike around the frame and flicker out. */
private fun DrawScope.lightning(t: Float, c: AuraColors) {
    val beat = floor(t * 16).toInt()
    val fade = 1 - (t * 16 - beat)
    drawCircle(Brush.radialGradient(listOf(Color.Transparent, c.glow.copy(alpha = 0.25f + 0.3f * fade), Color.Transparent), center, r), r)
    for (b in 0 until 3) {
        val start = 360.0 * noise(beat, b)
        val path = Path()
        for (s in 0..5) {
            val p = point(r * (0.74f + 0.25f * noise(beat * 7 + s, b + 9)), start + s * 14.0)
            if (s == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
        }
        drawPath(path, c.glow, alpha = fade, style = Stroke(r * 0.08f, cap = StrokeCap.Round))
        drawPath(path, Color.White, alpha = fade, style = Stroke(r * 0.03f, cap = StrokeCap.Round))
    }
}

/** A comet circling with its tail behind it. */
private fun DrawScope.comet(t: Float, c: AuraColors) {
    val track = r * 0.88f
    val head = 360f * t * 2
    drawArc(
        Brush.sweepGradient(listOf(Color.Transparent, c.glow, Color.White), center), head - 150f, 150f, useCenter = false,
        topLeft = Offset(center.x - track, center.y - track), size = Size(track * 2, track * 2), style = Stroke(r * 0.1f, cap = StrokeCap.Round),
    )
    val p = point(track, head.toDouble())
    drawCircle(Brush.radialGradient(listOf(Color.White, c.gold, Color.Transparent), p, r * 0.18f), r * 0.18f, p)
    for (i in 0 until 5) drawCircle(Color.White, r * 0.02f, point(r * 0.97f, 72.0 * i + 13), alpha = 0.6f)
}

/** Dark smoke curling off the frame. */
private fun DrawScope.smoke(t: Float) {
    for (i in 0 until 12) {
        val p = (t * 1.5f + noise(i)) % 1f
        val a = 30.0 * i + 50 * t + 20 * wave(p + noise(i, 1))
        val at = point(r * (0.74f + 0.2f * p), a)
        val size = r * (0.14f + 0.16f * p)
        drawCircle(Brush.radialGradient(listOf(Ink, Violet, Color(0xFFA78BFA).copy(alpha = 0.6f), Color.Transparent), at, size), size, at, alpha = 1 - p * 0.6f)
    }
}

/** Petals that turn through the seasons: spring, summer, autumn, winter. */
private fun DrawScope.seasons(t: Float) {
    val tones = listOf(Color(0xFF6EE7A0), Color(0xFFFFD866), Color(0xFFFF8A3D), Color(0xFFE0F2FE))
    val phase = t * tones.size
    val k = floor(phase).toInt()
    val tone = lerp(tones[k % tones.size], tones[(k + 1) % tones.size], phase - k)
    for (i in 0 until 12) {
        rotate(30f * i + 30f * t) {
            drawOval(tone, topLeft = Offset(center.x + r * 0.7f, center.y - r * 0.07f), size = Size(r * 0.3f, r * 0.14f), alpha = 0.9f)
        }
    }
}

/** Ice crystals growing around the frame, turning slowly. */
private fun DrawScope.frost(t: Float) {
    drawCircle(Brush.radialGradient(listOf(Color.Transparent, Ice.copy(alpha = 0.25f), Color.Transparent), center, r), r)
    rotate(30f * t) {
        for (i in 0 until 6) {
            val a = 60.0 * i
            val grow = 0.85f + 0.15f * wave(t * 2 + i / 6f)
            drawLine(Ice, point(r * 0.7f, a), point(r * grow, a), strokeWidth = r * 0.05f, cap = StrokeCap.Round)
            for (b in listOf(-1, 1)) {
                val from = point(r * 0.84f, a)
                drawLine(Color.White, from, point(r * 0.92f * grow, a + b * 10), strokeWidth = r * 0.03f, cap = StrokeCap.Round)
            }
        }
    }
}

/** Black thorns, each its own length, breathing around the frame. */
private fun DrawScope.thorns(t: Float) {
    val breath = 0.93f + 0.07f * wave(t * 2)
    for (i in 0 until 18) {
        val a = 20.0 * i + 10 * wave(t)
        val tip = r * (0.86f + 0.14f * noise(i)) * breath
        val thorn = Path().apply {
            point(r * 0.68f, a - 7).let { moveTo(it.x, it.y) }
            point(tip, a + 3 * (noise(i, 1) - 0.5)).let { lineTo(it.x, it.y) }
            point(r * 0.68f, a + 7).let { lineTo(it.x, it.y) }
            close()
        }
        drawPath(thorn, Brush.radialGradient(listOf(Ink, Ink, Blood, Color(0xFFE11D48)), center, tip))
        drawPath(thorn, Color(0xFFE11D48), alpha = 0.7f, style = Stroke(1.5f))
        if (abs(noise(i, 2)) > 0.6f) drawCircle(Blood, r * 0.03f, point(tip, a), alpha = breath)
    }
}
