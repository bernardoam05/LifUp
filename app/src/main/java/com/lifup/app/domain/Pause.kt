package com.lifup.app.domain

import java.time.LocalDate

// ── Pause (holidays, illness) ─────────────────────────────────────────────────
//
// A paused day is a rest day that doesn't use up the week's rest: nothing is asked, nothing is lost, the
// streak and the mission load stay where they were. Like rest days it can't be called after noon, and a
// yearly allowance keeps it a break rather than a way out.

/** Whether [day] (ISO date) falls inside the current pause. */
fun GameState.pausedOn(day: String) = pauseUntil?.let { day <= it && day >= (pauseFrom ?: it) } == true

/** Paused days counted against the allowance over the year up to [today]. */
fun GameState.pauseDaysUsed(today: LocalDate): Int {
    val from = today.minusDays(364).toString()
    return pausedDays.count { it >= from }
}

fun GameState.pauseDaysLeft(today: LocalDate) = (Rules.PAUSE_DAYS_PER_YEAR - pauseDaysUsed(today)).coerceAtLeast(0)

/** The first day a pause asked for now would cover: today before noon, otherwise tomorrow. */
fun Ctx.pauseStart(): LocalDate = if (hour < Rules.REST_DEADLINE_HOUR) today else today.plusDays(1)

/** Longest pause that can be started now: the per-pause cap, within what is left of the year's allowance. */
fun GameState.maxPauseDays(ctx: Ctx) = minOf(Rules.PAUSE_MAX_DAYS, pauseDaysLeft(ctx.today))

fun Tx.startPause(days: Int) {
    if (s.pauseUntil?.let { it >= ctx.todayKey } == true) return
    val n = days.coerceAtMost(s.maxPauseDays(ctx))
    if (n <= 0) return
    val from = ctx.pauseStart()
    s = s.copy(pauseFrom = from.toString(), pauseUntil = from.plusDays(n - 1L).toString())
    if (from == ctx.today) enterPausedDay()
}

/** Ends the pause from tomorrow on; today stays paused if it already was, so it can't be ended to dodge a day. */
fun Tx.endPause() {
    val until = s.pauseUntil ?: return
    s = if (s.pausedOn(ctx.todayKey)) s.copy(pauseUntil = ctx.todayKey)
    else if (until > ctx.todayKey) s.copy(pauseFrom = null, pauseUntil = null)
    else s
}

/** Opens today as paused: a rest day that gives back a rest the player had already called for it. */
internal fun Tx.enterPausedDay() {
    if (!s.pausedOn(ctx.todayKey)) return
    if (ctx.todayKey !in s.pausedDays) s = s.copy(pausedDays = (s.pausedDays + ctx.todayKey).takeLast(Rules.PAUSE_DAYS_KEPT))
    if (s.daily.rest && s.restWeek == ctx.weekKey && !s.daily.paused) s = s.copy(restUsed = (s.restUsed - 1).coerceAtLeast(0))
    s = s.copy(daily = s.daily.copy(rest = true, paused = true))
}

/** Days with the app never opened inside a pause count as paused, so they don't break the streak. */
internal fun Tx.markPausedGap(from: LocalDate, until: LocalDate) {
    var d = from
    while (d <= until) {
        val key = d.toString()
        if (s.pausedOn(key) && key !in s.pausedDays) s = s.copy(pausedDays = (s.pausedDays + key).takeLast(Rules.PAUSE_DAYS_KEPT))
        d = d.plusDays(1)
    }
}
