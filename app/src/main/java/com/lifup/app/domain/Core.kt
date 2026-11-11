package com.lifup.app.domain

import java.time.LocalDate

/** How the Core looks right now; the UI picks the sprite (SLEEPING is the relaxed face with drifting Zs). */
enum class CoreMood { NEUTRAL, CONFIDENT, HAPPY, FOCUSED, RELAXED, EXCITED, TIRED, FRUSTRATED, SLEEPING }

/** The Core, LifUp's companion: six forms unlocked by hunter rank and a face that follows the day. */
object Core {
    const val STAGES = 6
    /** From this hour (and until [WAKE_HOUR]) an idle Core sleeps. */
    const val SLEEP_HOUR = 23
    const val WAKE_HOUR = 6

    /** The most evolved form a rank has unlocked: E and D the first, then one per rank up to SS. */
    fun unlockedStage(rank: HunterRank): Int = when (rank) {
        HunterRank.E, HunterRank.D -> 1
        HunterRank.C -> 2
        HunterRank.B -> 3
        HunterRank.A -> 4
        HunterRank.S -> 5
        HunterRank.N -> 6
    }

    /** The rank that unlocks [stage]. */
    fun rankFor(stage: Int): HunterRank = HunterRank.entries.first { unlockedStage(it) >= stage }

    fun unlocked(s: GameState): Int = unlockedStage(HunterRank.of(s.player.level))

    /** The form shown: the one picked while it's still unlocked (a level lost can take it back), else the latest. */
    fun stage(s: GameState): Int = s.settings.coreStage?.takeIf { it in 1..unlocked(s) } ?: unlocked(s)

    /**
     * The face for the day so far, first match wins: focusing, resting, asleep at night, all of today's
     * missions done, coming back from missed days (tired after one, frustrated after two in a row),
     * under way, or just starting.
     */
    fun mood(s: GameState, hour: Int): CoreMood {
        val daily = s.dailyQuests
        val done = daily.count { it.status == QuestStatus.DONE }
        return when {
            s.focus != null -> CoreMood.FOCUSED
            s.daily.rest || s.daily.paused -> CoreMood.RELAXED
            hour >= SLEEP_HOUR || hour < WAKE_HOUR -> CoreMood.SLEEPING
            daily.isNotEmpty() && done == daily.size -> CoreMood.HAPPY
            done == 0 && missedInARow(s) >= 2 -> CoreMood.FRUSTRATED
            done == 0 && missedInARow(s) == 1 -> CoreMood.TIRED
            done > 0 -> CoreMood.CONFIDENT
            else -> CoreMood.NEUTRAL
        }
    }

    /** Missed days right before today (rest days neither count nor break the run). */
    internal fun missedInARow(s: GameState): Int {
        val today = runCatching { LocalDate.parse(s.day) }.getOrNull() ?: return 0
        val byDay = s.dayLog.associateBy { it.day }
        var n = 0
        var d = today.minusDays(1)
        while (n < 7) {
            val log = byDay[d.toString()] ?: break
            if (!log.rest) {
                // Logs from before "passed" was kept: no penalty and 60% done was a kept day.
                val kept = log.passed || (!log.penalty && log.total > 0 && log.done >= log.total * 0.6)
                if (kept) break
                n++
            }
            d = d.minusDays(1)
        }
        return n
    }
}
