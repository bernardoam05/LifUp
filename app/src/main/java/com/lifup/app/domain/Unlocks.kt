package com.lifup.app.domain

import kotlinx.serialization.Serializable

/**
 * New players meet the game a piece at a time: each of these opens at a level, so day one is only today's
 * missions, focus and the hero. Unlocks follow the current level (never the moment of levelling), so jumping
 * several levels at once opens everything up to there, announced together on one card. Players from before
 * this existed keep everything ([GameState.unlockAll]).
 */
@Serializable
enum class Feature(val level: Int) {
    BOSS(2), SHOP(3), EXTRA(4), PORTAL(4), ECHOES(5), PAIRS(6);
}

/** Starter tasks shown on day one, each paying a little gold once: they teach by doing. */
@Serializable
enum class StarterTask(val gold: Int) { MISSION(15), SIDE(10), FOCUS(15) }

object Unlocks {
    /** Days whose failure costs nothing while someone is learning the game. */
    const val GRACE_DAYS = 2
}

fun GameState.has(f: Feature): Boolean = unlockAll || player.level >= f.level || when (f) {
    // Something already earned or under way keeps its door open whatever the level.
    Feature.ECHOES -> shadows.isNotEmpty()
    Feature.PAIRS -> pairs.isNotEmpty()
    Feature.BOSS -> boss != null
    else -> false
}

/** Within the first days: a failed day doesn't cost XP, gold or penalty missions yet. */
fun GameState.inGrace() = !unlockAll && dayLog.size < Unlocks.GRACE_DAYS

fun GameState.starterDone(t: StarterTask): Boolean = when (t) {
    StarterTask.MISSION -> count(StatKey.QUESTS_COMPLETED) > 0
    StarterTask.SIDE -> count(StatKey.SIDE_COMPLETED) > 0
    StarterTask.FOCUS -> count(StatKey.FOCUS_MINUTES) >= 5
}

/** The starter card: shown to new players until every task is claimed. */
fun GameState.showStarter() = !unlockAll && StarterTask.entries.any { it !in starterClaimed }

fun Tx.claimStarter(t: StarterTask) {
    if (t in s.starterClaimed || !s.starterDone(t)) return
    s = s.copy(starterClaimed = s.starterClaimed + t, player = s.player.copy(gold = s.player.gold + t.gold))
    count(StatKey.GOLD_EARNED, t.gold.toLong())
}

/** Announces what just opened, all of it on one card. Runs after every action. */
fun Tx.announceUnlocks() {
    val fresh = Feature.entries.filter { it !in s.announced && s.has(it) }
    if (fresh.isEmpty()) return
    s = s.copy(announced = s.announced + fresh)
    if (!s.unlockAll && s.onboarded) reward { Reward.Unlocked(it, fresh) }
}
