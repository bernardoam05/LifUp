package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

class PlusTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }
    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}) =
        Engine.run(state, Ctx(content, LocalDateTime.parse(time).atZone(zone).toInstant().toEpochMilli(), zone, Random(1)), action = action)

    private val echoes = listOf("a", "b", "c", "d", "e").map { OwnedShadow(it) }

    @Test fun `saved squads need LifUp+`() {
        val s = run(GameState(onboarded = true, shadows = echoes, squad = listOf("a", "b")), "2026-11-11T09:00") { saveSquad(0) }
        assertTrue(s.savedSquads.isEmpty())
    }

    @Test fun `a saved squad comes back, but today's newcomers stay until tomorrow`() {
        var s = run(GameState(onboarded = true, plus = true, shadows = echoes, squad = listOf("a", "b", "c")), "2026-11-10T09:00") { saveSquad(1) }
        assertEquals(listOf("a", "b", "c"), s.savedSquads[1])
        // Next day: d joins (locked today), then the saved squad goes on.
        s = run(s.copy(squad = listOf("a", "b")), "2026-11-11T09:00") { toggleSquad("d"); loadSquad(1) }
        assertEquals(listOf("d", "a", "b"), s.squad)
        assertTrue(s.squadLocked("d"))
        // The day after, nothing is locked: the saved squad goes on whole.
        s = run(s, "2026-11-12T09:00") { loadSquad(1) }
        assertEquals(listOf("a", "b", "c"), s.squad)
        assertTrue(s.squadLocked("c"))
    }

    @Test fun `csv exports have a header and one row each`() {
        val s = GameState(dayLog = listOf(DayLog("2026-11-10", 3, 4, false, false, false, true)), missionStats = mapOf("core_pushups" to MissionStat(5, 8)))
        assertEquals(listOf("day,done,total,perfect,passed,rest,penalty", "2026-11-10,3,4,false,true,false,false"), s.daysCsv().trim().lines())
        assertEquals(2, s.missionsCsv(content, "en").trim().lines().size)
    }

    private fun at(t: String) = LocalDateTime.parse(t).atZone(zone).toInstant().toEpochMilli()

    @Test fun `scheduled blocks run in their hours, overnight ones too`() {
        val s = GameState(plus = true, settings = Settings(blockedApps = listOf("x"), blockWindows = listOf(BlockWindow(listOf(3), 23 * 60, 7 * 60), BlockWindow(listOf(4), 9 * 60, 13 * 60))))
        // Wednesday 2026-11-11 23:30 → Thursday 07:00.
        assertEquals(at("2026-11-12T07:00"), s.scheduledBlockUntil(at("2026-11-11T23:30"), zone))
        assertEquals(at("2026-11-12T07:00"), s.scheduledBlockUntil(at("2026-11-12T03:00"), zone))
        assertEquals(null, s.scheduledBlockUntil(at("2026-11-12T08:00"), zone))
        assertEquals(at("2026-11-12T13:00"), s.scheduledBlockUntil(at("2026-11-12T10:00"), zone))
        assertEquals(at("2026-11-12T09:00"), s.nextBlockBoundary(at("2026-11-12T08:00"), zone))
        // Not on the wrong day, nor without LifUp+ or apps to block.
        assertEquals(null, s.scheduledBlockUntil(at("2026-11-13T10:00"), zone))
        assertEquals(null, s.copy(plus = false).scheduledBlockUntil(at("2026-11-12T10:00"), zone))
        assertEquals(null, s.copy(settings = s.settings.copy(blockedApps = emptyList())).scheduledBlockUntil(at("2026-11-12T10:00"), zone))
    }
}
