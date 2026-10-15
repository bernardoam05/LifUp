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
    if (s.day.isEmpty()) {
        s = s.copy(day = ctx.todayKey, daily = DailyFlags(ctx.todayKey))
        s = s.copy(quests = generateDailyQuests(s, content, ctx.today))
    } else if (LocalDate.parse(s.day) < ctx.today) {
        // Only move forward: a clock set back (manual change, timezone hop) never re-closes a day.
        closeDay(LocalDate.parse(s.day))
        s = s.copy(
            day = ctx.todayKey,
            daily = DailyFlags(ctx.todayKey),
            quests = generateDailyQuests(s, content, ctx.today),
            sideQuests = s.sideQuests.filterNot { it.done },
            timers = emptyMap(),
        )
    }
    s = s.copy(buffs = s.buffs.filter { it.expiresAt > ctx.now })
    settleFocus()
    ensureBoss()
    ensureShop()
    expirePortal()
}

private fun Tx.closeDay(day: LocalDate) {
    val daily = s.dailyQuests
    val rest = s.daily.rest
    val sideFailed = if (s.settings.sidePenalize) s.sideQuests.count { !it.done && it.createdDay < ctx.todayKey } else 0
    val penaltyUnfinished = if (s.penalty.active) s.penalty.quests.count { it.status != QuestStatus.DONE } else 0
    val done = daily.count { it.isSuccessful() }
    val failed = daily.size - done + sideFailed + penaltyUnfinished
    val perfect = daily.isNotEmpty() && failed == 0
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

    var penaltyInfo: PenaltyInfo? = null
    var streakSavedBy: String? = null
    val p = s.player
    when {
        rest -> Unit
        perfect -> {
            val dailyBonus = s.passives(content, ctx.now).dailyBonus.roundToInt()
            bonusXp += gainXp(dailyBonus, boosted = false)
            count(StatKey.PERFECT_DAYS)
            if (hadPenaltyBefore) count(StatKey.COMEBACKS)
            setStreak(p.streak + 1)
        }
        else -> {
            val result = applyFailure(failed, daily.size + sideFailed + penaltyUnfinished)
            penaltyInfo = result.first
            streakSavedBy = result.second
        }
    }

    // Days skipped entirely (device off, app never ran) break the streak.
    val gap = ChronoUnit.DAYS.between(day, ctx.today)
    if (gap > 1 && !rest && s.player.streak > 0) setStreak(0)

    s = s.copy(dayLog = (s.dayLog + DayLog(day.toString(), done, daily.size, perfect && !rest, penaltyInfo != null && penaltyInfo.absorbedBy == null, rest)).takeLast(120))
    reward { Reward.DayReport(it, day.toString(), done, daily.size, perfect && !rest, rest, s.player.streak, bonusXp, penaltyInfo, streakSavedBy) }
}

private fun Tx.setStreak(value: Int) {
    val old = s.player.streak
    s = s.copy(player = s.player.copy(streak = value, bestStreak = maxOf(s.player.bestStreak, value)))
    if (value > old) Rules.STREAK_MILESTONES.firstOrNull { it.days == value }?.let { m ->
        if (m.gold > 0) gainGold(m.gold, boosted = false)
        m.items.forEach { addItem(it) }
        reward { Reward.StreakMilestone(it, m.days, m.gold, m.items) }
        m.shadowId?.let { gainShadow(it, SourceType.STREAK) }
    }
}

/** Returns the penalty summary and, if the streak survived, what saved it. */
private fun Tx.applyFailure(failed: Int, total: Int): Pair<PenaltyInfo, String?> {
    tryWeeklyPassive(Passive.PENALTY_IMMUNITY)?.let { shadow ->
        toast(ToastKind.PASSIVE_FIRED, shadow.id)
        return PenaltyInfo(failed, total, 0, 0, 0, absorbedBy = shadow.id) to shadow.id
    }
    val rigor = s.settings.rigor
    val mult = when (rigor) { Rigor.EASY -> 0.3; Rigor.NORMAL -> 1.0; Rigor.HARD -> 2.0 }
    val reduce = s.passives(content, ctx.now).penaltyReduce
    val xpLost = floor(Rules.penaltyBase(s.player.level) * mult * (1 - reduce)).toInt()
    val goldLost = loseGold(xpLost)
    val xpActuallyLost = minOf(xpLost, s.player.xp)
    loseXp(xpLost)
    count(StatKey.PENALTIES_TAKEN)

    val questCount = when (rigor) {
        Rigor.EASY -> 1
        Rigor.NORMAL -> minOf(1 + failed / 2, 3)
        Rigor.HARD -> minOf(2 + failed, 4)
    }
    val quests = content.penaltyQuests.shuffled(ctx.rng).take(questCount).mapIndexed { i, def ->
        buildQuest(def, 1, QuestOrigin.PENALTY, "${def.id}_${s.nextId}_$i")
    }
    var blockStart = 0L
    var blockEnd = 0L
    if (s.settings.blockOnPenalty) {
        var date = ctx.today
        val (startH, endH) = when (rigor) { Rigor.EASY -> 13 to 19; Rigor.NORMAL -> 10 to 22; Rigor.HARD -> -1 to -1 }
        if (startH < 0) {
            blockStart = ctx.now
            blockEnd = ctx.now + 24 * 3_600_000L
        } else {
            if (ctx.atHour(date, endH) <= ctx.now) date = date.plusDays(1)
            blockStart = ctx.atHour(date, startH)
            blockEnd = ctx.atHour(date, endH)
        }
    }
    s = s.copy(penalty = Penalty(active = true, quests = quests, blockStart = blockStart, blockEnd = blockEnd), nextId = s.nextId + 1)

    val resetsStreak = rigor != Rigor.EASY || failed >= total
    var savedBy: String? = null
    if (resetsStreak && s.player.streak > 0) {
        val shadow = tryWeeklyPassive(Passive.STREAK_PROTECT)
        when {
            shadow != null -> { savedBy = shadow.id; toast(ToastKind.PASSIVE_FIRED, shadow.id) }
            s.items("escudo_constancia") > 0 -> { addItem("escudo_constancia", -1); count(StatKey.ITEMS_USED); savedBy = "escudo_constancia" }
            else -> setStreak(0)
        }
    }
    return PenaltyInfo(failed, total, xpActuallyLost, goldLost, quests.size) to savedBy
}

fun Tx.clearPenalty(cleared: Boolean) {
    if (!s.penalty.active) return
    s = s.copy(penalty = Penalty())
    if (cleared) count(StatKey.PENALTIES_CLEARED)
    toast(ToastKind.PENALTY_CLEARED)
}

fun Tx.toggleRestDay() {
    s = s.copy(daily = s.daily.copy(rest = !s.daily.rest))
}

/** True while the penalty window says distracting apps must be blocked. */
fun GameState.penaltyBlockActive(now: Long) =
    penalty.active && settings.blockOnPenalty && penalty.blockEnd > now && penalty.blockStart <= now
