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
}
