package com.lifup.app.domain

import java.time.LocalDate
import java.time.temporal.ChronoUnit

// ── Mission stats and progression ─────────────────────────────────────────────

/** Missions whose target moves with how they go: those with an increase (never avoid missions or check-ins). */
fun QuestDef.progresses() = scalingAmount > 0 && type != QuestType.FORBIDDEN && fromHour == null

/** The target after [step] steps: up to the peak (or the top), and never eased by more than half the base. */
fun QuestDef.targetAt(step: Int): Double {
    if (!progresses()) return baseTarget
    val cap = peakTarget ?: maxTarget
    return if (descending) (baseTarget - step * scalingAmount).coerceAtLeast(minOf(cap ?: 0.0, baseTarget)).coerceAtMost(baseTarget * 1.5)
    else (baseTarget + step * scalingAmount).coerceAtMost(maxOf(cap ?: Double.MAX_VALUE, baseTarget)).coerceAtLeast(baseTarget / 2)
}

/** Whether [step] is at or past the comfortable top, where growth slows down. */
fun QuestDef.pastTop(step: Int): Boolean = maxTarget?.let { top -> if (descending) targetAt(step) <= top else targetAt(step) >= top } ?: false

/** Keeps a step up needs from [step]: the mission's cadence, slower past its comfortable top. */
fun QuestDef.keepsFor(step: Int): Int = scalingInterval * if (pastTop(step)) Rules.PROG_PAST_TOP_PACE else 1

/** Reward multiplier for a grown (or eased) target. */
fun QuestDef.rewardAt(step: Int): Double {
    val change = (targetAt(step) - baseTarget) / baseTarget * (if (descending) -1 else 1)
    return 1 + (change / 2).coerceIn(Rules.PROG_REWARD_MIN, Rules.PROG_REWARD_MAX)
}

fun GameState.stepOf(id: String) = adapt[id]?.level ?: 0

/** Keeps still needed for the next step up; null at the cap or for fixed targets. */
fun GameState.keepsToNextStep(def: QuestDef): Int? {
    val a = adapt[def.id] ?: Adapt()
    if (!def.progresses() || def.targetAt(a.level + 1) == def.targetAt(a.level)) return null
    return (maxOf(def.keepsFor(a.level), Rules.PROG_KEEPS_PER_MISS * a.losses) - a.wins).coerceAtLeast(1)
}

/** Records a closed day's daily missions and nudges each one's target toward what the user really does. */
fun Tx.recordMissions(daily: List<Quest>, day: LocalDate) {
    var stats = s.missionStats
    var days = s.missionDays
    var week = s.weekStats
    var adapt = s.adapt
    // Weekly missions are judged by their week, not by single days.
    for (q in daily.filter { it.perWeek == null }) {
        val ok = q.isSuccessful()
        stats = stats + (q.defId to (stats[q.defId] ?: MissionStat()).add(ok))
        week = week + (q.defId to (week[q.defId] ?: MissionStat()).add(ok))
        val mark = if (ok) day.toEpochDay() else -day.toEpochDay()
        days = days + (q.defId to ((days[q.defId] ?: emptyList()) + mark).takeLast(Rules.HABIT_DAYS_KEPT))
        val def = s.defOf(q.defId, content)
        if (def?.progresses() == true) adapt = adapt + (q.defId to (adapt[q.defId] ?: Adapt()).next(ok, def))
    }
    s = s.copy(missionStats = stats, missionDays = days, weekStats = week, adapt = adapt)
}

/** How a mission went on the days it came up in the [days] days up to [end] (inclusive). */
fun GameState.habitWindow(id: String, end: LocalDate, days: Int): MissionStat {
    val from = end.toEpochDay() - days + 1
    return missionDays[id].orEmpty().filter { kotlin.math.abs(it) in from..end.toEpochDay() }
        .fold(MissionStat()) { st, m -> st.add(m > 0) }
}

/** Whether a mission was kept (true), missed (false) or didn't come up (null) on [day]. */
fun GameState.habitOn(id: String, day: LocalDate): Boolean? {
    val e = day.toEpochDay()
    return missionDays[id]?.lastOrNull { kotlin.math.abs(it) == e }?.let { it > 0 }
}

/** One more result for a mission's progression (see [Rules.PROG_KEEPS_PER_MISS]). */
internal fun Adapt.next(ok: Boolean, def: QuestDef): Adapt {
    val kept = wins + if (ok) 1 else 0
    val missed = losses + if (ok) 0 else 1
    val canRise = def.targetAt(level + 1) != def.targetAt(level)
    val canDrop = level > Rules.PROG_MIN_STEP && def.targetAt(level - 1) != def.targetAt(level)
    return when {
        ok && canRise && kept >= def.keepsFor(level) && kept >= Rules.PROG_KEEPS_PER_MISS * missed -> Adapt(level + 1)
        !ok && canDrop && missed >= Rules.PROG_DOWN_MISSES && missed > kept -> Adapt(level - 1)
        else -> Adapt(level, kept, missed)
    }
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

// ── The streak flame ──────────────────────────────────────────────────────────

/**
 * How today stands for the streak, from cold to hot: a rest day, a lost streak waiting for its
 * perfect recovery day, not yet safe, safe (the streak grows tonight), or every mission kept.
 */
enum class FlameKind { REST, RECOVERING, PENDING, SAFE, PERFECT }

/** The flame's state and the streak it shows: tonight's, once today already counts. */
data class Flame(val kind: FlameKind, val days: Int)

fun GameState.flame(): Flame {
    if (daily.rest) return Flame(FlameKind.REST, player.streak)
    val goal = dayGoal()
    val perfect = goal.total > 0 && goal.kept == goal.total
    val rec = recovery?.takeIf { it.day == day }
    return when {
        rec != null && perfect -> Flame(FlameKind.PERFECT, rec.streak + 1)
        rec != null -> Flame(FlameKind.RECOVERING, rec.streak)
        perfect -> Flame(FlameKind.PERFECT, player.streak + 1)
        goal.total > 0 && goal.safe -> Flame(FlameKind.SAFE, player.streak + 1)
        else -> Flame(FlameKind.PENDING, player.streak)
    }
}

/** Avoid missions still standing today: they count at midnight unless marked as slipped. */
fun GameState.openAvoids(): List<Quest> = dailyQuests.filter { it.type == QuestType.FORBIDDEN && it.status == QuestStatus.OPEN }

/** Marks an avoid mission as slipped; never un-marks one (a repeated tap from a notification). */
fun Tx.slipAvoid(id: String) {
    if (s.openAvoids().any { it.id == id }) toggleFailed(id)
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
    recordWeekly(s.statsWeek)
    val start = LocalDate.parse(s.statsWeek)
    val end = start.plusDays(6)
    val logs = s.dayLog.filter { LocalDate.parse(it.day) in start..end }
    val kept = logs.count { it.passed || it.perfect }
    // Weeks with nothing logged (app unused) produce no report.
    if (logs.isNotEmpty() && ChronoUnit.DAYS.between(end, ctx.today) < 7) {
        val rated = s.weekStats.filter { it.value.total >= Rules.WEEK_MIN_SAMPLES && s.defOf(it.key, content) != null }
        val best = rated.maxByOrNull { it.value.rate }
        val worst = rated.minByOrNull { it.value.rate }?.takeIf { it.key != best?.key }
        val boss = s.boss?.takeIf { it.weekKey == s.statsWeek }
        reward {
            Reward.WeekReport(
                it, s.statsWeek, kept, logs.count { l -> l.perfect }, logs.count { l -> l.rest }, logs.size, s.lastWeekKept,
                best?.key, best?.value?.rate ?: 0.0, worst?.key, worst?.value?.rate ?: 0.0, boss?.bossId, boss?.defeated == true, s.weekLines(s.statsWeek), s.squadWeek,
            )
        }
    }
    suggestWeekly()
    s = s.copy(statsWeek = ctx.weekKey, weekStats = emptyMap(), lastWeekKept = if (logs.isEmpty()) s.lastWeekKept else kept, squadWeek = SquadGain())
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
