package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

/** Pausing for holidays or illness. 2026-10-14 is a Wednesday. */
class PauseTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}): GameState =
        Engine.run(state, Ctx(content, LocalDateTime.parse(time).atZone(zone).toInstant().toEpochMilli(), zone, Random(1)), action = action)

    private fun withStreak(): GameState = run(GameState(onboarded = true), "2026-10-14T09:00").let { it.copy(player = it.player.copy(streak = 10)) }

    @Test fun `a pause asked for in the morning starts today and costs nothing`() {
        var s = run(withStreak(), "2026-10-14T09:30") { startPause(3) }
        assertTrue(s.daily.paused && s.daily.rest)
        assertEquals(0, s.restUsed)
        assertFalse(s.canRest(Ctx(content, System.currentTimeMillis())))
        s = run(s, "2026-10-17T09:00") // three paused days closed, missions untouched
        assertEquals(10, s.player.streak)
        assertFalse(s.penalty.active)
        assertTrue(s.rewards.none { it is Reward.DayReport })
        assertFalse(s.daily.paused)
        assertEquals(listOf("2026-10-14", "2026-10-15", "2026-10-16"), s.pausedDays)
    }

    @Test fun `after noon a pause starts tomorrow`() {
        val s = run(withStreak(), "2026-10-14T15:00") { startPause(2) }
        assertFalse(s.daily.paused)
        assertEquals("2026-10-15", s.pauseFrom)
        assertEquals("2026-10-16", s.pauseUntil)
    }

    @Test fun `ending a pause keeps today paused and frees the days after`() {
        var s = run(withStreak(), "2026-10-14T09:30") { startPause(5) }
        s = run(s, "2026-10-14T20:00") { endPause() }
        assertTrue(s.daily.paused)
        s = run(s, "2026-10-15T09:00")
        assertFalse(s.daily.paused)
        assertEquals(10, s.player.streak)
    }

    @Test fun `the yearly allowance caps how long a pause can be`() {
        val used = (1..20).map { java.time.LocalDate.parse("2026-09-01").plusDays(it.toLong()).toString() }
        val s = run(withStreak().copy(pausedDays = used), "2026-10-14T09:30") { startPause(14) }
        assertEquals("2026-10-21", s.pauseUntil) // 28 - 20 = 8 days left
    }
}
