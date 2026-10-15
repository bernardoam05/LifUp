package com.lifup.app.ui.focus

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.lifup.app.domain.Quest
import com.lifup.app.domain.usesPomodoro
import com.lifup.app.ui.content
import kotlin.math.ceil

/** A mission asking the focus screen to set itself up for it (filled in, not started). */
object FocusPrep {
    var questId by mutableStateOf<String?>(null)
}

fun Quest.usesPomodoro() = usesPomodoro(content)

fun Quest.minutesLeft() = ceil(target - progress).toInt().coerceAtLeast(1)
