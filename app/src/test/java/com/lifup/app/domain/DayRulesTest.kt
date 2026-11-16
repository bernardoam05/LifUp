package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

/** Day boundaries and the settings that could be used to slip out of a day: day-end hour, difficulty, block list. */
class DayRulesTest {
    private val content = Content.load { name ->
        listOf("src/main/assets/content/$name", "app/src/main/assets/content/$name").map(::File).first { it.exists() }.readText()
    }
    private val zone = ZoneId.of("Europe/Lisbon")
    private fun at(text: String) = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()
    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}) =
        Engine.run(state, Ctx(content, at(time), zone, Random(1), state.settings.dayEndHour), action = action)
    private fun fresh(time: String = "2026-10-14T09:00") = run(GameState(onboarded = true, unlockAll = true), time)

    @Test fun `a day that ends at 3 stays open past midnight and closes at 3`() {
        var s = run(fresh(), "2026-10-14T10:00") { setDayEnd(3) }
        assertEquals(3, s.settings.dayEndHour)
        s = run(s, "2026-10-15T00:30")
        assertEquals("2026-10-14", s.day)
        assertTrue(s.dayLog.isEmpty())
        s = run(s, "2026-10-15T03:01")
        assertEquals("2026-10-15", s.day)
        assertEquals("2026-10-14", s.dayLog.single().day)
    }

    @Test fun `a mission done after midnight counts for the day still open, bedtime included`() {
        var s = run(fresh(), "2026-10-14T10:00") { setDayEnd(3) }
        val bed = buildQuest(content.questDefById.getValue("pool_sleep"), 1, QuestOrigin.DAILY)
        s = s.copy(quests = s.quests + bed)
        s = run(s, "2026-10-14T20:00") { completeQuest(bed.id) }
        assertEquals(QuestStatus.OPEN, s.quests.first { it.id == bed.id }.status)
        s = run(s, "2026-10-15T00:45") { completeQuest(bed.id) }
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == bed.id }.status)
        assertEquals("2026-10-14", s.day)
    }

    @Test fun `the day-end hour can't move in the small hours`() {
        val s = run(fresh("2026-10-14T02:00"), "2026-10-14T02:30") { setDayEnd(4) }
        assertEquals(0, s.settings.dayEndHour)
    }

    @Test fun `reminders before the day-end hour fall on the next calendar day`() {
        val ctx = Ctx(content, at("2026-10-14T22:00"), zone, Random(1), 3)
        assertEquals(at("2026-10-15T01:00"), ctx.atMinute(ctx.today, 60))
        assertEquals(at("2026-10-14T21:00"), ctx.atHour(ctx.today, 21))
        assertEquals(at("2026-10-15T03:00"), ctx.nextMidnight())
    }

    @Test fun `a new difficulty holds from tomorrow`() {
        var s = fresh()
        s = run(s, "2026-10-14T10:00") { completeQuest(s.dailyQuests.first().id) }
        s = run(s, "2026-10-14T23:50") { setRigor(Rigor.EASY) }
        assertEquals(Rigor.NORMAL, s.settings.rigor)
        assertEquals(Rigor.EASY, s.settings.rigorNext)
        s = run(s, "2026-10-15T08:00")
        assertEquals(Rigor.EASY, s.settings.rigor)
        assertNull(s.settings.rigorNext)
    }

    @Test fun `days never opened break the streak even after a rest day`() {
        var s = fresh().copy(player = Player(streak = 9))
        s = run(s, "2026-10-14T09:30") { toggleRestDay() }
        assertTrue(s.daily.rest)
        s = run(s, "2026-10-18T09:00")
        assertEquals(0, s.player.streak)
    }

    @Test fun `apps can't leave the list while a penalty blocks them`() {
        val now = at("2026-10-14T10:00")
        var s = fresh().copy(
            settings = Settings(blockOnPenalty = true, blockedApps = listOf("a", "b")),
            penalty = Penalty(active = true, blockStart = now - 1000, blockEnd = now + 3_600_000),
        )
        assertTrue(s.blockLocked(now))
        s = run(s, "2026-10-14T10:00") { setBlockedApps(listOf("a", "c")); setBlockOnPenalty(false) }
        assertEquals(setOf("a", "b", "c"), s.settings.blockedApps.toSet())
        assertTrue(s.settings.blockOnPenalty)
        // Without the overlay permission nothing is blocked: the penalty cuts rewards instead, and nothing is locked.
        val blind = s.copy(overlayAllowed = false)
        assertFalse(blind.penaltyBlocks())
        assertEquals(Rules.PENALTY_REWARD_CUT, blind.penaltyCut(), 1e-9)
        assertFalse(blind.blockLocked(now))
    }

    @Test fun `a won no-quitting session counts its real minutes in the statistics`() {
        var s = run(fresh(), "2026-10-14T10:00") { startFocus(FocusSession(0, 20, strict = true)) }
        s = run(s, "2026-10-14T10:21")
        assertEquals(20L, s.count(StatKey.FOCUS_MINUTES))
    }

    @Test fun `onboarding picks decide the first day's missions`() {
        val squats = content.quests.first { it.kind == DefKind.POOL && !it.optional && !it.retired && it.drawGroup() == DrawGroup.STRENGTH && it.auto == null }
        val off = content.quests.filter { it.drawGroup() == DrawGroup.MIND }.map { it.id }.toSet()
        var s = Engine.run(GameState(), Ctx(content, at("2026-10-14T09:00"), zone, Random(1)))
        s = run(s, "2026-10-14T09:01") { finishOnboarding("A", Rigor.NORMAL, off = off, fixed = squats.id) }
        // The chosen habit is the day's fixed mission, the built-in one is gone, and nothing comes from an area left out.
        val fixedToday = s.dailyQuests.filter { s.defOf(it.defId, content)?.kind == DefKind.CORE }
        assertEquals(listOf(squats.id), fixedToday.map { it.defId })
        assertTrue(s.dailyQuests.none { it.defId == "core_pushups" })
        assertTrue(s.dailyQuests.none { it.defId in off })
        assertEquals(4, s.dailyQuests.size)
        s = run(s, "2026-10-15T09:00")
        assertTrue(s.dailyQuests.any { it.defId == squats.id })
        assertTrue(s.dailyQuests.none { it.defId in off })
    }

    @Test fun `a seasonal boss comes once even when its window covers three Mondays`() {
        // 1 April 2030 is a Monday: the spring window (1 to 15 April) covers the 1st, the 8th and the 15th.
        var s = fresh("2030-03-27T09:00")
        val ids = listOf("2030-04-01T09:00", "2030-04-08T09:00", "2030-04-15T09:00").map { time -> s = run(s, time); s.boss!!.bossId }
        assertEquals("season_spring", ids[0])
        assertEquals(1, ids.count { it == "season_spring" })
    }
}
