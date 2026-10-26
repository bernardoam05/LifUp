package com.lifup.app.domain

import kotlinx.serialization.Serializable

// ── Monthly look back ─────────────────────────────────────────────────────────
//
// The week is too short to see a trend. On the first day of a month the last one is summed up: the days
// from the day log, the rest as the difference between where the counters stood when it began and now.

/** Where things stood when a month began, to tell what it added. */
@Serializable
data class MonthStart(
    val month: String,
    val counters: Map<StatKey, Long> = emptyMap(),
    val attrXp: Attributes = Attributes(),
    val level: Int = 1,
    val echoes: Int = 0,
)

private fun GameState.snapshotMonth(month: String) = MonthStart(month, counters, player.attrXp, player.level, shadows.size)

/** Longest run of kept days in [logs] (in order); rest days neither break a run nor add to it. */
fun bestRun(logs: List<DayLog>): Int {
    var best = 0
    var run = 0
    for (l in logs) {
        when {
            l.rest -> Unit
            l.passed || l.perfect -> { run++; best = maxOf(best, run) }
            else -> run = 0
        }
    }
    return best
}

/** Once a month, after the last day is closed: the report on the month gone by, then a fresh starting point. */
fun Tx.rollMonth() {
    val month = ctx.todayKey.take(7)
    val start = s.monthStart
    if (start?.month == month) return
    if (start != null) {
        val logs = s.dayLog.filter { it.day.startsWith(start.month) }
        if (logs.isNotEmpty()) {
            fun delta(k: StatKey) = (s.count(k) - (start.counters[k] ?: 0L)).coerceAtLeast(0)
            val a = s.player.attrXp
            val b = start.attrXp
            reward {
                Reward.MonthReport(
                    it, start.month,
                    daysKept = logs.count { l -> l.passed || l.perfect }, perfectDays = logs.count { l -> l.perfect },
                    restDays = logs.count { l -> l.rest }, days = logs.size, bestRun = bestRun(logs),
                    quests = delta(StatKey.QUESTS_COMPLETED).toInt(), bosses = delta(StatKey.BOSSES_DEFEATED).toInt(),
                    focusMin = delta(StatKey.FOCUS_MINUTES).toInt(), gold = delta(StatKey.GOLD_EARNED).toInt(),
                    levels = (s.player.level - start.level).coerceAtLeast(0), echoes = (s.shadows.size - start.echoes).coerceAtLeast(0),
                    attrGain = Attributes((a.str - b.str).coerceAtLeast(0), (a.agi - b.agi).coerceAtLeast(0), (a.int - b.int).coerceAtLeast(0), (a.vit - b.vit).coerceAtLeast(0)),
                )
            }
        }
    }
    s = s.copy(monthStart = s.snapshotMonth(month))
}
