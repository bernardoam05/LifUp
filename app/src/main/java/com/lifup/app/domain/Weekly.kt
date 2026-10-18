package com.lifup.app.domain

import kotlinx.serialization.Serializable
import java.time.LocalDate

// ── "N times a week" missions ─────────────────────────────────────────────────
//
// Each day still gets its own instance of the mission. It only counts for the day when it's done,
// or when skipping it would make the week's goal impossible ("due"): then it takes the place of a
// drawn mission, so the number of missions that count stays the same.

/** One week of a weekly mission. [trial]: the week it was added, which never makes it due. */
@Serializable
data class WeekTally(val week: String, val goal: Int, val done: Int = 0, val trial: Boolean = false, val rewarded: Boolean = false) {
    val needed get() = (goal - done).coerceAtLeast(0)

    /** Due when there are exactly as many days left (today included) as sessions to go. */
    fun dueOn(day: LocalDate) = !trial && needed > 0 && needed == 8 - day.dayOfWeek.value
}

/** A weekly mission's result, for the weekly report. */
@Serializable
data class WeekLine(val defId: String, val done: Int, val goal: Int)

fun QuestDef.isWeekly() = kind == DefKind.CORE && perWeek != null

/** A week's goal for a mission added on [day]: the share of the week that is left. */
fun proratedGoal(perWeek: Int, day: LocalDate) = perWeek * (8 - day.dayOfWeek.value) / 7

/** This week's tally for [def]. A raised goal waits for Monday; a lowered one applies at once. */
private fun GameState.tallyFor(def: QuestDef, ctx: Ctx): WeekTally {
    val goal = def.perWeek ?: 0
    val t = weekly[def.id]
    return when {
        t == null -> WeekTally(ctx.weekKey, proratedGoal(goal, ctx.today), trial = true)
        t.week != ctx.weekKey -> WeekTally(ctx.weekKey, goal)
        else -> t.copy(goal = minOf(t.goal, goal))
    }
}

/** Brings every weekly mission's tally to the current week. */
fun Tx.syncWeekly() {
    val defs = s.availableDefs(content).filter { it.isWeekly() }
    s = s.copy(weekly = defs.associate { it.id to s.tallyFor(it, ctx) })
}

/** Today's instance of a weekly mission: counts for the day only when due. */
fun weeklyQuest(def: QuestDef, tally: WeekTally?, day: LocalDate, level: Int, adapt: Int = 0): Quest =
    buildQuest(def, level, if (tally?.dueOn(day) == true) QuestOrigin.DAILY else QuestOrigin.WEEKLY, adapt = adapt)

/** The missions that count for today: the daily ones plus weekly ones already done. */
fun GameState.countedQuests(): List<Quest> = dailyQuests + weeklyQuests.filter { it.isSuccessful() }

/** Counts a done session of a weekly mission; the first time the goal is reached pays a bonus. */
internal fun Tx.tallyWeekly(q: Quest, delta: Int) {
    if (q.perWeek == null) return
    val t = s.weekly[q.defId] ?: return
    val next = t.copy(done = (t.done + delta).coerceAtLeast(0))
    val reached = delta > 0 && !t.rewarded && next.goal > 0 && next.done >= next.goal
    s = s.copy(weekly = s.weekly + (q.defId to if (reached) next.copy(rewarded = true) else next))
    if (reached) {
        gainGold(q.gold * Rules.WEEK_GOAL_GOLD_MULT, boosted = false)
        toast(ToastKind.WEEK_GOAL, q.defId)
    }
}

/** The week's results of every weekly mission, for the report. */
fun GameState.weekLines(week: String): List<WeekLine> =
    weekly.filter { it.value.week == week && it.value.goal > 0 }.map { (id, t) -> WeekLine(id, t.done, t.goal) }
