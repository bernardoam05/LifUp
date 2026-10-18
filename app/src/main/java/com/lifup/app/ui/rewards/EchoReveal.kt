package com.lifup.app.ui.rewards

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.lifup.app.domain.ShadowDef
import com.lifup.app.domain.ShadowRank
import com.lifup.app.ui.Feedback
import com.lifup.app.ui.Sfx
import com.lifup.app.ui.hero.EchoEmblem
import com.lifup.app.ui.shadowIcon
import com.lifup.app.ui.shadowRankColor
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.sin

/** Only new echoes of Epic rank and above earn a reveal; everything else shows its card straight away. */
fun ShadowDef.deservesReveal() = rank >= ShadowRank.KNIGHT

/**
 * Suspense before a rare new echo: a neutral silhouette pulses faster and brighter while the sound
 * builds, then bursts into its rarity colour on the hit. Longer for Legendary and Mythic. Tap skips.
 */
@Composable
fun EchoReveal(def: ShadowDef, onDone: () -> Unit) {
    val context = LocalContext.current
    val buildMs = if (def.rank >= ShadowRank.COMMANDER) 2200 else 1200
    val color = shadowRankColor(def.rank)
    val build = remember { Animatable(0f) }
    val burst = remember { Animatable(0f) }
    val pop = remember { Animatable(0.6f) }

    LaunchedEffect(Unit) {
        // The captured sound swells for ~1.15 s before its hit; start it so the hit lands on the reveal.
        launch { delay((buildMs - 1150L).coerceAtLeast(0)); Feedback.play(context, Sfx.SHADOW) }
        build.animateTo(1f, tween(buildMs, easing = LinearEasing))
        Feedback.buzz(context, strong = true)
        if (def.rank == ShadowRank.MARSHAL) Feedback.play(context, Sfx.VICTORY)
        launch { pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = Spring.StiffnessLow)) }
        burst.animateTo(1f, tween(900))
        delay(500)
        onDone()
    }

    Dialog(onDismissRequest = onDone, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(
            Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.88f))
                .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onDone),
            contentAlignment = Alignment.Center,
        ) {
            val t = build.value
            if (burst.value == 0f) {
                // Build-up: the pulse quickens and the glow grows; rarity stays hidden until the hit.
                val pulse = 1f + 0.06f * sin(t * t * 40f)
                Box(Modifier.size(240.dp).scale(0.8f + 0.4f * t).clip(CircleShape).background(Brush.radialGradient(listOf(Color.White.copy(alpha = 0.10f + 0.35f * t), Color.Transparent))))
                Box(Modifier.size(120.dp).scale(pulse).clip(CircleShape).background(Color.White.copy(alpha = 0.06f + 0.1f * t)), contentAlignment = Alignment.Center) {
                    Icon(shadowIcon(def.shadowClass), null, tint = Color.White.copy(alpha = 0.25f + 0.6f * t), modifier = Modifier.size(56.dp))
                }
            } else {
                val b = burst.value
                // Burst: rays and a ring in the rarity colour, a white flash fading out, the emblem springing in.
                Canvas(Modifier.size(360.dp).alpha(1f - b * 0.6f)) {
                    val center = Offset(size.width / 2, size.height / 2)
                    val rays = if (def.rank >= ShadowRank.COMMANDER) 16 else 10
                    repeat(rays) { i ->
                        val a = (i * 2 * Math.PI / rays + b * 0.6).toFloat()
                        val r1 = size.minDimension * 0.18f
                        val r2 = size.minDimension * (0.25f + 0.3f * b)
                        drawLine(color, center + Offset(cos(a) * r1, sin(a) * r1), center + Offset(cos(a) * r2, sin(a) * r2), strokeWidth = 6f * (1 - b) + 2f)
                    }
                    drawCircle(color.copy(alpha = 0.5f * (1 - b)), radius = size.minDimension * (0.2f + 0.3f * b), style = androidx.compose.ui.graphics.drawscope.Stroke(8f))
                }
                Box(Modifier.size(260.dp).clip(CircleShape).background(Brush.radialGradient(listOf(color.copy(alpha = 0.55f * (1 - b * 0.5f)), Color.Transparent))))
                EchoEmblem(def, known = true, size = 140.dp, modifier = Modifier.scale(pop.value))
                Box(Modifier.fillMaxSize().background(Color.White.copy(alpha = (0.7f * (1 - b * 3)).coerceAtLeast(0f))))
            }
        }
    }
}
