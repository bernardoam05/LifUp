package com.lifup.app.domain

/** A reminder that rings at [at]: for an open mission ([questId]) or a side quest ([sideId]). */
data class DueReminder(val itemId: String, val at: Long, val questId: String? = null, val sideId: String? = null)

/**
 * Puts a reminder on a mission at [minute] after midnight, or takes it off with null: every day it comes up, or with
 * [todayOnly] just today, standing in for the everyday one (which comes back tomorrow).
 */
fun Tx.setReminder(defId: String, minute: Int?, todayOnly: Boolean = false) {
    fun Map<String, MissionReminder>.with() =
        if (minute == null) this - defId else this + (defId to MissionReminder(minute.coerceIn(0, 24 * 60 - 1), ctx.now))
    s = if (todayOnly) s.copy(todayReminders = s.todayReminders.with()) else s.copy(reminders = s.reminders.with())
}

/** A side quest rings once at [minute]: today if that time is still ahead, otherwise tomorrow. */
fun Tx.setSideReminder(id: String, minute: Int?) {
    val at = minute?.let { m ->
        val today = ctx.atMinute(ctx.today, m)
        if (today > ctx.now) today else ctx.atMinute(ctx.today.plusDays(1), m)
    }
    s = s.copy(sideQuests = s.sideQuests.map { if (it.id == id) it.copy(remindAt = at) else it })
}

/** "Later" on the notification: rings again in [Rules.SNOOZE_MIN] minutes. */
fun Tx.snoozeReminder(itemId: String) {
    s = s.copy(snoozes = s.snoozes + (itemId to ctx.now + Rules.SNOOZE_MIN * 60_000L))
}

/** The time a mission's reminder is set for today, in minutes after midnight: today's own, else the everyday one. */
fun GameState.reminderMinute(q: Quest): Int? = (todayReminders[q.defId] ?: reminders[q.defId])?.minute

/** Every reminder still to ring or ringing: open missions with a time, undone side quests with one, snoozes first. */
fun GameState.reminderTimes(ctx: Ctx): List<DueReminder> {
    val missions = quests.filter { it.status == QuestStatus.OPEN }.mapNotNull { q ->
        val r = todayReminders[q.defId] ?: reminders[q.defId] ?: return@mapNotNull null
        val at = snoozes[q.id] ?: ctx.atMinute(ctx.today, r.minute).takeIf { it > r.since } ?: return@mapNotNull null
        DueReminder(q.id, at, questId = q.id)
    }
    val sides = sideQuests.filter { !it.done && it.remindAt != null }.map { sq ->
        DueReminder(sq.id, snoozes[sq.id] ?: sq.remindAt!!, sideId = sq.id)
    }
    return missions + sides
}

/** Whether every mission still standing has its own reminder still ahead, so the general one would only repeat them. */
fun GameState.ownRemindersAhead(ctx: Ctx): Boolean {
    val open = dailyQuests.filter { !it.isSuccessful() }
    if (open.isEmpty()) return false
    val ahead = reminderTimes(ctx).filter { it.at > ctx.now }.mapNotNull { it.questId }.toSet()
    return open.all { it.id in ahead }
}
