package com.lifup.app.domain

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
fun Tx.applyAuto(r: AutoReading) {
    if (r.day != s.day) return
    s.allQuests.filter { it.auto != null && it.status == QuestStatus.OPEN }.forEach { q ->
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
