package com.lifup.app.ui.guide

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.lifup.app.domain.GameState
import com.lifup.app.domain.markGuideSeen
import com.lifup.app.ui.Tab
import com.lifup.app.ui.act
import kotlinx.coroutines.delay

/** Topics each tab introduces, in order; [GameState] decides which are relevant right now. */
private fun topicsFor(tab: Tab, s: GameState): List<Guide> = when (tab) {
    Tab.TODAY -> listOfNotNull(
        Guide.DAILY,
        Guide.PENALTY.takeIf { s.penalty.active },
        Guide.PORTAL.takeIf { s.portal != null },
        Guide.BOSS,
        Guide.STREAK,
        Guide.SIDE,
    )
    Tab.FOCUS -> listOf(Guide.FOCUS)
    Tab.HERO -> listOf(Guide.SHADOWS)
    Tab.SHOP -> listOf(Guide.SHOP)
}

/** Tabs that already showed a guide since the app started: one new topic per tab per launch. */
private object GuideSession { val shown = mutableSetOf<Tab>() }

/**
 * Introduces the game one topic at a time: the first visit to a tab explains its main idea, later
 * launches explain the next unseen topic, so nothing arrives as a wall of text.
 */
@Composable
fun AutoGuide(s: GameState, tab: Tab) {
    var open by remember(tab) { mutableStateOf<Guide?>(null) }
    // Never on top of a reward card.
    val busy = s.rewards.any { it !is com.lifup.app.domain.Reward.Toast } || com.lifup.app.ui.CrashUi.report != null
    LaunchedEffect(tab, busy) {
        if (busy || tab in GuideSession.shown) return@LaunchedEffect
        val next = topicsFor(tab, s).firstOrNull { it.name !in s.seenGuides } ?: return@LaunchedEffect
        delay(600) // let the tab settle before covering it
        GuideSession.shown += tab
        open = next
    }
    open?.let { topic ->
        GuideSheet(topic, s) {
            act { markGuideSeen(topic.name) }
            open = null
        }
    }
}
