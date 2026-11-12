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
import com.lifup.app.domain.CorePaint
import com.lifup.app.domain.shownPaint

/** The sprites, by form (1..6) then face, in [CoreMood] order up to FRUSTRATED. */
private val SPRITES = listOf(
    listOf(R.drawable.core_s1_neutral, R.drawable.core_s1_confident, R.drawable.core_s1_happy, R.drawable.core_s1_focused, R.drawable.core_s1_relaxed, R.drawable.core_s1_excited, R.drawable.core_s1_tired, R.drawable.core_s1_frustrated),
    listOf(R.drawable.core_s2_neutral, R.drawable.core_s2_confident, R.drawable.core_s2_happy, R.drawable.core_s2_focused, R.drawable.core_s2_relaxed, R.drawable.core_s2_excited, R.drawable.core_s2_tired, R.drawable.core_s2_frustrated),
    listOf(R.drawable.core_s3_neutral, R.drawable.core_s3_confident, R.drawable.core_s3_happy, R.drawable.core_s3_focused, R.drawable.core_s3_relaxed, R.drawable.core_s3_excited, R.drawable.core_s3_tired, R.drawable.core_s3_frustrated),
    listOf(R.drawable.core_s4_neutral, R.drawable.core_s4_confident, R.drawable.core_s4_happy, R.drawable.core_s4_focused, R.drawable.core_s4_relaxed, R.drawable.core_s4_excited, R.drawable.core_s4_tired, R.drawable.core_s4_frustrated),
    listOf(R.drawable.core_s5_neutral, R.drawable.core_s5_confident, R.drawable.core_s5_happy, R.drawable.core_s5_focused, R.drawable.core_s5_relaxed, R.drawable.core_s5_excited, R.drawable.core_s5_tired, R.drawable.core_s5_frustrated),
    listOf(R.drawable.core_s6_neutral, R.drawable.core_s6_confident, R.drawable.core_s6_happy, R.drawable.core_s6_focused, R.drawable.core_s6_relaxed, R.drawable.core_s6_excited, R.drawable.core_s6_tired, R.drawable.core_s6_frustrated),
)

/** The sprite for [stage] and [mood] (in a LifUp+ [paint]), for places that draw it themselves (the widget). */
fun coreSprite(stage: Int, mood: CoreMood, paint: CorePaint? = null): Int = sprite(stage, mood, paint)

private fun sprite(stage: Int, mood: CoreMood, paint: CorePaint? = null): Int {
    val face = if (mood == CoreMood.SLEEPING) CoreMood.RELAXED else mood
    val table = paint?.let { PAINT_SPRITES[it] } ?: SPRITES
    return table[stage.coerceIn(1, Core.STAGES) - 1][face.ordinal]
}

/** A skin's own glow colour (the rank's otherwise). */
fun paintColor(paint: CorePaint): Color = when (paint) {
    CorePaint.AURORA -> Color(0xFF7DD3FC)
    CorePaint.SHADOW -> Color(0xFF22D3EE)
    CorePaint.CRYSTAL -> Color(0xFFBAE6FD)
    CorePaint.GHOST -> Color(0xFFC4B5FD)
    CorePaint.LAVA -> Color(0xFFF97316)
    CorePaint.GALAXY -> Color(0xFF818CF8)
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
    floatArrayOf(0.520f, 0.461f, 0.266f),
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
    paint: CorePaint? = com.lifup.app.ui.gameState().shownPaint,
) {
    val tint = glow ?: paint?.let { paintColor(it) } ?: coreColor(stage)
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
                painterResource(sprite(stage, mood, paint)), null,
                colorFilter = if (locked) ColorFilter.tint(Color(0xFF2A3140)) else null,
                modifier = Modifier.fillMaxSize(),
            )
            if (skin != null && !locked) Accessory(skin, stage, size)
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

/** Each accessory's picture (and the scarf's back band, drawn behind the Core). */
private fun art(skin: CoreSkin) = when (skin) {
    CoreSkin.PUMPKIN -> R.drawable.core_acc_pumpkin
    CoreSkin.SCARF -> R.drawable.core_acc_scarf
    CoreSkin.PARTY_HAT -> R.drawable.core_acc_party_hat
    CoreSkin.FLOWER_CROWN -> R.drawable.core_acc_flower_crown
    CoreSkin.SUNGLASSES -> R.drawable.core_acc_sunglasses
}

private fun aspect(skin: CoreSkin) = when (skin) {
    CoreSkin.PUMPKIN -> 0.869f
    CoreSkin.SCARF -> 0.817f
    CoreSkin.PARTY_HAT -> 1.081f
    CoreSkin.FLOWER_CROWN -> 0.625f
    CoreSkin.SUNGLASSES -> 0.434f
}

/** Where each accessory sits on each form: left, top and width as fractions of the sprite, and its tilt in degrees (laid out by hand). */
private val PLACE: Map<CoreSkin, List<FloatArray>> = mapOf(
    CoreSkin.PUMPKIN to listOf(floatArrayOf(0.2636f, 0.1402f, 0.5357f, 6.6f), floatArrayOf(0.2602f, 0.1003f, 0.4872f, 0.0f), floatArrayOf(0.2868f, 0.0722f, 0.4650f, 0.0f), floatArrayOf(0.3407f, 0.1286f, 0.4104f, 0.0f), floatArrayOf(0.4187f, 0.1799f, 0.2790f, 11.5f), floatArrayOf(0.3713f, 0.2131f, 0.2851f, -6.5f)),
    CoreSkin.SCARF to listOf(floatArrayOf(0.3906f, 0.6393f, 0.2828f, 0.0f), floatArrayOf(0.2887f, 0.5330f, 0.4334f, 0.0f), floatArrayOf(0.3309f, 0.5233f, 0.4022f, 0.0f), floatArrayOf(0.3965f, 0.5133f, 0.3145f, 0.0f), floatArrayOf(0.4111f, 0.4685f, 0.2487f, 0.0f), floatArrayOf(0.4196f, 0.4936f, 0.2249f, 0.0f)),
    CoreSkin.PARTY_HAT to listOf(floatArrayOf(0.2606f, 0.0328f, 0.3879f, -9.1f), floatArrayOf(0.2840f, -0.0223f, 0.3832f, -7.3f), floatArrayOf(0.2929f, -0.0499f, 0.3832f, -7.3f), floatArrayOf(0.3010f, -0.0061f, 0.3631f, -9.1f), floatArrayOf(0.3790f, 0.1242f, 0.2225f, -16.0f), floatArrayOf(0.3625f, 0.1557f, 0.2303f, -17.8f)),
    CoreSkin.FLOWER_CROWN to listOf(floatArrayOf(0.3075f, 0.3172f, 0.4464f, 0.0f), floatArrayOf(0.2944f, 0.2493f, 0.4464f, 0.0f), floatArrayOf(0.3095f, 0.2101f, 0.4464f, 0.0f), floatArrayOf(0.3738f, 0.2735f, 0.3087f, -10.9f), floatArrayOf(0.3910f, 0.2678f, 0.2733f, -3.1f), floatArrayOf(0.3906f, 0.3070f, 0.2733f, -3.1f)),
    CoreSkin.SUNGLASSES to listOf(floatArrayOf(0.3480f, 0.3131f, 0.3674f, 0.0f), floatArrayOf(0.3211f, 0.2423f, 0.4033f, 0.0f), floatArrayOf(0.3333f, 0.2199f, 0.4033f, 0.0f), floatArrayOf(0.4024f, 0.2752f, 0.2914f, 0.0f), floatArrayOf(0.4171f, 0.2735f, 0.2429f, 0.0f), floatArrayOf(0.4230f, 0.3105f, 0.2217f, 0.0f)),
)

@Composable
private fun Accessory(skin: CoreSkin, stage: Int, size: Dp, back: Boolean = false) {
    if (back) return
    val p = PLACE.getValue(skin)[stage.coerceIn(1, Core.STAGES) - 1]
    Image(
        painterResource(art(skin)), null,
        modifier = Modifier.offset(x = size * p[0], y = size * p[1]).size(size * p[2], size * p[2] * aspect(skin))
            .graphicsLayer { rotationZ = p[3] },
    )
}
