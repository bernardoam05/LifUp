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

/** One past week of a weekly mission, kept for its chart. */
@Serializable
data class WeekMark(val week: String, val done: Int, val goal: Int) {
    val met get() = goal > 0 && done >= goal
}

/** Files the closing week's results of every weekly mission into their history. */
internal fun Tx.recordWeekly(week: String) {
    val lines = s.weekLines(week)
    if (lines.isEmpty()) return
    var history = s.weeklyHistory
    lines.forEach { l -> history = history + (l.defId to ((history[l.defId] ?: emptyList()) + WeekMark(week, l.done, l.goal)).takeLast(Rules.WEEKLY_HISTORY_WEEKS)) }
    s = s.copy(weeklyHistory = history)
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
    buildQuest(def, level, if (tally?.dueOn(day) == true) QuestOrigin.DAILY else QuestOrigin.WEEKLY, adapt = adapt, day = day)

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

// ── Suggesting a weekly mission ───────────────────────────────────────────────

@Serializable
data class WeeklyHint(val defId: String, val perWeek: Int, val done: Int, val days: Int)

/** At a week's end: a fixed everyday mission kept on some days but missed on others fits "N times a week". */
internal fun Tx.suggestWeekly() {
    if (s.weeklyHint != null) return
    val hint = s.availableDefs(content)
        .filter { it.kind == DefKind.CORE && !it.isWeekly() && it.auto == null && it.fromHour == null && it.daysOfWeek == null }
        .filter { it.type != QuestType.FORBIDDEN && it.type != QuestType.LIMIT && it.id !in s.weeklyHintsDismissed }
        .mapNotNull { def -> s.weekStats[def.id]?.takeIf { it.total >= 5 && it.done in 1..it.total - 2 }?.let { def to it } }
        .maxByOrNull { (_, st) -> st.total - st.done }
        ?.let { (def, st) -> WeeklyHint(def.id, st.done.coerceIn(1, 6), st.done, st.total) }
    if (hint != null) s = s.copy(weeklyHint = hint)
}

/** Turns the suggested mission weekly; today's instance stops counting for the day unless it was done. */
fun Tx.acceptWeeklyHint() {
    val h = s.weeklyHint ?: return
    s = s.copy(weeklyHint = null)
    val def = s.defOf(h.defId, content) ?: return
    saveCustomDef(def.copy(perWeek = h.perWeek))
    val today = s.quests.firstOrNull { it.defId == h.defId && it.origin == QuestOrigin.DAILY } ?: return
    s = s.copy(quests = s.quests.map { if (it.id == today.id) it.copy(origin = QuestOrigin.WEEKLY, perWeek = h.perWeek) else it })
    if (today.status == QuestStatus.DONE) s.weekly[h.defId]?.let { t -> s = s.copy(weekly = s.weekly + (h.defId to t.copy(done = t.done + 1))) }
}

fun Tx.dismissWeeklyHint() {
    val h = s.weeklyHint ?: return
    s = s.copy(weeklyHint = null, weeklyHintsDismissed = s.weeklyHintsDismissed + h.defId)
}
