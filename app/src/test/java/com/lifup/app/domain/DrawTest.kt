package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import kotlin.random.Random

class DrawTest {
    private val content = Content.load { File("src/main/assets/content/$it").readText() }
    private val pool = content.quests.filter { it.kind == DefKind.POOL }

    /** Share of picks per family over many days of [count] draws. */
    private fun shares(count: Int, focus: Set<Attr> = emptySet(), days: Int = 4000): Map<DrawGroup, Double> {
        val picks = (0 until days).flatMap { drawBalanced(pool, count, focus, Random(it)) }
        return picks.groupingBy { it.drawGroup() }.eachCount().mapValues { it.value.toDouble() / picks.size }
    }

    @Test fun `families are balanced instead of following how many missions they have`() {
        val s = shares(3)
        println("3 picks: $s")
        DrawGroup.entries.forEach { g -> assertTrue("$g ${s[g]}", s.getValue(g) in 0.12..0.30) }
    }

    @Test fun `a small draw is usually all different families but may repeat`() {
        val days = (0 until 4000).map { seed -> drawBalanced(pool, 3, emptySet(), Random(seed)).map { it.drawGroup() } }
        val distinct = days.count { it.toSet().size == 3 } / days.size.toDouble()
        println("3 distinct families: $distinct")
        assertTrue(distinct in 0.8..0.95)
    }

    @Test fun `a fixed mission counts as a pick, so its family rarely comes up again`() {
        val pushups = content.questDefById.getValue("core_pushups")
        fun strengthDays(taken: List<QuestDef>) = (0 until 4000).count { seed ->
            drawBalanced(pool, 3, setOf(Attr.AGI, Attr.INT), Random(seed), taken = taken).any { it.drawGroup() == DrawGroup.STRENGTH }
        } / 4000.0
        val free = strengthDays(emptyList())
        val withFixed = strengthDays(listOf(pushups))
        println("another strength mission: $free -> $withFixed")
        assertTrue(withFixed < 0.2)
        assertTrue(withFixed < free / 2)
    }

    @Test fun `a focus attribute roughly doubles its families`() {
        val base = shares(3).getValue(DrawGroup.STRENGTH)
        val focused = shares(3, setOf(Attr.STR)).getValue(DrawGroup.STRENGTH)
        println("strength: $base -> $focused")
        assertTrue(focused > base * 1.4)
    }

    @Test fun `big draws still spread and never repeat a mission`() {
        val families = (0 until 500).map { seed ->
            val picks = drawBalanced(pool, 10, emptySet(), Random(seed))
            assertEquals(10, picks.distinctBy { it.id }.size)
            picks.map { it.drawGroup() }.toSet().size
        }
        assertTrue(families.all { it >= 4 } && families.average() > 4.8)
    }

    @Test fun `targets follow the step and stop at their cap`() {
        val pushups = content.questDefById.getValue("core_pushups")
        assertEquals(pushups.peakTarget!!, buildQuest(pushups, 100, QuestOrigin.DAILY, step = 1000).target, 0.0)
        assertEquals(15.0, buildQuest(pushups, 100, QuestOrigin.DAILY).target, 0.0)
    }

    @Test fun `open-ended missions get one prompt per day that changes across days`() {
        val journal = content.questDefById.getValue("pool_journal")
        val day = java.time.LocalDate.of(2026, 10, 19)
        assertEquals(journal.promptOn(day), buildQuest(journal, 1, QuestOrigin.DAILY, day = day).prompt)
        assertEquals(6, (0L until 6).map { journal.promptOn(day.plusDays(it)) }.toSet().size)
    }

    @Test fun `yesterday's missions come up less often without changing family shares`() {
        val days = 4000
        var repeats = 0
        var plain = 0
        val families = mutableMapOf<DrawGroup, Int>()
        repeat(days) { seed ->
            val yesterday = drawBalanced(pool, 3, emptySet(), Random(seed))
            val ids = yesterday.map { it.id }.toSet()
            val today = drawBalanced(pool, 3, emptySet(), Random(seed + days), recent = ids)
            repeats += today.count { it.id in ids }
            plain += drawBalanced(pool, 3, emptySet(), Random(seed + days)).count { it.id in ids }
            today.forEach { families.merge(it.drawGroup(), 1, Int::plus) }
        }
        println("repeats from yesterday: $plain -> $repeats")
        assertTrue(repeats < plain * 0.5)
        families.values.forEach { assertTrue(it / (3.0 * days) in 0.12..0.30) }
    }

    @Test fun `missions already in today's list count for the repeat decay`() {
        val strength = pool.filter { it.drawGroup() == DrawGroup.STRENGTH }.take(2)
        val share = (0 until 4000).count { drawBalanced(pool - strength.toSet(), 1, emptySet(), Random(it), taken = strength).single().drawGroup() == DrawGroup.STRENGTH } / 4000.0
        assertTrue("$share", share < 0.03)
    }

    @Test fun `catch up lifts the attributes that fell behind`() {
        assertEquals(emptySet<Attr>(), Attributes().lagging())
        assertEquals(setOf(Attr.AGI, Attr.STR), Attributes(str = 50, agi = 20, int = 120, vit = 300).lagging())
        assertEquals(setOf(Attr.INT), Attributes(str = 100, agi = 100, int = 40, vit = 100).lagging())
        val s = GameState(player = Player(attrXp = Attributes(str = 50, agi = 20, int = 120, vit = 300)), settings = Settings(focusAttrs = setOf(Attr.VIT), catchUp = true))
        assertEquals(setOf(Attr.AGI, Attr.STR), s.drawFocus())
        assertEquals(setOf(Attr.VIT), s.copy(settings = s.settings.copy(catchUp = false)).drawFocus())
    }

    @Test fun `catalog has full texts, no duplicate titles and every family has room to vary`() {
        val all = content.quests + content.portalQuests
        all.forEach { q ->
            listOf(q.title, q.description).forEach { l -> listOf("pt", "en", "es", "fr", "de").forEach { assertTrue("${q.id} $it", l.text(it).isNotBlank()) } }
            if (q.baseTarget > 1 || q.scalingAmount > 0) assertTrue(q.id, "{target}" in q.description.text("pt"))
        }
        listOf("pt", "en").forEach { lang -> assertEquals(lang, content.quests.size, content.quests.map { it.title.text(lang) }.toSet().size) }
        val sizes = pool.groupingBy { it.drawGroup() }.eachCount()
        println("family sizes: $sizes")
        DrawGroup.entries.forEach { assertTrue("$it ${sizes[it]}", sizes.getValue(it) >= 12) }
    }
}
