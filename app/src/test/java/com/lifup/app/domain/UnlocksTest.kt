package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

class UnlocksTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    private fun at(text: String) = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()
    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}) = Engine.run(state, Ctx(content, at(time), zone, Random(1)), action = action)

    /** Someone installing now: the first run happens before onboarding finishes. */
    private fun newPlayer(time: String = "2026-11-11T09:00") = run(GameState(), time).copy(onboarded = true)

    private fun unlockedCards(s: GameState) = s.rewards.filterIsInstance<Reward.Unlocked>()

    @Test fun `players from before keep everything, with nothing announced`() {
        val s = run(GameState(onboarded = true), "2026-11-11T09:00")
        assertTrue(s.unlockAll)
        Feature.entries.forEach { assertTrue(s.has(it)) }
        assertNotNull(s.boss)
        assertTrue(unlockedCards(s).isEmpty())
        assertFalse(s.showStarter())
    }

    @Test fun `day one is only the basics`() {
        val s = run(newPlayer(), "2026-11-11T10:00")
        assertFalse(s.unlockAll)
        Feature.entries.forEach { assertFalse(it.name, s.has(it)) }
        assertNull(s.boss)
        assertFalse(s.canAddExtra(23))
        assertTrue(s.showStarter())
    }

    @Test fun `jumping several levels opens everything up to there on one card`() {
        var s = run(newPlayer(), "2026-11-11T10:00")
        s = run(s.copy(player = s.player.copy(level = 5)), "2026-11-11T10:05")
        val cards = unlockedCards(s)
        assertEquals(1, cards.size)
        assertEquals(listOf(Feature.BOSS, Feature.SHOP, Feature.EXTRA, Feature.PORTAL, Feature.ECHOES), cards.single().features)
        assertNotNull(s.boss)
        // Nothing new: no second card.
        assertEquals(1, unlockedCards(run(s, "2026-11-11T10:10")).size)
        s = run(s.copy(player = s.player.copy(level = 6)), "2026-11-11T10:15")
        assertEquals(listOf(Feature.PAIRS), unlockedCards(s).last().features)
    }

    @Test fun `the first failed days cost nothing, later ones do`() {
        var s = run(newPlayer(), "2026-11-11T10:00")
        val gold = s.player.gold
        s = run(s, "2026-11-12T08:00")
        val first = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertTrue(first.penalty?.grace == true)
        // Avoid missions kept until midnight may still pay; nothing is taken.
        assertTrue(s.player.gold >= gold)
        assertEquals(0, first.penalty?.goldLost)
        assertFalse(s.penalty.active)
        s = run(s, "2026-11-13T08:00")
        assertTrue(s.rewards.filterIsInstance<Reward.DayReport>().last().penalty?.grace == true)
        s = run(s.copy(player = s.player.copy(gold = 500)), "2026-11-14T08:00")
        val third = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertFalse(third.penalty?.grace ?: true)
        assertTrue(s.player.gold < 500)
    }

    @Test fun `starter tasks pay once, and only when done`() {
        var s = run(newPlayer(), "2026-11-11T10:00")
        val gold = s.player.gold
        s = run(s, "2026-11-11T10:01") { claimStarter(StarterTask.MISSION) }
        assertEquals(gold, s.player.gold)
        val q = s.dailyQuests.first()
        s = run(s, "2026-11-11T10:02") { completeQuest(q.id) }
        val afterMission = s.player.gold
        s = run(s, "2026-11-11T10:03") { claimStarter(StarterTask.MISSION) }
        assertEquals(afterMission + StarterTask.MISSION.gold, s.player.gold)
        s = run(s, "2026-11-11T10:04") { claimStarter(StarterTask.MISSION) }
        assertEquals(afterMission + StarterTask.MISSION.gold, s.player.gold)
        assertTrue(StarterTask.MISSION in s.starterClaimed)
    }
}
