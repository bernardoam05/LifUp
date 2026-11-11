package com.lifup.app.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifup.app.R
import com.lifup.app.domain.Core
import com.lifup.app.domain.CoreMood
import com.lifup.app.domain.CoreSkin

/** The sprites, by form (1..6) then face, in [CoreMood] order up to FRUSTRATED. */
private val SPRITES = listOf(
    listOf(R.drawable.core_s1_neutral, R.drawable.core_s1_confident, R.drawable.core_s1_happy, R.drawable.core_s1_focused, R.drawable.core_s1_relaxed, R.drawable.core_s1_excited, R.drawable.core_s1_tired, R.drawable.core_s1_frustrated),
    listOf(R.drawable.core_s2_neutral, R.drawable.core_s2_confident, R.drawable.core_s2_happy, R.drawable.core_s2_focused, R.drawable.core_s2_relaxed, R.drawable.core_s2_excited, R.drawable.core_s2_tired, R.drawable.core_s2_frustrated),
    listOf(R.drawable.core_s3_neutral, R.drawable.core_s3_confident, R.drawable.core_s3_happy, R.drawable.core_s3_focused, R.drawable.core_s3_relaxed, R.drawable.core_s3_excited, R.drawable.core_s3_tired, R.drawable.core_s3_frustrated),
    listOf(R.drawable.core_s4_neutral, R.drawable.core_s4_confident, R.drawable.core_s4_happy, R.drawable.core_s4_focused, R.drawable.core_s4_relaxed, R.drawable.core_s4_excited, R.drawable.core_s4_tired, R.drawable.core_s4_frustrated),
    listOf(R.drawable.core_s5_neutral, R.drawable.core_s5_confident, R.drawable.core_s5_happy, R.drawable.core_s5_focused, R.drawable.core_s5_relaxed, R.drawable.core_s5_excited, R.drawable.core_s5_tired, R.drawable.core_s5_frustrated),
    listOf(R.drawable.core_s6_neutral, R.drawable.core_s6_confident, R.drawable.core_s6_happy, R.drawable.core_s6_focused, R.drawable.core_s6_relaxed, R.drawable.core_s6_excited, R.drawable.core_s6_tired, R.drawable.core_s6_frustrated),
)

private fun sprite(stage: Int, mood: CoreMood): Int {
    val face = if (mood == CoreMood.SLEEPING) CoreMood.RELAXED else mood
    return SPRITES[stage.coerceIn(1, Core.STAGES) - 1][face.ordinal]
}

/** Each form wears its rank's colour (E/D green, C blue, B purple, A pink, S gold, SS red). */
private val STAGE_COLORS = listOf(0xFF10B981, 0xFF3B82F6, 0xFF8B5CF6, 0xFFEC4899, 0xFFFBBF24, 0xFFEF4444).map { Color(it) }

fun coreColor(stage: Int): Color = STAGE_COLORS[stage.coerceIn(1, Core.STAGES) - 1]

/** The first form's green, for places that don't know the form. */
val CoreGreen = STAGE_COLORS[0]

/**
 * Where each form's face sits in its sprite (centre x, centre y, face width, as fractions), measured from the
 * neutral sprite. Small avatars zoom in on it, so the face stays readable on the bigger, taller forms.
 */
private val FACES = listOf(
    floatArrayOf(0.517f, 0.545f, 0.291f),
    floatArrayOf(0.516f, 0.476f, 0.270f),
    floatArrayOf(0.529f, 0.455f, 0.281f),
    floatArrayOf(0.547f, 0.444f, 0.238f),
    floatArrayOf(0.534f, 0.410f, 0.178f),
    floatArrayOf(0.513f, 0.443f, 0.131f),
)

/**
 * The Core: the form [stage] with the face [mood], breathing gently, with a soft glow behind it in the form's
 * colour unless [glow] says otherwise. Asleep, Zs drift up; excited, it bounces. [locked] shows only its
 * silhouette. [bust] (small sizes by default) frames the head instead of the whole body.
 */
@Composable
fun CoreAvatar(
    stage: Int, mood: CoreMood, size: Dp, modifier: Modifier = Modifier, glow: Color? = null, locked: Boolean = false,
    animate: Boolean = true, bust: Boolean = size < 100.dp, skin: CoreSkin? = com.lifup.app.ui.gameState().settings.coreSkin,
) {
    val tint = glow ?: coreColor(stage)
    val t = rememberInfiniteTransition(label = "core")
    val breath by t.animateFloat(0f, 1f, infiniteRepeatable(tween(if (mood == CoreMood.EXCITED) 520 else 2600, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "breath")
    val b = if (animate && !locked) breath else 0.5f
    Box(modifier.size(size).then(if (bust) Modifier.clip(CircleShape) else Modifier), contentAlignment = Alignment.Center) {
        if (!locked) Box(
            Modifier.fillMaxSize().alpha(0.35f + 0.2f * b)
                .background(Brush.radialGradient(listOf(tint.copy(alpha = 0.55f), Color.Transparent))),
        )
        val lift = if (mood == CoreMood.EXCITED) 0.06f else 0.025f
        val sizePx = with(LocalDensity.current) { size.toPx() }
        val face = FACES[stage.coerceIn(1, Core.STAGES) - 1]
        // Bust: the face takes about a third of the width, a little above the middle; the big forms stop at 2.2x.
        val zoom = if (bust) (0.33f / face[2]).coerceIn(1f, 2.2f) else 1f
        // The sprite and its accessory move together (breathing, bust framing).
        Box(
            Modifier.fillMaxSize().graphicsLayer {
                val sc = (if (mood == CoreMood.SLEEPING) 1f + 0.015f * b else 1f) * zoom
                scaleX = sc; scaleY = sc
                if (bust) {
                    transformOrigin = TransformOrigin(face[0], face[1])
                    translationX = (0.5f - face[0]) * sizePx
                    translationY = (0.46f - face[1]) * sizePx - sizePx * lift * b
                } else translationY = -sizePx * lift * b
            },
        ) {
            Image(
                painterResource(sprite(stage, mood)), null,
                colorFilter = if (locked) ColorFilter.tint(Color(0xFF2A3140)) else null,
                modifier = Modifier.fillMaxSize(),
            )
            if (skin != null && !locked) Accessory(skin, stage, face, size)
        }
        if (mood == CoreMood.SLEEPING && animate && !locked) {
            val z by t.animateFloat(0f, 1f, infiniteRepeatable(tween(2400, easing = LinearEasing)), label = "z")
            listOf(0f, 0.5f).forEach { phase ->
                val p = (z + phase) % 1f
                Text(
                    "z", color = tint.copy(alpha = (1 - p) * 0.9f), fontWeight = FontWeight.Bold,
                    fontSize = (size.value * (0.10f + 0.06f * p)).sp,
                    modifier = Modifier.align(Alignment.TopEnd).offset(x = -(size * 0.08f) + size * 0.06f * p, y = size * 0.22f - size * 0.22f * p),
                )
            }
        }
    }
}

/** Each accessory's picture, its height/width, and where it sits: width and anchor in face widths, anchored edge, tilt. */
private class Wear(val res: Int, val aspect: Float, val width: Float, val dy: Float, val edge: Int, val tilt: Float)

private const val BOTTOM = 0
private const val CENTER = 1
private const val TOP = 2

private fun wear(skin: CoreSkin) = when (skin) {
    CoreSkin.PUMPKIN -> Wear(R.drawable.core_acc_pumpkin, 0.869f, 1.50f, -0.40f, BOTTOM, 0f)
    CoreSkin.SCARF -> Wear(R.drawable.core_acc_scarf, 0.887f, 1.50f, 0.40f, TOP, 0f)
    CoreSkin.PARTY_HAT -> Wear(R.drawable.core_acc_party_hat, 1.081f, 0.85f, -0.48f, BOTTOM, 12f)
    CoreSkin.FLOWER_CROWN -> Wear(R.drawable.core_acc_flower_crown, 0.625f, 1.45f, -0.36f, BOTTOM, 0f)
    // Pushed up on the hood: the eyes carry the expressions.
    CoreSkin.SUNGLASSES -> Wear(R.drawable.core_acc_sunglasses, 0.434f, 1.00f, -0.56f, CENTER, 0f)
}

/** The accessory on the Core's head (or neck), placed from where the form's face is (see [FACES]). */
@Composable
private fun Accessory(skin: CoreSkin, stage: Int, face: FloatArray, size: Dp) {
    val w = wear(skin)
    // The last two forms have a small face inside a big hood: measure them a bit larger.
    val fw = face[2] * when (stage) { 5 -> 1.45f; 6 -> 1.75f; else -> 1f }
    val width = size * (w.width * fw)
    val height = width * w.aspect
    val anchorY = size * (face[1] + w.dy * fw)
    val top = when (w.edge) { BOTTOM -> anchorY - height; CENTER -> anchorY - height / 2; else -> anchorY }
    Image(
        painterResource(w.res), null,
        modifier = Modifier.offset(x = size * face[0] - width / 2, y = top).size(width, height).graphicsLayer { rotationZ = w.tilt },
    )
}
