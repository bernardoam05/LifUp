package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import java.time.LocalDate
import java.time.ZoneId
import kotlin.random.Random

/** Mission load: drawn missions follow kept days, not level. */
class LoadTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }
    private val start = LocalDate.of(2026, 10, 19)

    private fun ctx(day: LocalDate, hour: Int) = Ctx(content, day.atTime(hour, 0).atZone(zone).toInstant().toEpochMilli(), zone, Random(1))

    /** Opens [day], then keeps (completes everything) or misses (does nothing) it. */
    private fun day(s: GameState, day: LocalDate, keep: Boolean): GameState {
        val opened = Engine.run(s, ctx(day, 8))
        return if (!keep) opened else Engine.run(opened, ctx(day, 22), action = { this.s.dailyQuests.forEach { completeQuest(it.id) } })
    }

    private fun play(pattern: String): GameState {
        var s = Engine.run(GameState(onboarded = true), ctx(start.minusDays(1), 8))
        pattern.forEachIndexed { i, c -> s = day(s, start.plusDays(i.toLong()), c == 'K') }
        return Engine.run(s, ctx(start.plusDays(pattern.length.toLong()), 8))
    }

    @Test fun `starts at the base and gains one after seven kept days`() {
        assertEquals(Rules.BASE_DRAWN, play("").drawnCount())
        assertEquals(Rules.BASE_DRAWN, play("KKKKKK").drawnCount())
        val s = play("KKKKKKK")
        assertEquals(Rules.BASE_DRAWN + 1, s.drawnCount())
        assertEquals(Rules.BASE_DRAWN + 1, s.dailyQuests.count { content.questDefById[it.defId]?.kind == DefKind.POOL })
    }

    @Test fun `a miss waits for the recovery day before costing a mission`() {
        val up = "KKKKKKK"
        assertEquals(Rules.BASE_DRAWN + 1, play(up + "M").drawnCount()) // still recoverable
        assertEquals(Rules.BASE_DRAWN + 1, play(up + "MK").drawnCount()) // perfect day recovered it
        assertEquals(Rules.BASE_DRAWN, play(up + "MM").drawnCount())
    }

    @Test fun `never below the base and never above the day's ceiling`() {
        assertEquals(Rules.BASE_DRAWN, play("MMMM").drawnCount())
        val s = play("K".repeat(7 * 6))
        val drawn = s.dailyQuests.count { content.questDefById[it.defId]?.kind == DefKind.POOL }
        assertEquals(Rules.MAX_DAY_MISSIONS, s.dailyQuests.size)
        assertEquals(Rules.MAX_DAY_MISSIONS - 1, drawn)
    }

    @Test fun `players from the level era keep their fourth drawn mission`() {
        val old = GameState(onboarded = true, player = Player(level = 30))
        assertEquals(Rules.BASE_DRAWN + 1, Engine.run(old, ctx(start, 8)).drawnCount())
    }

    @Test fun `recovery day with an avoid mission left unmarked restores the streak and counts the day`() {
        var s = play("KKKM") // streak 3, then a miss: tomorrow can recover it
        val recoverDay = start.plusDays(4)
        assertEquals(0, s.player.streak)
        assertEquals(3, s.recovery?.streak)
        // Make sure today has an avoid mission, then do everything else and leave it untouched.
        s = Engine.run(s, ctx(recoverDay, 9), action = { if (this.s.dailyQuests.none { it.type == QuestType.FORBIDDEN }) addDefToToday("pool_social") })
        s = Engine.run(s, ctx(recoverDay, 22), action = { this.s.dailyQuests.filter { it.type != QuestType.FORBIDDEN }.forEach { completeQuest(it.id) } })
        s = Engine.run(s, ctx(recoverDay.plusDays(1), 8))
        val report = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertEquals(true, report.perfect)
        assertEquals(true, report.streakRestored)
        assertEquals(4, s.player.streak)
    }
}
