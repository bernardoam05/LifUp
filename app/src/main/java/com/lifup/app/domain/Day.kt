package com.lifup.app.domain

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.floor
import kotlin.math.roundToInt

/**
 * Brings the state up to date with the clock: closes the previous day (rewards, streak, penalty),
 * opens today, rotates the weekly boss/shop and expires timed things. Safe to call any number of times.
 */
fun Tx.ensureDay() {
    if (s.seed == 0L) s = s.copy(seed = ctx.rng.nextLong().takeIf { it != 0L } ?: 1L)
    if (s.day.isEmpty()) {
        s = s.copy(day = ctx.todayKey, daily = DailyFlags(ctx.todayKey), statsWeek = ctx.weekKey)
        syncWeekly()
        s = s.copy(quests = generateDailyQuests(s, content, ctx.today))
    } else if (LocalDate.parse(s.day) < ctx.today) {
        // Only move forward: a clock set back (manual change, timezone hop) never re-closes a day.
        closeDay(LocalDate.parse(s.day))
        rollWeek()
        syncWeekly()
        s = s.copy(
            day = ctx.todayKey,
            daily = DailyFlags(ctx.todayKey),
            quests = generateDailyQuests(s, content, ctx.today),
            sideQuests = s.sideQuests.filterNot { it.done },
            timers = emptyMap(),
            run = null,
        )
    }
    s = s.copy(buffs = s.buffs.filter { it.expiresAt > ctx.now })
    expirePenalty()
    settleFocus()
    ensureBoss()
    ensureSecondChallenge()
    ensureShop()
    expirePortal()
}

private fun Tx.closeDay(day: LocalDate) {
    val daily = s.countedQuests()
    val rest = s.daily.rest
    val sideFailed = if (s.settings.sidePenalize) s.sideQuests.count { !it.done && it.createdDay < ctx.todayKey } else 0
    val done = daily.count { it.isSuccessful() }
    // Unfinished penalty missions don't feed the next penalty.
    val failed = daily.size - done + sideFailed
    val total = daily.size + sideFailed
    val ratio = if (total == 0) 1.0 else done.toDouble() / total
    val perfect = daily.isNotEmpty() && failed == 0
    val passed = ratio >= Rules.passRatio(s.settings.rigor)
    val hadPenaltyBefore = s.dayLog.lastOrNull()?.penalty == true

    // Avoid/limit quests kept until midnight pay out now.
    var bonusXp = 0
    if (!rest) {
        daily.filter { it.status == QuestStatus.OPEN && it.isSuccessful() }.forEach { q ->
            bonusXp += gainXp(q.xp, q.family())
            gainGold(q.gold)
            count(StatKey.QUESTS_COMPLETED)
        }
    }

    if (!rest) recordMissions(daily, day)
    count(StatKey.STEPS, s.daily.steps.toLong())

    // A penalty lasts 24 hours: its missions only lift it early, and leftovers just expire.
    expirePenalty()

    var penaltyInfo: PenaltyInfo? = null
    var streakSavedBy: String? = null
    var restored = false
    val recovery = s.recovery
    s = s.copy(recovery = null)
    when {
        rest -> Unit
        passed -> {
            if (perfect) {
                val dailyBonus = s.passives(content, ctx.now).dailyBonus.roundToInt()
                val bonus = gainXp(dailyBonus, boosted = false)
                bonusXp += bonus
                squadAdded(SquadGain(xp = bonus))
                count(StatKey.PERFECT_DAYS)
                if (hadPenaltyBefore) count(StatKey.COMEBACKS)
            }
            restored = perfect && recovery?.day == day.toString()
            if (restored) s = s.copy(recoveryWeek = ctx.weekKey)
            setStreak((if (restored) recovery!!.streak else s.player.streak) + 1)
        }
        else -> {
            val result = applyFailure(daily, failed, total, ratio)
            penaltyInfo = result.first
            streakSavedBy = result.second
        }
    }

    // Days skipped entirely (device off, app never ran) break the streak for good.
    val gap = ChronoUnit.DAYS.between(day, ctx.today)
    // An echo that absorbs the penalty saves the load as it saves the streak.
    updateLoad((passed || penaltyInfo?.absorbedBy != null) && !rest, perfect && !rest, rest, skipped = gap > 1)
    if (gap > 1 && !rest && s.player.streak > 0) setStreak(0)
    if (gap > 1) s = s.copy(recovery = null)

    s = s.copy(dayLog = (s.dayLog + DayLog(day.toString(), done, daily.size, perfect && !rest, penaltyInfo != null && penaltyInfo.absorbedBy == null, rest, passed && !rest)).takeLast(Rules.DAY_LOG_DAYS))
    reward { Reward.DayReport(it, day.toString(), done, daily.size, perfect && !rest, rest, s.player.streak, bonusXp, penaltyInfo, streakSavedBy, passed && !rest, restored) }
    // The perfect day's echo comes once the day is closed: avoid and limit missions can still break until midnight.
    if (perfect && !rest) rollExtraction()
}

private fun Tx.setStreak(value: Int) {
    val old = s.player.streak
    s = s.copy(player = s.player.copy(streak = value, bestStreak = maxOf(s.player.bestStreak, value)))
    if (value > old) Rules.STREAK_MILESTONES.firstOrNull { it.days == value }?.let { m ->
        if (m.gold > 0) gainGold(m.gold, boosted = false)
        m.items.forEach { addItem(it) }
        reward { Reward.StreakMilestone(it, m.days, m.gold, m.items) }
        m.shadowId?.let { gainShadow(it, SourceType.STREAK, EchoOrigin.STREAK, m.days.toString()) }
    }
}

/** Returns the penalty summary and, if the streak survived, what saved it. Immunity spares the losses, not the streak. */
private fun Tx.applyFailure(daily: List<Quest>, failed: Int, total: Int, ratio: Double): Pair<PenaltyInfo, String?> {
    val info = tryCooldownPassive(Passive.PENALTY_IMMUNITY)?.let { shadow ->
        toast(ToastKind.PASSIVE_FIRED, shadow.id)
        squadAdded(SquadGain(saves = 1))
        PenaltyInfo(failed, total, 0, 0, 0, absorbedBy = shadow.id)
    } ?: penalize(daily, failed, total, ratio)
    return info to saveStreak()
}

/**
 * What a failed day costs: the undone share of what its missions would have paid, times the difficulty,
 * fading over a run of failed days (a week away costs a few days, not seven). Penalty missions only come
 * on the first failed day of a run, so the app block or the halved rewards never last the whole run.
 */
private fun Tx.penalize(daily: List<Quest>, failed: Int, total: Int, ratio: Double): PenaltyInfo {
    val rigor = s.settings.rigor
    count(StatKey.PENALTIES_TAKEN)
    val run = s.dayLog.takeLastWhile { !it.passed && !it.rest }.size
    val share = Rules.lossMultiplier(rigor) * (1 - ratio) * Rules.failRunFactor(run)
    val reduce = s.passives(content, ctx.now).penaltyReduce
    val fullXp = daily.sumOf { it.xp } * share
    val fullGold = daily.sumOf { it.gold } * share
    val xpLost = floor(fullXp * (1 - reduce)).toInt()
    val goldBase = floor(fullGold * (1 - reduce)).toInt()
    squadAdded(SquadGain(xp = floor(fullXp).toInt() - xpLost, gold = floor(fullGold).toInt() - goldBase))
    val goldLost = loseGold(goldBase)
    val xpActuallyLost = minOf(xpLost, s.player.xp)
    loseXp(xpLost)

    val severe = ratio < Rules.severeRatio(rigor) && run == 0
    val questCount = if (severe) Rules.penaltyMissionCount(rigor, ratio) else 0
    val quests = content.penaltyQuests.shuffled(ctx.rng).take(questCount).mapIndexed { i, def ->
        buildQuest(def, 1, QuestOrigin.PENALTY, "${def.id}_${s.nextId}_$i")
    }
    if (severe) {
        s = s.copy(penalty = Penalty(active = true, quests = quests, blockStart = ctx.now, blockEnd = ctx.now + Rules.PENALTY_MS), nextId = s.nextId + 1)
    }

    return PenaltyInfo(failed, total, xpActuallyLost, goldLost, quests.size)
}

/**
 * A failed day breaks the streak unless a guarding echo or the shield saves it. Only one save a week,
 * the comeback included (a perfect day right after), so protections can't stack into skipping half the week.
 */
private fun Tx.saveStreak(): String? {
    val streak = s.player.streak
    if (streak <= 0) return null
    val spare = s.recoveryWeek != ctx.weekKey
    val saved = if (!spare) null else tryCooldownPassive(Passive.STREAK_PROTECT)?.let { shadow ->
        toast(ToastKind.PASSIVE_FIRED, shadow.id)
        squadAdded(SquadGain(saves = 1))
        shadow.id
    } ?: "escudo_constancia".takeIf { s.items(it) > 0 }?.also { addItem(it, -1); count(StatKey.ITEMS_USED) }
    if (saved != null) {
        s = s.copy(recoveryWeek = ctx.weekKey)
        return saved
    }
    setStreak(0)
    if (spare) s = s.copy(recovery = StreakRecovery(streak, ctx.todayKey))
    return null
}

/** Ends a penalty once its 24 hours are over. */
fun Tx.expirePenalty() {
    if (s.penalty.active && s.penalty.blockEnd <= ctx.now) s = s.copy(penalty = Penalty())
}

/**
 * Whether a penalty blocks the distracting apps: the player wants it, picked some and the phone can tell
 * which app is open. Otherwise the penalty halves mission rewards instead ([penaltyCut]).
 */
fun GameState.penaltyBlocks() = settings.blockOnPenalty && settings.blockedApps.isNotEmpty() && screenMeasurable

fun Tx.setBlockOnPenalty(on: Boolean) = updateSettings { it.copy(blockOnPenalty = on) }

fun Tx.clearPenalty(cleared: Boolean) {
    if (!s.penalty.active) return
    s = s.copy(penalty = Penalty())
    if (cleared) count(StatKey.PENALTIES_CLEARED)
    toast(ToastKind.PENALTY_CLEARED)
}

fun GameState.restDaysLeft(weekKey: String) =
    Rules.restDaysPerWeek(settings.rigor) - (if (restWeek == weekKey) restUsed else 0)

/** Rest can be called before noon while the week's allowance lasts; undoing it gives the day back. */
fun GameState.canRest(ctx: Ctx) = daily.rest || (ctx.hour < Rules.REST_DEADLINE_HOUR && restDaysLeft(ctx.weekKey) > 0)

fun Tx.toggleRestDay() {
    if (s.daily.rest) {
        s = s.copy(daily = s.daily.copy(rest = false), restUsed = if (s.restWeek == ctx.weekKey) (s.restUsed - 1).coerceAtLeast(0) else s.restUsed)
        return
    }
    if (!s.canRest(ctx)) return
    val used = if (s.restWeek == ctx.weekKey) s.restUsed else 0
    s = s.copy(daily = s.daily.copy(rest = true), restWeek = ctx.weekKey, restUsed = used + 1)
}

/** True while the penalty window says distracting apps must be blocked. */
fun GameState.penaltyBlockActive(now: Long) =
    penalty.active && settings.blockOnPenalty && penalty.blockEnd > now && penalty.blockStart <= now
