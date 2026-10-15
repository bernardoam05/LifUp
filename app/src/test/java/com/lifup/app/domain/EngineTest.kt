package com.lifup.app.domain

import kotlinx.serialization.encodeToString
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

class EngineTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    private fun at(text: String) = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()
    private fun ctx(time: String, seed: Int = 1) = Ctx(content, at(time), zone, Random(seed))
    private fun run(state: GameState, time: String, seed: Int = 1, action: Tx.() -> Unit = {}) =
        Engine.run(state, ctx(time, seed), action)

    private fun fresh(time: String = "2026-10-14T09:00") = run(GameState(onboarded = true), time)

    @Test fun `level 1 normal day has 4 core and 3 pool missions`() {
        val s = fresh()
        assertEquals(7, s.dailyQuests.size)
        assertEquals(4, s.dailyQuests.count { content.questDefById[it.defId]?.kind == DefKind.CORE })
        assertNotNull(s.boss)
        assertEquals(3, s.shop.shadowOffers.size)
    }

    @Test fun `generation is deterministic per day`() {
        val a = fresh().dailyQuests.map { it.defId }
        val b = fresh("2026-10-14T20:00").dailyQuests.map { it.defId }
        assertEquals(a, b)
    }

    @Test fun `completing missions grants xp gold and levels`() {
        var s = fresh()
        val q = s.dailyQuests.first { it.type == QuestType.TRAINING }
        s = run(s, "2026-10-14T10:00") { completeQuest(q.id) }
        val done = s.quests.first { it.id == q.id }
        assertEquals(QuestStatus.DONE, done.status)
        assertEquals(q.xp, done.xpGained)
        assertEquals(q.gold, done.goldGained)
        assertEquals(q.gold, s.player.gold)
        s = run(s, "2026-10-14T10:01") { gainXp(500, hitsBoss = false, boosted = false) }
        assertTrue(s.player.level >= 3)
    }

    @Test fun `perfect day grows streak and binds a shadow`() {
        var s = fresh()
        s = run(s, "2026-10-14T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        assertTrue(s.daily.extractionDone)
        assertEquals(1, s.shadows.size)
        assertTrue(s.rewards.any { it is Reward.ShadowGained })
        s = run(s, "2026-10-15T08:00")
        assertEquals(1, s.player.streak)
        val report = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertTrue(report.perfect)
        assertNull(report.penalty)
        assertEquals("2026-10-15", s.day)
    }

    @Test fun `failed day applies penalty and resets streak`() {
        var s = fresh().let { it.copy(player = it.player.copy(streak = 5, xp = 90, gold = 500)) }
        s = run(s, "2026-10-15T08:00")
        assertTrue(s.penalty.active)
        assertTrue(s.penalty.quests.isNotEmpty())
        assertEquals(0, s.player.streak)
        assertEquals(0, s.player.xp)
        assertEquals(380, s.player.gold)
        assertEquals(90, s.rewards.filterIsInstance<Reward.DayReport>().last().penalty!!.xpLost)
        s.penalty.quests.forEach { pq -> s = run(s, "2026-10-15T09:00") { completeQuest(pq.id) } }
        assertFalse(s.penalty.active)
        assertEquals(1L, s.count(StatKey.PENALTIES_CLEARED))
    }

    @Test fun `rest day skips penalty`() {
        var s = run(fresh(), "2026-10-14T10:00") { toggleRestDay() }
        s = run(s, "2026-10-15T08:00")
        assertFalse(s.penalty.active)
        assertTrue(s.rewards.filterIsInstance<Reward.DayReport>().last().rest)
    }

    @Test fun `penalty block window follows rigor`() {
        var s = fresh().let { it.copy(settings = it.settings.copy(blockOnPenalty = true)) }
        s = run(s, "2026-10-15T08:00")
        assertEquals(at("2026-10-15T10:00"), s.penalty.blockStart)
        assertEquals(at("2026-10-15T22:00"), s.penalty.blockEnd)
        assertTrue(s.penaltyBlockActive(at("2026-10-15T12:00")))
        assertFalse(s.penaltyBlockActive(at("2026-10-15T09:00")))
    }

    @Test fun `streak shield item saves the streak`() {
        var s = fresh().let { it.copy(player = it.player.copy(streak = 4), inventory = mapOf("escudo_constancia" to 1)) }
        s = run(s, "2026-10-15T08:00")
        assertEquals(4, s.player.streak)
        assertEquals(0, s.items("escudo_constancia"))
    }

    @Test fun `focus minutes complete focus quests`() {
        var s = fresh()
        val focusDef = content.quests.first { it.id == "pool_deepwork" }
        val fq = buildQuest(focusDef, 1, QuestOrigin.DAILY)
        s = s.copy(quests = s.quests + fq)
        s = run(s, "2026-10-14T10:00") { startFocus(FocusSession(0, 60)) }
        assertNotNull(s.focus)
        s = run(s, "2026-10-14T11:01")
        assertNull(s.focus)
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == fq.id }.status)
        assertEquals(1L, s.count(StatKey.FOCUS_SESSIONS))
    }

    @Test fun `strict focus loses minutes when stopped early`() {
        var s = run(fresh(), "2026-10-14T10:00") { startFocus(FocusSession(0, 60, strict = true)) }
        s = run(s, "2026-10-14T10:30") { stopFocus() }
        assertNull(s.focus)
        assertEquals(0L, s.count(StatKey.FOCUS_MINUTES))
    }

    @Test fun `pomodoro credits only work phases`() {
        val p = PomodoroPlan(25, 5, 4)
        assertEquals(115, Pomodoro.totalMinutes(p))
        assertEquals(25.0, Pomodoro.workMinutes(p, 28.0), 0.001)
        assertEquals(50.0, Pomodoro.workMinutes(p, 55.0), 0.001)
        assertEquals(100.0, Pomodoro.workMinutes(p, 115.0), 0.001)
        assertFalse(Pomodoro.phaseAt(p, 27.0).work)
        assertEquals(2, Pomodoro.phaseAt(p, 31.0).cycle)
    }

    @Test fun `boss challenge damages and xp defeats the boss`() {
        var s = fresh()
        val boss = s.boss!!
        s = run(s, "2026-10-14T10:00") { completeQuest(boss.challenge.id) }
        assertTrue(s.boss!!.hp < boss.maxHp)
        s = run(s, "2026-10-14T10:05") { gainXp(boss.maxHp, boosted = false) }
        assertTrue(s.boss!!.defeated)
        val def = content.bossById[boss.bossId]!!
        assertNotNull(s.owned(def.shadowId))
        assertEquals(1L, s.count(StatKey.BOSSES_DEFEATED))
    }

    @Test fun `boss rotates on monday`() {
        val s = fresh()
        val next = run(s, "2026-10-19T09:00")
        assertEquals("2026-10-19", next.boss!!.weekKey)
    }

    @Test fun `seasonal boss appears in its window`() {
        val s = run(GameState(onboarded = true), "2026-10-28T09:00")
        assertEquals("season_halloween", s.boss!!.bossId)
    }

    @Test fun `shadow upgrade consumes gold and copies`() {
        var s = fresh().copy(
            shadows = listOf(OwnedShadow("auto_pawn", 1, 3)),
            player = Player(level = 5, gold = 1000),
        )
        s = run(s, "2026-10-14T10:00") { upgradeShadow("auto_pawn") }
        assertEquals(2, s.owned("auto_pawn")!!.level)
        assertEquals(0, s.owned("auto_pawn")!!.copies)
        assertEquals(900 + 50, s.player.gold) // + level-5 achievement
    }

    @Test fun `squad passives boost xp`() {
        var s = fresh().copy(shadows = listOf(OwnedShadow("bone_collector", 1)), squad = listOf("bone_collector"))
        val p = s.passives(content, at("2026-10-14T10:00"))
        assertEquals(0.02, p.xp, 1e-9)
        s = run(s, "2026-10-14T10:00") { gainXp(50, hitsBoss = false) }
        assertEquals(51, s.player.xp)
    }

    @Test fun `achievements unlock tiers and pay gold`() {
        var s = fresh().copy(counters = mapOf(StatKey.QUESTS_COMPLETED to 9))
        val q = s.dailyQuests.first { it.type == QuestType.TRAINING }
        s = run(s, "2026-10-14T10:00") { completeQuest(q.id) }
        assertEquals(1, s.achievements["quests_total"])
        assertNotNull(s.owned("shadow_wisp"))
    }

    @Test fun `shop purchase respects stock and gold`() {
        var s = fresh().copy(player = Player(gold = 5000))
        s = run(s, "2026-10-14T10:00") { buyItem("lagrima_purificacao"); buyItem("lagrima_purificacao"); buyItem("lagrima_purificacao") }
        assertEquals(2, s.items("lagrima_purificacao"))
        assertEquals(5000 - 2400 + 50, s.player.gold) // + gold-spent achievement
    }

    @Test fun `extra missions unlock after the daily set`() {
        var s = fresh()
        assertFalse(s.canAddExtra())
        s = run(s, "2026-10-14T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } ; addExtraQuest() }
        assertEquals(1, s.extraQuests.size)
    }

    @Test fun `portal opens and closes with rewards`() {
        var s = run(fresh(), "2026-10-14T10:00") { openPortal() }
        val portal = s.portal!!
        s = run(s, "2026-10-14T10:10") { setProgress(portal.quest.id, portal.quest.target) ; completeQuest(portal.quest.id) }
        assertNull(s.portal)
        assertEquals(1L, s.count(StatKey.PORTALS_CLEARED))
    }

    @Test fun `state survives json round trip`() {
        var s = run(fresh(), "2026-10-14T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-15T08:00")
        val text = Content.json.encodeToString(s)
        val back = Content.json.decodeFromString<GameState>(text)
        assertEquals(s, back)
    }
}
