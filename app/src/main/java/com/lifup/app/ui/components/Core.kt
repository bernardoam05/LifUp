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
            // The scarf's back band goes behind the Core: only its ends show beside the neck.
            if (skin == CoreSkin.SCARF && !locked) Accessory(skin, stage, size, back = true)
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
    CoreSkin.SCARF -> 0.887f
    CoreSkin.PARTY_HAT -> 1.081f
    CoreSkin.FLOWER_CROWN -> 0.625f
    CoreSkin.SUNGLASSES -> 0.434f
}

/** Where each accessory sits on each form: left, top and width as fractions of the sprite, fitted form by form. */
private val PLACE: Map<CoreSkin, List<FloatArray>> = mapOf(
    CoreSkin.PUMPKIN to listOf(floatArrayOf(0.265f, 0.075f, 0.500f), floatArrayOf(0.249f, 0.067f, 0.517f), floatArrayOf(0.299f, 0.109f, 0.455f), floatArrayOf(0.321f, 0.124f, 0.430f), floatArrayOf(0.344f, 0.181f, 0.331f), floatArrayOf(0.357f, 0.180f, 0.295f)),
    CoreSkin.SCARF to listOf(floatArrayOf(0.354f, 0.511f, 0.343f), floatArrayOf(0.294f, 0.386f, 0.440f), floatArrayOf(0.321f, 0.391f, 0.426f), floatArrayOf(0.355f, 0.397f, 0.390f), floatArrayOf(0.349f, 0.455f, 0.323f), floatArrayOf(0.344f, 0.485f, 0.323f)),
    CoreSkin.PARTY_HAT to listOf(floatArrayOf(0.367f, 0.021f, 0.339f), floatArrayOf(0.354f, 0.005f, 0.344f), floatArrayOf(0.361f, -0.001f, 0.348f), floatArrayOf(0.380f, 0.006f, 0.314f), floatArrayOf(0.444f, 0.103f, 0.223f), floatArrayOf(0.442f, 0.101f, 0.212f)),
    CoreSkin.FLOWER_CROWN to listOf(floatArrayOf(0.311f, 0.274f, 0.416f), floatArrayOf(0.302f, 0.235f, 0.423f), floatArrayOf(0.295f, 0.238f, 0.449f), floatArrayOf(0.304f, 0.210f, 0.453f), floatArrayOf(0.311f, 0.251f, 0.423f), floatArrayOf(0.278f, 0.255f, 0.424f)),
    CoreSkin.SUNGLASSES to listOf(floatArrayOf(0.342f, 0.359f, 0.357f), floatArrayOf(0.345f, 0.268f, 0.340f), floatArrayOf(0.341f, 0.265f, 0.375f), floatArrayOf(0.351f, 0.275f, 0.369f), floatArrayOf(0.364f, 0.247f, 0.323f), floatArrayOf(0.362f, 0.262f, 0.306f)),
)

@Composable
private fun Accessory(skin: CoreSkin, stage: Int, size: Dp, back: Boolean = false) {
    val res = if (back) { if (skin == CoreSkin.SCARF) R.drawable.core_acc_scarf_back else return } else art(skin)
    val (left, top, width) = PLACE.getValue(skin)[stage.coerceIn(1, Core.STAGES) - 1].let { Triple(it[0], it[1], it[2]) }
    Image(
        painterResource(res), null,
        modifier = Modifier.offset(x = size * left, y = size * top).size(size * width, size * width * aspect(skin)),
    )
}
