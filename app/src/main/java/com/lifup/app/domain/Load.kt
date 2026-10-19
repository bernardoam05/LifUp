package com.lifup.app.domain

import kotlinx.serialization.Serializable

// ── Mission load ──────────────────────────────────────────────────────────────
//
// The number of drawn missions follows consistency, not level: it starts at the base, gains one
// after every run of kept days and loses one per missed day, never all at once. A missed day only
// costs a mission once the next day has passed without the perfect day that would recover it.

/** [extra] drawn missions above the base, the kept days towards the next one, and a drop on hold. */
@Serializable
data class MissionLoad(val extra: Int = 0, val keptRun: Int = 0, val pendingDrop: Boolean = false)

/** Drawn missions for a day, before weekly missions take their places. */
fun GameState.drawnCount(): Int = settings.dailyPoolOverride?.coerceIn(0, 10) ?: (Rules.BASE_DRAWN + load.extra)

/** Kept days still needed for one more mission, or null at the ceiling. */
fun GameState.daysToNextMission(): Int? =
    if (settings.dailyPoolOverride != null || load.extra >= Rules.MAX_LOAD) null else Rules.LOAD_STEP_DAYS - load.keptRun

/** Moves the load after a closed day; [skipped] days without the app opened count as misses. */
internal fun Tx.updateLoad(passed: Boolean, perfect: Boolean, rest: Boolean, skipped: Boolean) {
    val before = s.load
    var l = before
    fun drop() { l = l.copy(extra = (l.extra - 1).coerceAtLeast(0), keptRun = 0) }
    if (skipped) { drop(); l = l.copy(pendingDrop = false) }
    when {
        rest -> Unit
        passed -> {
            // The day after a miss: only a perfect day (the streak recovery) saves the mission.
            if (l.pendingDrop && !perfect) drop()
            else {
                val run = l.keptRun + 1
                l = if (run >= Rules.LOAD_STEP_DAYS && l.extra < Rules.MAX_LOAD) l.copy(extra = l.extra + 1, keptRun = 0) else l.copy(keptRun = run)
            }
            l = l.copy(pendingDrop = false)
        }
        else -> {
            if (l.pendingDrop) drop()
            l = l.copy(keptRun = 0, pendingDrop = l.extra > 0)
        }
    }
    s = s.copy(load = l)
    if (s.settings.dailyPoolOverride == null && l.extra != before.extra) {
        toast(if (l.extra > before.extra) ToastKind.LOAD_UP else ToastKind.LOAD_DOWN, (Rules.BASE_DRAWN + l.extra).toString())
    }
}
