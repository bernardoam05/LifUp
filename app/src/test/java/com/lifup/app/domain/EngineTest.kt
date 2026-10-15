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
        // Avoid/limit missions still count as kept and pay out at midnight.
        val keptGold = s.dailyQuests.filter { it.status == QuestStatus.OPEN && it.isSuccessful() }.sumOf { it.gold }
        s = run(s, "2026-10-15T08:00")
        assertTrue(s.penalty.active)
        assertTrue(s.penalty.quests.isNotEmpty())
        assertEquals(0, s.player.streak)
        assertEquals(0, s.player.xp)
        assertEquals(500 + keptGold - 120, s.player.gold)
        // Loss is capped by the XP actually held (never drops a level).
        assertTrue(s.rewards.filterIsInstance<Reward.DayReport>().last().penalty!!.xpLost in 1..120)
        s.penalty.quests.forEach { pq -> s = run(s, "2026-10-15T09:00") { completeQuest(pq.id) } }
        assertFalse(s.penalty.active)
        assertEquals(1L, s.count(StatKey.PENALTIES_CLEARED))
    }

    @Test fun `clock going backwards does not close a day`() {
        val s = fresh("2026-10-15T09:00")
        val back = run(s, "2026-10-14T23:00")
        assertEquals("2026-10-15", back.day)
        assertFalse(back.penalty.active)
        assertTrue(back.rewards.none { it is Reward.DayReport })
    }

    @Test fun `step readings complete step missions`() {
        var s = fresh()
        val steps = buildQuest(content.questDefById.getValue("pool_steps"), 1, QuestOrigin.DAILY)
        s = s.copy(quests = s.quests + steps)
        s = run(s, "2026-10-14T12:00") { applyAuto(AutoReading("2026-10-14", steps = 2500)) }
        assertEquals(2500.0, s.quests.first { it.id == steps.id }.progress, 0.0)
        s = run(s, "2026-10-14T18:00") { applyAuto(AutoReading("2026-10-14", steps = 6400)) }
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == steps.id }.status)
    }

    @Test fun `screen time over the limit breaks the mission and yesterday's final reading is used`() {
        var s = fresh()
        val limit = buildQuest(content.questDefById.getValue("pool_screen_limit"), 1, QuestOrigin.DAILY)
        s = s.copy(quests = s.quests + limit)
        s = run(s, "2026-10-14T12:00") { applyAuto(AutoReading("2026-10-14", screenMinutes = 120.0)) }
        assertEquals(QuestStatus.OPEN, s.quests.first { it.id == limit.id }.status)
        // Final values for the 14th arrive after midnight, before the day closes.
        s = Engine.run(s, ctx("2026-10-15T00:01"), before = { applyAuto(AutoReading("2026-10-14", screenMinutes = 300.0)) })
        assertEquals("2026-10-15", s.day)
        val report = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertTrue(report.done < report.total)
    }

    @Test fun `distraction missions need chosen apps`() {
        val none = fresh()
        assertTrue(none.availableDefs(content).none { it.auto == AutoKind.DISTRACTION_TIME })
        val withApps = none.copy(settings = none.settings.copy(blockedApps = listOf("x")))
        assertTrue(withApps.availableDefs(content).any { it.auto == AutoKind.DISTRACTION_TIME })
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
        s = run(s, "2026-10-14T10:00") { startFocus(FocusSession(0, 60, questId = fq.id)) }
        assertNotNull(s.focus)
        s = run(s, "2026-10-14T11:01")
        assertNull(s.focus)
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == fq.id }.status)
        assertEquals(1L, s.count(StatKey.FOCUS_SESSIONS))
    }

    @Test fun `focus minutes go only to the session's mission`() {
        var s = fresh()
        val a = buildQuest(content.questDefById.getValue("pool_journal"), 1, QuestOrigin.EXTRA, "fa")
        val b = buildQuest(content.questDefById.getValue("pool_meditate"), 1, QuestOrigin.EXTRA, "fb")
        s = s.copy(quests = s.quests + a + b)
        s = run(s, "2026-10-14T10:00") { startFocus(FocusSession(0, 5, questId = a.id)) }
        s = run(s, "2026-10-14T10:06")
        assertEquals(5.0, s.quests.first { it.id == a.id }.progress, 0.001)
        assertEquals(0.0, s.quests.first { it.id == b.id }.progress, 0.001)
        s = run(s, "2026-10-14T11:00") { startFocus(FocusSession(0, 10)) }
        s = run(s, "2026-10-14T11:11")
        assertEquals(5.0, s.quests.first { it.id == a.id }.progress, 0.001)
        assertEquals(15L, s.count(StatKey.FOCUS_MINUTES))
        assertTrue(content.questDefById.getValue("pool_pomodoro_basic").pomodoro)
    }

    @Test fun `focus in the wrong mode does not fill the mission`() {
        var s = fresh()
        val timer = buildQuest(content.questDefById.getValue("pool_journal"), 1, QuestOrigin.EXTRA, "ft")
        s = s.copy(quests = s.quests + timer)
        s = run(s, "2026-10-14T10:00") { startFocus(FocusSession(0, 0, PomodoroPlan(10, 5, 1), questId = timer.id)) }
        s = run(s, "2026-10-14T10:16")
        assertEquals(0.0, s.quests.first { it.id == timer.id }.progress, 0.001)
        assertEquals(10L, s.count(StatKey.FOCUS_MINUTES))
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

    @Test fun `undoing a mission heals the boss`() {
        var s = fresh()
        val maxHp = s.boss!!.maxHp
        val q = s.dailyQuests.first { it.type == QuestType.TRAINING }
        s = run(s, "2026-10-14T10:00") { completeQuest(q.id) }
        assertTrue(s.boss!!.hp < maxHp)
        assertEquals(maxHp - s.boss!!.hp, s.quests.first { it.id == q.id }.bossDamage)
        s = run(s, "2026-10-14T10:01") { undoQuest(q.id) }
        assertEquals(maxHp, s.boss!!.hp)
    }

    @Test fun `undoing the killing blow revives the boss without duplicating loot`() {
        var s = fresh()
        s = s.copy(boss = s.boss!!.copy(hp = 1))
        val q = s.dailyQuests.first { it.type == QuestType.TRAINING }
        s = run(s, "2026-10-14T10:00") { completeQuest(q.id) }
        assertTrue(s.boss!!.defeated)
        val gold = s.player.gold
        val chests = s.items("bau_cacador")
        s = run(s, "2026-10-14T10:01") { undoQuest(q.id) }
        assertFalse(s.boss!!.defeated)
        assertEquals(1, s.boss!!.hp)
        assertEquals(0L, s.count(StatKey.BOSSES_DEFEATED))
        assertTrue(s.player.gold < gold)
        s = run(s, "2026-10-14T10:02") { completeQuest(q.id) }
        assertTrue(s.boss!!.defeated)
        assertEquals(chests, s.items("bau_cacador"))
        assertEquals(1, s.rewards.count { it is Reward.ShadowGained && it.source == SourceType.BOSS })
    }

    private fun withRunQuest(s: GameState): Pair<GameState, Quest> {
        val q = buildQuest(content.questDefById.getValue("pool_run"), 1, QuestOrigin.EXTRA, "run_test")
        return s.copy(quests = s.quests + q) to q
    }

    @Test fun `step-counted run credits distance by cadence and completes`() {
        var (s, q) = withRunQuest(fresh())
        s = run(s, "2026-10-14T10:00") { startRun(q.id, 1_000) }
        s = run(s, "2026-10-14T10:10") { runCheckpoint(1_500) } // 50 spm: walking stride
        assertEquals(500 * Stride.walkM(170) / 1000, s.run!!.km, 1e-9)
        s = run(s, "2026-10-14T10:30") { runCheckpoint(4_700) } // 160 spm: running stride
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == q.id }.status)
        assertNull(s.run)
    }

    @Test fun `paused time does not count`() {
        var (s, q) = withRunQuest(fresh())
        s = run(s, "2026-10-14T10:00") { startRun(q.id, 0) }
        s = run(s, "2026-10-14T10:05") { pauseRun(800) }
        s = run(s, "2026-10-14T10:30") { resumeRun(5_000) }
        s = run(s, "2026-10-14T10:35") { pauseRun(5_800) }
        assertEquals(1_600L, s.run!!.steps)
        assertEquals(10 * 60_000L, s.run!!.elapsed(at("2026-10-14T11:00")))
        s = run(s, "2026-10-14T10:36") { finishRun(5_800); logDistance(q.id, 0.5) }
        assertNull(s.run)
        assertEquals(1_600 * Stride.runM(170) / 1000 + 0.5, s.quests.first { it.id == q.id }.progress, 1e-9)
    }

    @Test fun `walk distance missions follow daily steps and keep logged distance`() {
        var s = fresh()
        val q = buildQuest(content.questDefById.getValue("pool_walking"), 1, QuestOrigin.EXTRA, "walk_test")
        s = s.copy(quests = s.quests + q)
        s = run(s, "2026-10-14T10:00") { logDistance(q.id, 2.0); applyAuto(AutoReading("2026-10-14", steps = 1_000)) }
        assertEquals(2.0, s.quests.first { it.id == q.id }.progress, 1e-9)
        s = run(s, "2026-10-14T18:00") { applyAuto(AutoReading("2026-10-14", steps = 20_000)) }
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == q.id }.status)
    }

    @Test fun `gold earned includes achievement gold and old saves are corrected once`() {
        var s = run(fresh(), "2026-10-14T10:00") { openPortal() }
        val portal = s.portal!!.quest
        s = run(s, "2026-10-14T10:10") { completeQuest(portal.id) } // first portal unlocks an achievement
        assertTrue(s.achievements.isNotEmpty())
        assertEquals(s.player.gold.toLong(), s.count(StatKey.GOLD_EARNED))
        val old = s.copy(version = 1, counters = s.counters + (StatKey.GOLD_EARNED to portal.gold.toLong()))
        val fixed = run(run(old, "2026-10-14T10:01"), "2026-10-14T10:02")
        assertEquals(s.player.gold.toLong(), fixed.count(StatKey.GOLD_EARNED))
    }

    @Test fun `state survives json round trip`() {
        var s = run(fresh(), "2026-10-14T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-15T08:00")
        val text = Content.json.encodeToString(s)
        val back = Content.json.decodeFromString<GameState>(text)
        assertEquals(s, back)
    }
}
