package com.lifup.app.domain

import kotlin.math.roundToInt

/** Device measurements for one day. A null field means that source isn't available (no sensor or permission). */
data class AutoReading(
    val day: String,
    val steps: Int? = null,
    val screenMinutes: Double? = null,
    val distractionMinutes: Double? = null,
)

/**
 * Feeds automatic quests. Steps complete a quest when they reach the target; screen-time limits break
 * (status FAILED) as soon as usage passes the limit. Readings for any day other than the open one are ignored.
 */
fun Tx.setScreenMeasurable(on: Boolean) {
    if (s.screenMeasurable != on) s = s.copy(screenMeasurable = on)
}

fun Tx.applyAuto(r: AutoReading) {
    if (r.day != s.day) return
    r.steps?.takeIf { it > s.daily.steps }?.let { s = s.copy(daily = s.daily.copy(steps = it)) }
    s.allQuests.filter { it.auto != null && !it.autoOff && it.status == QuestStatus.OPEN }.forEach { q ->
        val value = when (q.auto) {
            AutoKind.STEPS -> r.steps?.toDouble()
            AutoKind.WALK_DISTANCE -> r.steps?.let { Stride.walkKm(it.toLong(), s.settings.heightCm) }
            AutoKind.SCREEN_TIME -> r.screenMinutes?.let { it / 60.0 }
            AutoKind.DISTRACTION_TIME -> r.distractionMinutes?.let { it / 60.0 }
            null -> null
        } ?: return@forEach
        val rounded = (value * 100).toLong() / 100.0
        when (q.auto) {
            AutoKind.STEPS, AutoKind.WALK_DISTANCE -> {
                // Never lowers progress: distance logged by hand or by a run stays.
                updateQuestProgress(q.id, minOf(maxOf(rounded, q.progress), q.target))
                if (rounded >= q.target) completeQuest(q.id)
            }
            else -> {
                updateQuestProgress(q.id, rounded)
                if (rounded > q.target) toggleFailed(q.id)
            }
        }
    }
}

/**
 * Measured limits close to breaking: still within the limit but with a quarter of it, or 20 min,
 * left (whichever is more), so a 15-minute refresh still catches them in time. Paired with minutes left.
 */
fun GameState.limitsNearing(): List<Pair<Quest, Int>> = allQuests
    .filter { it.type == QuestType.LIMIT && it.auto != null && !it.autoOff && it.status == QuestStatus.OPEN }
    .mapNotNull { q ->
        val left = q.target - q.progress
        q.takeIf { left >= 0 && left <= maxOf(q.target * Rules.LIMIT_WARN_SHARE, Rules.LIMIT_WARN_MIN / 60.0) }
            ?.let { it to (left * 60).roundToInt() }
    }
