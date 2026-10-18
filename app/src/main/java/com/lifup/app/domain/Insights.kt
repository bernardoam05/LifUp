package com.lifup.app.domain

import java.time.LocalDate
import java.time.temporal.ChronoUnit

// ── Mission stats and adaptive targets ────────────────────────────────────────

/** Missions whose target can sensibly grow or shrink (counts, minutes, distance, limits). */
fun QuestDef.adaptable() = type != QuestType.FORBIDDEN && fromHour == null && baseTarget >= 2

/** Target multiplier for an adapt level: harder means more, except for limits where harder means less. */
fun adaptFactor(type: QuestType, level: Int) =
    if (type == QuestType.LIMIT) 1 - Rules.ADAPT_STEP * level else 1 + Rules.ADAPT_STEP * level

/** Records a closed day's daily missions and nudges each one's target toward what the user really does. */
fun Tx.recordMissions(daily: List<Quest>) {
    var stats = s.missionStats
    var week = s.weekStats
    var adapt = s.adapt
    // Weekly missions are judged by their week, not by single days.
    for (q in daily.filter { it.perWeek == null }) {
        val ok = q.isSuccessful()
        stats = stats + (q.defId to (stats[q.defId] ?: MissionStat()).add(ok))
        week = week + (q.defId to (week[q.defId] ?: MissionStat()).add(ok))
        val def = content.questDefById[q.defId] ?: s.customDefs.firstOrNull { it.id == q.defId }
        if (def?.adaptable() == true) adapt = adapt + (q.defId to (adapt[q.defId] ?: Adapt()).next(ok))
    }
    s = s.copy(missionStats = stats, weekStats = week, adapt = adapt)
}

private fun Adapt.next(ok: Boolean): Adapt = when {
    ok && wins + 1 >= Rules.ADAPT_UP_AFTER -> Adapt((level + 1).coerceAtMost(Rules.ADAPT_MAX), 0, 0)
    ok -> copy(wins = wins + 1, losses = 0)
    losses + 1 >= Rules.ADAPT_DOWN_AFTER -> Adapt((level - 1).coerceAtLeast(-Rules.ADAPT_MAX), 0, 0)
    else -> copy(wins = 0, losses = losses + 1)
}

// ── Today's goal ──────────────────────────────────────────────────────────────

/** Missions kept so far, how many keep the streak, and the day's total. */
data class DayGoal(val kept: Int, val needed: Int, val total: Int) {
    val safe get() = kept >= needed
}

fun GameState.dayGoal(): DayGoal {
    val daily = countedQuests()
    val needed = kotlin.math.ceil(daily.size * Rules.passRatio(settings.rigor) - 1e-9).toInt()
    return DayGoal(daily.count { it.isSuccessful() }, needed, daily.size)
}

/** An open bedtime check-in that the user should be nudged about. */
fun GameState.openBedtime(): Quest? = dailyQuests.firstOrNull { it.fromHour != null && it.status == QuestStatus.OPEN }

// ── Weekly report ─────────────────────────────────────────────────────────────

/** On the first run of a new week, sums up the previous one and starts fresh stats. */
fun Tx.rollWeek() {
    if (s.statsWeek == ctx.weekKey) return
    if (s.statsWeek.isEmpty()) {
        s = s.copy(statsWeek = ctx.weekKey)
        return
    }
    val start = LocalDate.parse(s.statsWeek)
    val end = start.plusDays(6)
    val logs = s.dayLog.filter { LocalDate.parse(it.day) in start..end }
    val kept = logs.count { it.passed || it.perfect }
    // Weeks with nothing logged (app unused) produce no report.
    if (logs.isNotEmpty() && ChronoUnit.DAYS.between(end, ctx.today) < 7) {
        val rated = s.weekStats.filter { it.value.total >= Rules.WEEK_MIN_SAMPLES }
        val best = rated.maxByOrNull { it.value.rate }
        val worst = rated.minByOrNull { it.value.rate }?.takeIf { it.key != best?.key }
        val boss = s.boss?.takeIf { it.weekKey == s.statsWeek }
        reward {
            Reward.WeekReport(
                it, s.statsWeek, kept, logs.count { l -> l.perfect }, logs.count { l -> l.rest }, logs.size, s.lastWeekKept,
                best?.key, best?.value?.rate ?: 0.0, worst?.key, worst?.value?.rate ?: 0.0, boss?.bossId, boss?.defeated == true, s.weekLines(s.statsWeek),
            )
        }
    }
    s = s.copy(statsWeek = ctx.weekKey, weekStats = emptyMap(), lastWeekKept = if (logs.isEmpty()) s.lastWeekKept else kept)
}

// ── Guides ────────────────────────────────────────────────────────────────────

fun Tx.markEchoesSeen() {
    if (s.newEchoes.isNotEmpty()) s = s.copy(newEchoes = emptyMap())
}

fun Tx.markItemsSeen() {
    if (s.newItems.isNotEmpty()) s = s.copy(newItems = emptySet())
}

fun Tx.markGuideSeen(id: String) {
    if (id !in s.seenGuides) s = s.copy(seenGuides = s.seenGuides + id)
}
