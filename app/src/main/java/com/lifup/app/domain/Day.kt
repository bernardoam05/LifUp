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
            bonusXp += gainXp(q.xp, q.type)
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
            val result = applyFailure(failed, total, ratio)
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

/** Returns the penalty summary and, if the streak survived, what saved it. */
private fun Tx.applyFailure(failed: Int, total: Int, ratio: Double): Pair<PenaltyInfo, String?> {
    tryWeeklyPassive(Passive.PENALTY_IMMUNITY)?.let { shadow ->
        toast(ToastKind.PASSIVE_FIRED, shadow.id)
        squadAdded(SquadGain(saves = 1))
        return PenaltyInfo(failed, total, 0, 0, 0, absorbedBy = shadow.id) to shadow.id
    }
    val rigor = s.settings.rigor
    count(StatKey.PENALTIES_TAKEN)
    val mult = when (rigor) { Rigor.EASY -> 0.3; Rigor.NORMAL -> 1.0; Rigor.HARD -> 2.0 }
    val reduce = s.passives(content, ctx.now).penaltyReduce
    // Loss follows the share left undone, so a near miss costs little.
    val full = Rules.penaltyBase(s.player.level) * mult * (1 - ratio)
    val base = full * (1 - reduce)
    // XP lost follows mission XP past the top tier; gold lost stays with the gold economy.
    val xpScale = Rules.xpMultiplier(s.player.level) / Rules.tierMultiplier(s.player.level)
    val xpLost = floor(base * xpScale).toInt()
    squadAdded(SquadGain(xp = floor(full * xpScale).toInt() - xpLost, gold = floor(full).toInt() - floor(base).toInt()))
    val goldLost = loseGold(floor(base).toInt())
    val xpActuallyLost = minOf(xpLost, s.player.xp)
    loseXp(xpLost)

    val severe = ratio < Rules.SEVERE_RATIO
    val questCount = if (!severe) 0 else when (rigor) {
        Rigor.EASY -> 1
        Rigor.NORMAL -> minOf(1 + failed / 2, 3)
        Rigor.HARD -> minOf(2 + failed, 4)
    }
    val quests = content.penaltyQuests.shuffled(ctx.rng).take(questCount).mapIndexed { i, def ->
        buildQuest(def, 1, QuestOrigin.PENALTY, "${def.id}_${s.nextId}_$i")
    }
    if (severe) {
        s = s.copy(penalty = Penalty(active = true, quests = quests, blockStart = ctx.now, blockEnd = ctx.now + Rules.PENALTY_MS), nextId = s.nextId + 1)
    }

    var savedBy: String? = null
    val streak = s.player.streak
    if (streak > 0) {
        val shadow = tryWeeklyPassive(Passive.STREAK_PROTECT)
        when {
            shadow != null -> { savedBy = shadow.id; toast(ToastKind.PASSIVE_FIRED, shadow.id); squadAdded(SquadGain(saves = 1)) }
            s.items("escudo_constancia") > 0 -> { addItem("escudo_constancia", -1); count(StatKey.ITEMS_USED); savedBy = "escudo_constancia" }
            else -> {
                setStreak(0)
                // Once a week, a perfect day right after brings the streak back.
                if (s.recoveryWeek != ctx.weekKey) s = s.copy(recovery = StreakRecovery(streak, ctx.todayKey))
            }
        }
    }
    return PenaltyInfo(failed, total, xpActuallyLost, goldLost, quests.size) to savedBy
}

/** Ends a penalty once its 24 hours are over. */
fun Tx.expirePenalty() {
    if (s.penalty.active && s.penalty.blockEnd <= ctx.now) s = s.copy(penalty = Penalty())
}

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
