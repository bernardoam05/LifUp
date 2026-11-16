package com.lifup.app.domain

/** Single entry point for state changes: catch up with the clock, apply the action, settle achievements. */
object Engine {
    private const val MAX_PENDING_REWARDS = 40

    /** [before] runs ahead of the day check, e.g. to record yesterday's final step count before it closes. */
    fun run(state: GameState, ctx: Ctx, before: Tx.() -> Unit = {}, action: Tx.() -> Unit = {}): GameState {
        val tx = Tx(state, ctx)
        tx.migrateState()
        tx.before()
        tx.ensureDay()
        tx.action()
        tx.announceUnlocks()
        tx.checkAchievements()
        tx.s = tx.s.copy(rewards = tx.s.rewards.takeLast(MAX_PENDING_REWARDS))
        return tx.s
    }
}

/** [seen] is false when a brief notice ran its time behind a sheet or a dialog: it then counts as unread in the history. */
fun Tx.dismissReward(id: Long, seen: Boolean = true) {
    val notice = s.rewards.firstOrNull { it.id == id } as? Reward.Toast
    val history = if (notice == null) s.noticeHistory else (s.noticeHistory + notice).takeLast(50)
    val kept = history.mapTo(mutableSetOf()) { it.id }
    s = s.copy(
        rewards = s.rewards.filterNot { it.id == id },
        noticeHistory = history,
        unreadNotices = (if (notice == null || seen) s.unreadNotices else s.unreadNotices + id).filterTo(mutableSetOf()) { it in kept },
    )
}

fun Tx.markNoticesRead() {
    s = s.copy(unreadNotices = emptySet())
}

/**
 * [off]: missions the player left out (whole areas, or one by one), which start switched off in the Forge.
 * [fixed]: the mission they want every day; when it isn't the built-in fixed one, it takes its place.
 */
fun Tx.finishOnboarding(name: String, rigor: Rigor, focus: Set<Attr> = emptySet(), blockOnPenalty: Boolean = false, off: Set<String> = emptySet(), fixed: String? = null) {
    s = s.copy(
        onboarded = true, player = s.player.copy(name = name.trim().take(24)),
        settings = s.settings.copy(rigor = rigor, focusAttrs = focus, blockOnPenalty = blockOnPenalty),
        disabledDefIds = s.disabledDefIds + off.filter { content.questDefById[it]?.optional == false },
    )
    val builtIn = content.quests.filter { it.kind == DefKind.CORE && !it.retired && !it.isWeekly() }.map { it.id }
    val habit = fixed?.let { content.questDefById[it] }
    if (habit != null && habit.id !in builtIn) {
        saveCustomDef(habit.copy(kind = DefKind.CORE))
        s = s.copy(disabledDefIds = s.disabledDefIds + builtIn)
    }
    if (habit != null) s = s.copy(disabledDefIds = s.disabledDefIds - habit.id)
    // Today's list was drawn before the choices: redraw it while nothing has been done yet.
    if (s.quests.none { it.status != QuestStatus.OPEN }) s = s.copy(quests = generateDailyQuests(s, content, ctx.today))
}

/** Changes the difficulty from tomorrow on; before the first day is played it applies at once. */
fun Tx.setRigor(r: Rigor) = updateSettings {
    if (r == it.rigor || s.dayLog.isEmpty() && s.quests.none { q -> q.status != QuestStatus.OPEN }) it.copy(rigor = r, rigorNext = null) else it.copy(rigorNext = r)
}

/**
 * The hour the day ends at can only move once the clock is past the latest one it can be set to: before that,
 * "today" would be a different day under the old hour and the new one.
 */
fun canSetDayEnd(ctx: Ctx) = ctx.clockHour >= Rules.MAX_DAY_END

fun Tx.setDayEnd(hour: Int) {
    if (!canSetDayEnd(ctx)) return
    val h = hour.coerceIn(0, Rules.MAX_DAY_END)
    updateSettings { it.copy(dayEndHour = h) }
    // The standing boss leaves when the week ends, which just moved.
    s.boss?.let { b -> s = s.copy(boss = b.copy(endsAt = Ctx(content, ctx.now, ctx.zone, ctx.rng, h).nextWeekStartMs)) }
}

fun Tx.updateSettings(f: (Settings) -> Settings) {
    s = s.copy(settings = f(s.settings))
}

fun Tx.recordBlockedAttempt() = count(StatKey.BLOCKED_ATTEMPTS)

fun Tx.setFocusAmbient(kind: String?) {
    val f = s.focus ?: return
    s = s.copy(focus = f.copy(ambient = kind))
}

fun Tx.rename(name: String) {
    s = s.copy(player = s.player.copy(name = name.trim().take(24)))
}

/** Puts a (custom) definition into today's list right away instead of waiting for tomorrow. */
fun Tx.addDefToToday(defId: String) {
    val def = s.defOf(defId, content) ?: return
    if (s.quests.any { it.defId == defId }) return
    syncWeekly()
    val quest = if (def.isWeekly()) weeklyQuest(def, s.weekly[def.id], ctx.today, s.player.level, s.stepOf(def.id)) else buildQuest(def, s.player.level, QuestOrigin.DAILY, step = s.stepOf(def.id))
    s = s.copy(quests = s.quests + quest)
}
