package com.lifup.app.ui.focus

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.lifup.app.domain.Quest
import com.lifup.app.ui.content
import kotlin.math.ceil

/** A mission asking the focus screen to set itself up for it (filled in, not started). */
object FocusPrep {
    var questId by mutableStateOf<String?>(null)
}

/** Older saves don't carry the flag on today's quests, so the definition decides too. */
fun Quest.usesPomodoro() = pomodoro || content.questDefById[defId]?.pomodoro == true

fun Quest.minutesLeft() = ceil(target - progress).toInt().coerceAtLeast(1)
