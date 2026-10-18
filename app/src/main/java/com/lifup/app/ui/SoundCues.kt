package com.lifup.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.lifup.app.domain.GameState
import com.lifup.app.domain.StatKey

/**
 * Small cues for everyday actions, driven by the stat counters so every way of finishing a mission,
 * ticking a side quest, buying or ending a focus session is covered. One cue per change, most important first.
 */
@Composable
fun SoundCues(s: GameState) {
    val context = LocalContext.current
    val now = listOf(StatKey.FOCUS_SESSIONS, StatKey.QUESTS_COMPLETED, StatKey.SIDE_COMPLETED, StatKey.GOLD_SPENT).map { s.count(it) }
    var last by remember { mutableStateOf<List<Long>?>(null) }
    LaunchedEffect(now) {
        val prev = last
        last = now
        if (prev == null) return@LaunchedEffect
        when {
            now[0] > prev[0] -> { Feedback.play(context, Sfx.FOCUS); Feedback.buzz(context, strong = true) }
            now[1] > prev[1] -> { Feedback.play(context, Sfx.QUEST); Feedback.buzz(context) }
            now[2] > prev[2] -> Feedback.buzz(context) // side quests are small and frequent: touch only, no sound
            now[3] > prev[3] -> Feedback.play(context, Sfx.COINS)
        }
    }
}
