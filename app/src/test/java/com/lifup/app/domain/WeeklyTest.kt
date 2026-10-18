package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

/** "N times a week" missions. 2026-10-14 is a Wednesday; 2026-10-19 a Monday. */
class WeeklyTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }
    private val train = QuestDef("custom_train", DefKind.CORE, QuestType.TRAINING, plainText("Treinar"), plainText(""), 1.0, unit = "", baseXp = 60, baseGold = 15, perWeek = 4)

    private fun at(text: String) = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()
    /** Brings the state to [time] (closing any days in between), then runs [action]. */
    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}): GameState {
        val ctx = Ctx(content, at(time), zone, Random(1))
        return Engine.run(state, ctx, action = action)
    }

    /** A save whose weekly mission was added on Wednesday 14th. */
    private fun withWeekly(): GameState =
        run(run(GameState(onboarded = true), "2026-10-14T09:00"), "2026-10-14T09:05") { saveCustomDef(train); addDefToToday(train.id) }

    private fun GameState.train() = quests.first { it.defId == train.id }

    /** Walks day by day to [day] at 09:00, doing the weekly mission on the listed days. */
    private fun walk(start: GameState, days: List<String>, doOn: Set<String> = emptySet()): GameState =
        days.fold(start) { s, d ->
            val opened = run(s, "${d}T09:00")
            if (d in doOn) run(opened, "${d}T10:00") { completeQuest(opened.train().id) } else opened
        }

    @Test fun `the week a mission is added it is optional and never due`() {
        var s = withWeekly()
        assertEquals(QuestOrigin.WEEKLY, s.train().origin)
        assertEquals(WeekTally("2026-10-12", goal = 2, trial = true), s.weekly[train.id])
        s = walk(s, listOf("2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"))
        assertEquals(QuestOrigin.WEEKLY, s.train().origin)
        assertTrue(s.dayLog.all { it.total == 4 }) // never counted while skipped
    }

    @Test fun `a free weekly mission done counts for the day`() {
        var s = walk(withWeekly(), listOf("2026-10-19"))
        assertEquals(QuestOrigin.WEEKLY, s.train().origin)
        assertEquals(4, s.dayGoal().total)
        s = run(s, "2026-10-19T10:00") { completeQuest(s.train().id) }
        assertEquals(5, s.dayGoal().total)
        assertEquals(1, s.weekly[train.id]?.done)
        s = run(s, "2026-10-20T09:00")
        assertEquals(5, s.dayLog.last().total)
        assertEquals(1, s.dayLog.last().done)
    }

    @Test fun `it becomes due when it can't be skipped anymore and takes a drawn slot`() {
        val mon = walk(withWeekly(), listOf("2026-10-19", "2026-10-20", "2026-10-21"))
        assertEquals(QuestOrigin.WEEKLY, mon.train().origin)
        val thu = run(mon, "2026-10-22T09:00") // 4 to go, 4 days left
        assertEquals(QuestOrigin.DAILY, thu.train().origin)
        assertEquals(4, thu.dailyQuests.size)
        assertEquals(2, thu.dailyQuests.count { content.questDefById[it.defId]?.kind == DefKind.POOL })
    }

    @Test fun `missing a due day costs that day only, then the week is lost quietly`() {
        val thu = walk(withWeekly(), listOf("2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"))
        assertEquals(QuestOrigin.DAILY, thu.train().origin)
        val fri = run(thu, "2026-10-23T09:00")
        assertEquals(4, fri.dayLog.last().total) // it counted on Thursday, in a drawn mission's place
        assertEquals(QuestOrigin.WEEKLY, fri.train().origin)
        assertEquals(QuestOrigin.WEEKLY, run(fri, "2026-10-24T09:00").train().origin)
    }

    @Test fun `reaching the goal pays a bonus once and shows in the weekly report`() {
        val days = listOf("2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22")
        var s = walk(withWeekly(), days.dropLast(1), doOn = days.toSet())
        s = run(s, "2026-10-22T09:00")
        val before = s.player.gold
        s = run(s, "2026-10-22T10:00") { completeQuest(s.train().id) }
        assertTrue(s.weekly[train.id]!!.rewarded)
        val paid = s.player.gold - before
        assertTrue(paid >= train.baseGold * (1 + Rules.WEEK_GOAL_GOLD_MULT))
        s = run(s, "2026-10-22T10:05") { undoQuest(s.train().id) }
        s = run(s, "2026-10-22T10:06") { completeQuest(s.train().id) }
        assertEquals(before + paid, s.player.gold)
        s = run(s, "2026-10-26T09:00")
        val report = s.rewards.filterIsInstance<Reward.WeekReport>().last()
        assertEquals(listOf(WeekLine(train.id, 4, 4)), report.weekly)
        assertEquals(WeekTally("2026-10-26", goal = 4), s.weekly[train.id])
    }

    @Test fun `a raised goal waits for Monday, a lowered one applies at once`() {
        var s = walk(withWeekly(), listOf("2026-10-19"))
        s = run(s, "2026-10-19T10:00") { saveCustomDef(train.copy(perWeek = 6)) }
        assertEquals(4, s.weekly[train.id]?.goal)
        s = run(s, "2026-10-19T10:01") { saveCustomDef(train.copy(perWeek = 2)) }
        assertEquals(2, s.weekly[train.id]?.goal)
        assertFalse(s.weekly[train.id]!!.trial)
        assertNotNull(run(s, "2026-10-26T09:00").weekly[train.id]?.takeIf { it.goal == 2 })
    }

    @Test fun `an edited built-in mission replaces the original until it is reset`() {
        var s = run(GameState(onboarded = true), "2026-10-14T09:00")
        val pushups = content.questDefById.getValue("core_pushups")
        s = run(s, "2026-10-14T09:05") { saveCustomDef(pushups.copy(perWeek = 3)) }
        val defs = s.availableDefs(content).filter { it.id == "core_pushups" }
        assertEquals(listOf(3), defs.map { it.perWeek })
        assertEquals(pushups.title, defs.single().title) // translations kept
        assertEquals(0L, s.count(StatKey.CUSTOM_QUESTS))
        s = run(s, "2026-10-14T09:06") { deleteCustomDef("core_pushups") }
        assertEquals(pushups, s.availableDefs(content).single { it.id == "core_pushups" })
    }

    @Test fun `a daily mission kept on some days is offered as weekly`() {
        val daily = train.copy(perWeek = null)
        var s = run(run(GameState(onboarded = true), "2026-10-18T09:00"), "2026-10-18T09:05") { saveCustomDef(daily); addDefToToday(daily.id) }
        val week = (19..25).map { "2026-10-$it" }
        s = walk(s, week, doOn = setOf("2026-10-19", "2026-10-21", "2026-10-23"))
        s = run(s, "2026-10-26T09:00")
        assertEquals(WeeklyHint(daily.id, 3, 3, 7), s.weeklyHint)
        s = run(s, "2026-10-26T09:05") { acceptWeeklyHint() }
        assertEquals(3, s.defOf(daily.id, content)?.perWeek)
        assertEquals(QuestOrigin.WEEKLY, s.train().origin)
        assertTrue(s.weekly[daily.id]!!.trial)
        assertEquals(null, s.weeklyHint)
    }
}
