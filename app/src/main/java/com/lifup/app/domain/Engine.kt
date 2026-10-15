package com.lifup.app.domain

/** Single entry point for state changes: catch up with the clock, apply the action, settle achievements. */
object Engine {
    private const val MAX_PENDING_REWARDS = 40

    fun run(state: GameState, ctx: Ctx, action: Tx.() -> Unit = {}): GameState {
        val tx = Tx(state, ctx)
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

fun Tx.finishOnboarding(name: String, rigor: Rigor) {
    s = s.copy(onboarded = true, player = s.player.copy(name = name.trim().take(24)), settings = s.settings.copy(rigor = rigor))
}

fun Tx.updateSettings(f: (Settings) -> Settings) {
    s = s.copy(settings = f(s.settings))
}

fun Tx.recordBlockedAttempt() = count(StatKey.BLOCKED_ATTEMPTS)
