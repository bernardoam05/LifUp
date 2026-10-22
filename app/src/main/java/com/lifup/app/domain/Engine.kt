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
        tx.checkAchievements()
        tx.s = tx.s.copy(rewards = tx.s.rewards.takeLast(MAX_PENDING_REWARDS))
        return tx.s
    }
}

fun Tx.dismissReward(id: Long) {
    s = s.copy(rewards = s.rewards.filterNot { it.id == id })
}

fun Tx.finishOnboarding(name: String, rigor: Rigor, focus: Set<Attr> = emptySet(), blockOnPenalty: Boolean = false) {
    s = s.copy(onboarded = true, player = s.player.copy(name = name.trim().take(24)), settings = s.settings.copy(rigor = rigor, focusAttrs = focus, blockOnPenalty = blockOnPenalty))
    // Today's list was drawn before the choices: redraw it while nothing has been done yet.
    if (s.quests.none { it.status != QuestStatus.OPEN }) s = s.copy(quests = generateDailyQuests(s, content, ctx.today))
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
