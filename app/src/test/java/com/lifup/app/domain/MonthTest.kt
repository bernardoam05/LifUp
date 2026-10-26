package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

class MonthTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}): GameState =
        Engine.run(state, Ctx(content, LocalDateTime.parse(time).atZone(zone).toInstant().toEpochMilli(), zone, Random(1)), action = action)

    @Test fun `the first day of a month reports the one gone by`() {
        var s = run(GameState(onboarded = true), "2026-10-30T09:00")
        assertEquals("2026-10", s.monthStart?.month)
        s = run(s, "2026-10-30T10:00") { s.quests.filter { it.origin == QuestOrigin.DAILY }.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-31T09:00")
        assertTrue(s.rewards.none { it is Reward.MonthReport })
        s = run(s, "2026-11-01T09:00")
        val r = s.rewards.filterIsInstance<Reward.MonthReport>().single()
        assertEquals("2026-10", r.month)
        assertEquals(2, r.days)
        assertEquals(1, r.daysKept)
        assertTrue(r.quests >= 3)
        assertTrue(r.attrGain.str > 0)
        assertEquals("2026-11", s.monthStart?.month)
    }

    @Test fun `rest days neither break nor extend the best run`() {
        fun l(passed: Boolean, rest: Boolean = false) = DayLog("d", 1, 1, false, false, rest, passed)
        assertEquals(3, bestRun(listOf(l(true), l(true), l(false, rest = true), l(true), l(false), l(true))))
    }
}
