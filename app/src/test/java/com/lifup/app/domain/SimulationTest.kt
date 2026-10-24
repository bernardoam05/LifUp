package com.lifup.app.domain

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDate
import java.time.ZoneId
import kotlin.random.Random

/**
 * Plays the engine for months with simulated users to catch balance problems (runaway gold, levels
 * that stall, bosses nobody can beat). Prints a table to build/simulation.txt.
 */
class SimulationTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    private data class Profile(val name: String, val keep: Double)
    private data class Row(val profile: String, val day: Int, val s: GameState)

    private fun at(day: LocalDate, hour: Int) = day.atTime(hour, 0).atZone(zone).toInstant().toEpochMilli()

    private fun simulate(p: Profile, days: Int, seed: Int): List<Row> {
        val rng = Random(seed)
        val start = LocalDate.parse("2026-01-05")
        fun step(s: GameState, day: LocalDate, hour: Int, action: Tx.() -> Unit = {}): GameState {
            // Advance the clock first, then act on the current day.
            val ctx = Ctx(content, at(day, hour), zone, Random(rng.nextInt()))
            val settled = Engine.run(s, ctx)
            return Engine.run(settled, ctx, action).let { it.copy(rewards = emptyList()) }
        }
        var s = GameState(onboarded = true)
        val rows = mutableListOf<Row>()
        for (d in 0 until days) {
            val day = start.plusDays(d.toLong())
            s = step(s, day, 8) { repeat(3) { addSideQuest("side $it") } }
            s = step(s, day, 14) {
                rollPortal()
                s.portal?.quest?.let { if (rng.nextDouble() < p.keep) completeQuest(it.id) }
            }
            s = step(s, day, 20) {
                s.dailyQuests.forEach { q ->
                    val kept = rng.nextDouble() < p.keep
                    when (q.type) {
                        QuestType.FORBIDDEN, QuestType.LIMIT -> if (!kept) toggleFailed(q.id)
                        else -> if (kept) completeQuest(q.id)
                    }
                }
                s.penalty.quests.forEach { if (rng.nextDouble() < p.keep) completeQuest(it.id) }
                s.boss?.challenges().orEmpty().filter { it.status == QuestStatus.OPEN && rng.nextDouble() < p.keep / 3 }.forEach { completeQuest(it.id) }
                s.sideQuests.filter { !it.done }.forEach { if (rng.nextDouble() < p.keep) completeSideQuest(it.id) }
                spend()
            }
            if ((d + 1) % 30 == 0) rows += Row(p.name, d + 1, s)
        }
        return rows
    }

    /** A sensible player: buys offered shadows it can afford, levels them, fills the squad. */
    private fun Tx.spend() {
        s.shop.shadowOffers.forEach { id -> if (s.owned(id) == null) buyShadow(id) }
        s.shadows.forEach { upgradeShadow(it.id) }
        s.shadows.sortedByDescending { it.level }.take(Rules.SQUAD_SIZE).forEach { if (it.id !in s.squad) toggleSquad(it.id) }
    }

    @Test fun `long run balance stays sane`() {
        val profiles = listOf(Profile("perfect", 1.0), Profile("steady", 0.85), Profile("casual", 0.6), Profile("lazy", 0.3))
        val rows = profiles.flatMap { simulate(it, 120, seed = it.name.hashCode()) }
        val table = buildString {
            appendLine("%-8s %4s %5s %7s %8s %7s %8s %6s %6s %7s %6s".format("profile", "day", "lvl", "gold", "earned", "shadow", "bosses", "streak", "best", "perfect", "penal"))
            rows.forEach { (name, day, s) ->
                appendLine(
                    "%-8s %4d %5d %7d %8d %7d %8d %6d %6d %7d %6d".format(
                        name, day, s.player.level, s.player.gold, s.count(StatKey.GOLD_EARNED), s.shadows.size,
                        s.count(StatKey.BOSSES_DEFEATED), s.player.streak, s.player.bestStreak,
                        s.count(StatKey.PERFECT_DAYS), s.count(StatKey.PENALTIES_TAKEN),
                    ),
                )
            }
        }
        File("build/simulation.txt").writeText(table)
        println(table)
        val last = rows.groupBy { it.profile }.mapValues { it.value.last().s }
        // More effort must always pay more.
        assertTrue(last.getValue("perfect").player.level >= last.getValue("steady").player.level)
        assertTrue(last.getValue("steady").player.level > last.getValue("casual").player.level)
        assertTrue(last.getValue("casual").player.level >= last.getValue("lazy").player.level)
        // Nobody goes broke or below level 1.
        assertTrue(last.values.all { it.player.gold >= 0 && it.player.level >= 1 })
    }
}
