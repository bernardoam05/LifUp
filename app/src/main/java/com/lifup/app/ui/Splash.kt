package com.lifup.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.lifup.app.domain.Core
import com.lifup.app.domain.CoreMood
import com.lifup.app.ui.components.CoreAvatar
import kotlinx.coroutines.delay

/** Shown once per process start: the system splash has no picture, so this is where the player's Core appears. */
private object SplashSession { var shown = false }

/**
 * The opening: the player's own Core, whole, in its form, skin and accessory, pops in on the splash colour and
 * fades into the app. Under a second; once per launch.
 */
@Composable
fun Splash() {
    if (SplashSession.shown) return
    var done by remember { mutableStateOf(false) }
    if (done) return
    val s = gameState()
    val scale = remember { Animatable(0.85f) }
    val fade = remember { Animatable(1f) }
    LaunchedEffect(Unit) {
        scale.animateTo(1f, tween(380, easing = FastOutSlowInEasing))
        delay(260)
        fade.animateTo(0f, tween(260))
        SplashSession.shown = true
        done = true
    }
    Box(Modifier.fillMaxSize().alpha(fade.value).background(Color(0xFF0B0D12)), contentAlignment = Alignment.Center) {
        Box(Modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value }) {
            // Later forms are bigger: the evolution shows from the first second.
            val stage = Core.stage(s)
            CoreAvatar(stage, CoreMood.HAPPY, (160 + 16 * (stage - 1)).dp, bust = false, animate = false)
        }
    }
}
