package com.lifup.app.domain

import com.lifup.app.system.blockPlan
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
import kotlin.math.roundToInt

class EngineTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    private fun at(text: String) = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()
    private fun ctx(time: String, seed: Int = 1) = Ctx(content, at(time), zone, Random(seed))
    private fun run(state: GameState, time: String, seed: Int = 1, action: Tx.() -> Unit = {}) =
        Engine.run(state, ctx(time, seed), action)

    private fun fresh(time: String = "2026-10-14T09:00") = run(GameState(onboarded = true), time)

    @Test fun `level 1 day has 1 core and 3 pool missions`() {
        val s = fresh()
        assertEquals(4, s.dailyQuests.size)
        assertEquals(1, s.dailyQuests.count { content.questDefById[it.defId]?.kind == DefKind.CORE })
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
        s = run(s, "2026-10-14T22:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        // The echo waits for midnight: avoid missions could still break.
        assertTrue(s.shadows.isEmpty())
        s = run(s, "2026-10-15T08:00")
        assertEquals(1, s.shadows.count { it.origin == EchoOrigin.PERFECT_DAY })
        assertTrue(s.rewards.any { it is Reward.ShadowGained })
        assertEquals(1, s.player.streak)
        val report = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertTrue(report.perfect)
        assertNull(report.penalty)
        assertEquals("2026-10-15", s.day)
    }

    @Test fun `failed day applies penalty and resets streak`() {
        var s = dayWith(0).let { it.copy(player = it.player.copy(xp = 90)) }
        s = run(s, "2026-10-15T08:00")
        assertTrue(s.penalty.active)
        assertTrue(s.penalty.quests.isNotEmpty())
        assertEquals(0, s.player.streak)
        assertEquals(0, s.player.xp)
        assertEquals(500 - 120, s.player.gold)
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

    @Test fun `penalty and its block last 24 hours`() {
        var s = fresh().let { it.copy(settings = it.settings.copy(blockOnPenalty = true)) }
        s = run(s, "2026-10-15T08:00")
        assertEquals(at("2026-10-15T08:00"), s.penalty.blockStart)
        assertEquals(at("2026-10-16T08:00"), s.penalty.blockEnd)
        assertTrue(s.penaltyBlockActive(at("2026-10-15T23:00")))
        s = run(s, "2026-10-15T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-16T07:59")
        assertTrue(s.penaltyBlockActive(at("2026-10-16T07:59")))
        s = run(s, "2026-10-16T08:00")
        assertFalse(s.penalty.active)
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
        s = run(s, "2026-10-14T22:00") { s.dailyQuests.forEach { completeQuest(it.id) } ; addExtraQuest() }
        assertEquals(1, s.extraQuests.size)
    }

    @Test fun `extras come one at a time and skip missions too late for the hour`() {
        var s = run(fresh(), "2026-10-14T23:00") { s.dailyQuests.forEach { completeQuest(it.id) } ; addExtraQuest() ; addExtraQuest() }
        assertEquals(1, s.extraQuests.size)
        assertFalse(s.canAddExtra())
        assertTrue(content.questDefById.getValue(s.extraQuests.single().defId).offeredAt(23))
        s = run(s, "2026-10-14T23:01") { completeQuest(s.extraQuests.single().id) }
        assertTrue(s.canAddExtra())
        assertFalse(content.questDefById.getValue("pool_bed").offeredAt(23))
        assertTrue(content.questDefById.getValue("pool_bed").offeredAt(8))
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
        val walk = QuestDef("walk_def", DefKind.POOL, QuestType.GPS, plainText("walk"), plainText(""), 5.0, unit = "km", baseXp = 70, baseGold = 20, auto = AutoKind.WALK_DISTANCE)
        val q = buildQuest(walk, 1, QuestOrigin.EXTRA, "walk_test")
        s = s.copy(quests = s.quests + q)
        s = run(s, "2026-10-14T10:00") { logDistance(q.id, 2.0); applyAuto(AutoReading("2026-10-14", steps = 1_000)) }
        assertEquals(2.0, s.quests.first { it.id == q.id }.progress, 1e-9)
        s = run(s, "2026-10-14T18:00") { applyAuto(AutoReading("2026-10-14", steps = 20_000)) }
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == q.id }.status)
    }

    @Test fun `gold earned includes achievement gold and old saves are corrected once`() {
        var s = run(fresh(), "2026-10-14T10:00") { openPortal() }
        val portal = s.portal!!.quest
        // Creating a first mission in the Forge unlocks an achievement that pays gold.
        s = run(s, "2026-10-14T10:10") { completeQuest(portal.id); saveCustomDef(QuestDef("custom_x", DefKind.CORE, QuestType.TRAINING, plainText("x"), plainText(""), 1.0, baseXp = 10, baseGold = 5)) }
        assertTrue(s.achievements.isNotEmpty())
        assertEquals(s.player.gold.toLong(), s.count(StatKey.GOLD_EARNED))
        val old = s.copy(version = 1, counters = s.counters + (StatKey.GOLD_EARNED to portal.gold.toLong()))
        val fixed = run(run(old, "2026-10-14T10:01"), "2026-10-14T10:02")
        assertEquals(s.player.gold.toLong(), fixed.count(StatKey.GOLD_EARNED))
    }

    @Test fun `extra missions can be undone`() {
        var s = fresh()
        s = run(s, "2026-10-14T22:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-14T22:01") { addExtraQuest() }
        val extra = s.extraQuests.single()
        s = run(s, "2026-10-14T22:02") { completeQuest(extra.id) }
        val gold = s.player.gold
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == extra.id }.status)
        s = run(s, "2026-10-14T22:03") { undoQuest(extra.id) }
        assertEquals(QuestStatus.OPEN, s.quests.first { it.id == extra.id }.status)
        assertTrue(s.player.gold < gold)
    }

    @Test fun `undoing an automatic mission stops it from completing itself again`() {
        var s = fresh()
        val q = buildQuest(content.questDefById.getValue("pool_steps"), 1, QuestOrigin.EXTRA, "steps_x")
        s = s.copy(quests = s.quests + q)
        s = run(s, "2026-10-14T12:00") { applyAuto(AutoReading("2026-10-14", steps = 50_000)) }
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == q.id }.status)
        s = run(s, "2026-10-14T12:01") { undoQuest(q.id) }
        s = run(s, "2026-10-14T12:15") { applyAuto(AutoReading("2026-10-14", steps = 51_000)) }
        val after = s.quests.first { it.id == q.id }
        assertEquals(QuestStatus.OPEN, after.status)
        assertTrue(after.autoOff)
    }

    @Test fun `side quests can be unticked and deleting a finished one takes its rewards back`() {
        var s = fresh()
        val start = s.player
        val hp = s.boss!!.hp
        s = run(s, "2026-10-14T10:00") { addSideQuest("Lavar a loiça") }
        val id = s.sideQuests.single().id
        s = run(s, "2026-10-14T10:01") { completeSideQuest(id) }
        assertTrue(s.player.xp > start.xp || s.player.level > start.level)
        s = run(s, "2026-10-14T10:02") { undoSideQuest(id) }
        assertFalse(s.sideQuests.single().done)
        assertEquals(start.xp, s.player.xp)
        assertEquals(start.gold, s.player.gold)
        assertEquals(hp, s.boss!!.hp)
        s = run(s, "2026-10-14T10:03") { completeSideQuest(id) }
        s = run(s, "2026-10-14T10:04") { removeSideQuest(id) }
        assertTrue(s.sideQuests.isEmpty())
        assertEquals(start.xp, s.player.xp)
        assertEquals(start.gold, s.player.gold)
        assertEquals(0L, s.count(StatKey.SIDE_COMPLETED))
        assertEquals(s.player.gold.toLong(), s.count(StatKey.GOLD_EARNED))
    }

    @Test fun `only five side quests a day pay rewards`() {
        var s = fresh()
        s = run(s, "2026-10-14T10:00") { repeat(7) { addSideQuest("t$it") } }
        val ids = s.sideQuests.map { it.id }
        s = run(s, "2026-10-14T10:01") { ids.forEach { completeSideQuest(it) } }
        assertEquals(5, s.sideQuests.count { it.xpGained > 0 })
        assertTrue(s.sideQuests.all { it.done })
        assertEquals(0, s.sideRewardsLeft())
        val unpaid = s.sideQuests.first { it.xpGained == 0 }.id
        val gold = s.player.gold
        s = run(s, "2026-10-14T10:02") { undoSideQuest(unpaid) }
        assertEquals(gold, s.player.gold)
        s = run(s, "2026-10-14T10:03") { undoSideQuest(ids.first()) }
        assertEquals(1, s.sideRewardsLeft())
    }

    @Test fun `bedtime mission only confirms before midnight`() {
        var s = run(fresh(), "2026-10-14T10:00") { addDefToToday("pool_sleep") }
        val q = s.quests.last { it.defId == "pool_sleep" }
        s = run(s, "2026-10-14T20:00") { completeQuest(q.id) }
        assertEquals(QuestStatus.OPEN, s.quests.first { it.id == q.id }.status)
        assertFalse(s.quests.first { it.id == q.id }.isSuccessful())
        s = run(s, "2026-10-14T23:30") { completeQuest(q.id) }
        assertEquals(QuestStatus.DONE, s.quests.first { it.id == q.id }.status)
    }

    @Test fun `turning blocking on during a penalty blocks right away`() {
        var s = run(fresh(), "2026-10-15T08:00")
        assertTrue(s.penalty.active)
        assertFalse(s.penaltyBlockActive(at("2026-10-15T09:30")))
        s = run(s, "2026-10-15T09:00") { setBlockOnPenalty(true) }
        assertTrue(s.penaltyBlockActive(at("2026-10-15T09:30")))
    }

    @Test fun `portals always last longer than their mission takes`() {
        repeat(40) { seed ->
            val s = run(fresh(), "2026-10-14T10:00", seed) { openPortal() }
            val p = s.portal!!
            val needed = p.quest.estimatedMinutes(s.settings, content)
            assertTrue(needed <= Rules.PORTAL_MAX_TASK_MIN)
            assertNull(p.quest.auto)
            assertEquals(DefKind.PORTAL, content.questDefById[p.quest.defId]?.kind)
            assertTrue((p.expiresAt - p.opensAt) / 60_000.0 >= needed * 1.5)
        }
    }

    @Test fun `penalty lasts one day and its leftovers expire without a new penalty`() {
        var s = run(fresh(), "2026-10-15T08:00")
        assertTrue(s.penalty.active)
        s = run(s, "2026-10-15T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-16T08:00")
        val report = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertTrue(report.perfect)
        assertNull(report.penalty)
        assertFalse(s.penalty.active)
    }

    /** A level-1 day with exactly [done] of 4 plain missions completed. */
    private fun dayWith(done: Int, streak: Int = 5): GameState {
        val defs = listOf("core_pushups", "core_squats", "core_reading", "core_water")
        var s = fresh().let { st -> st.copy(quests = defs.map { buildQuest(content.questDefById[it]!!, 1, QuestOrigin.DAILY) }, player = st.player.copy(streak = streak, xp = 150, gold = 500)) }
        s = run(s, "2026-10-14T12:00") { s.dailyQuests.take(done).forEach { completeQuest(it.id) } }
        return s
    }

    @Test fun `three of four keeps the streak on normal`() {
        val s = run(dayWith(3), "2026-10-15T08:00")
        val report = s.rewards.filterIsInstance<Reward.DayReport>().last()
        assertTrue(report.passed)
        assertFalse(report.perfect)
        assertNull(report.penalty)
        assertEquals(6, s.player.streak)
    }

    @Test fun `half done is a light penalty without missions`() {
        val s = run(dayWith(2), "2026-10-15T08:00")
        val pen = s.rewards.filterIsInstance<Reward.DayReport>().last().penalty!!
        assertEquals(60, pen.xpLost)
        assertEquals(0, pen.quests)
        assertFalse(s.penalty.active)
        assertEquals(0, s.player.streak)
        assertEquals(StreakRecovery(5, "2026-10-15"), s.recovery)
    }

    @Test fun `a bad day brings penalty missions`() {
        val s = run(dayWith(1), "2026-10-15T08:00")
        assertTrue(s.penalty.active)
        assertEquals(90, s.rewards.filterIsInstance<Reward.DayReport>().last().penalty!!.xpLost)
    }

    @Test fun `a perfect day right after a fail recovers the streak once a week`() {
        var s = run(dayWith(1), "2026-10-15T08:00")
        s = run(s, "2026-10-15T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-16T08:00")
        assertEquals(6, s.player.streak)
        assertTrue(s.rewards.filterIsInstance<Reward.DayReport>().last().streakRestored)
        s = run(s, "2026-10-17T08:00")
        assertEquals(0, s.player.streak)
        assertNull(s.recovery)
    }

    @Test fun `rest days are limited per week and only before noon`() {
        var s = run(fresh(), "2026-10-14T13:00") { toggleRestDay() }
        assertFalse(s.daily.rest)
        s = run(s, "2026-10-14T10:00") { toggleRestDay() }
        assertTrue(s.daily.rest)
        s = run(s, "2026-10-15T08:00")
        s = run(s, "2026-10-15T09:00") { toggleRestDay() }
        assertFalse(s.daily.rest)
        s = run(s, "2026-10-20T08:00")
        s = run(s, "2026-10-20T09:00") { toggleRestDay() }
        assertTrue(s.daily.rest)
    }

    @Test fun `long breaks and break limits`() {
        val p = PomodoroPlan(25, 5, 4, longBreakMin = 15, longEvery = 2)
        assertEquals(125, Pomodoro.totalMinutes(p))
        assertEquals(50.0, Pomodoro.workMinutes(p, 60.0), 0.001)
        assertFalse(Pomodoro.phaseAt(p, 60.0).work)
        val greedy = Pomodoro.sane(PomodoroPlan(10, 120, 3, longBreakMin = 300))
        assertEquals(5, greedy.breakMin)
        assertEquals(10, greedy.longBreakMin)
    }

    @Test fun `open session counts until stopped`() {
        var s = fresh()
        val fq = buildQuest(content.questDefById.getValue("pool_deepwork"), 1, QuestOrigin.EXTRA, "fq")
        s = s.copy(quests = s.quests + fq)
        s = run(s, "2026-10-14T10:00") { startFocus(FocusSession(0, 0, questId = fq.id, strict = true, open = true)) }
        assertFalse(s.focus!!.strict)
        s = run(s, "2026-10-14T10:40") { stopFocus() }
        assertNull(s.focus)
        assertEquals(40.0, s.quests.first { it.id == fq.id }.progress.coerceAtMost(40.0), 0.001)
        assertEquals(40L, s.count(StatKey.FOCUS_MINUTES))
    }

    @Test fun `open pomodoro keeps cycling`() {
        val s = run(fresh(), "2026-10-14T10:00") { startFocus(FocusSession(0, 0, PomodoroPlan(25, 5, 1), open = true)) }
        assertTrue(s.focus!!.pomodoro!!.rounds > 10)
        assertTrue(s.focus!!.totalMinutes() <= Rules.OPEN_SESSION_MAX_MIN)
    }

    @Test fun `apps are free during pomodoro breaks`() {
        val base = fresh().let { it.copy(settings = it.settings.copy(blockedApps = listOf("x"))) }
        val s = run(base, "2026-10-14T10:00") { startFocus(FocusSession(0, 0, PomodoroPlan(25, 5, 2), blockApps = true)) }
        assertNotNull(s.blockPlan(at("2026-10-14T10:10")))
        assertNull(s.blockPlan(at("2026-10-14T10:27")))
        assertEquals(at("2026-10-14T10:55"), s.blockPlan(at("2026-10-14T10:31"))!!.until)
    }

    @Test fun `targets grow with the mission's own record, not the level`() {
        var s = fresh().let { it.copy(player = it.player.copy(level = 60)) }
        val def = content.questDefById.getValue("core_pushups")
        assertEquals(def.baseTarget, buildQuest(def, 60, QuestOrigin.DAILY).target, 0.0)
        // Three kept days (its cadence) raise the target one step.
        repeat(3) { d ->
            val day = java.time.LocalDate.parse("2026-10-14").plusDays(d.toLong())
            s = run(s, "${day}T08:00")
            s = run(s, "${day}T12:00") { s.dailyQuests.filter { it.defId == def.id }.forEach { completeQuest(it.id) } }
        }
        s = run(s, "2026-10-17T08:00")
        assertEquals(1, s.adapt[def.id]!!.level)
        val q = s.dailyQuests.first { it.defId == def.id }
        assertEquals(def.baseTarget + def.scalingAmount, q.target, 0.0)
        assertEquals(3, s.keepsToNextStep(def))
        // Three misses bring it back down.
        listOf("2026-10-18", "2026-10-19", "2026-10-20").forEach { s = run(s, "${it}T08:00") }
        assertEquals(0, s.adapt[def.id]?.level ?: 0)
        assertEquals(3, s.missionStats[def.id]!!.done)
    }

    @Test fun `a miss means more keeps before the next step`() {
        val def = content.questDefById.getValue("core_pushups")
        val afterMiss = Adapt().next(false, def)
        assertEquals(4, fresh().copy(adapt = mapOf(def.id to afterMiss)).keepsToNextStep(def))
        val climbed = (1..4).fold(afterMiss) { a, _ -> a.next(true, def) }
        assertEquals(1, climbed.level)
    }

    @Test fun `limits get stricter when kept and targets stop at their cap`() {
        val limit = content.questDefById.getValue("pool_screen_limit")
        assertTrue(limit.targetAt(1) < limit.baseTarget)
        assertEquals(limit.maxTarget!!, limit.targetAt(100), 0.0)
        val pushups = content.questDefById.getValue("core_pushups")
        assertEquals(pushups.peakTarget!!, pushups.targetAt(1000), 0.0)
        assertEquals(pushups.baseTarget / 2, pushups.targetAt(-100), 0.0)
        // Past the comfortable top (40) the pace halves; at the peak it stops.
        assertEquals(pushups.scalingInterval, fresh().copy(adapt = mapOf(pushups.id to Adapt(24))).keepsToNextStep(pushups))
        assertEquals(pushups.scalingInterval * 2, fresh().copy(adapt = mapOf(pushups.id to Adapt(25))).keepsToNextStep(pushups))
        assertNull(fresh().copy(adapt = mapOf(pushups.id to Adapt(85))).keepsToNextStep(pushups))
    }

    @Test fun `every echo has a power kind and the amplifier counts as all`() {
        assertTrue(PowerKind.entries.all { k -> Passive.ALL_BOOST.isKind(k) })
        assertFalse(Passive.GOLD_BOOST.isKind(PowerKind.COMBAT))
        assertTrue(PowerKind.entries.all { k -> content.shadows.any { it.passive.kind() == k } })
    }

    @Test fun `a grown target can be held or eased once per climb, a new one can't`() {
        val def = content.questDefById.getValue("core_pushups")
        assertFalse(fresh().canTuneTarget(def))
        var s = fresh().copy(adapt = mapOf(def.id to Adapt(5)))
        s = run(s, "2026-10-14T10:00") { holdTarget(def.id, true) }
        assertNull(s.keepsToNextStep(def))
        assertEquals(5, s.adapt.getValue(def.id).next(true, def).level)
        s = run(s, "2026-10-14T10:01") { easeTarget(def.id) ; easeTarget(def.id) }
        assertEquals(4, s.stepOf(def.id))
        assertFalse(s.canEaseTarget(def))
        // Climbing again re-opens "too hard".
        s = run(s, "2026-10-14T10:02") { holdTarget(def.id, false) }
        val climbed = (1..def.scalingInterval).fold(s.adapt.getValue(def.id)) { a, _ -> a.next(true, def) }
        assertEquals(5, climbed.level)
        assertTrue(s.copy(adapt = mapOf(def.id to climbed)).canEaseTarget(def))
    }

    @Test fun `old saves keep the targets they had`() {
        val old = fresh().let { it.copy(version = 6, player = it.player.copy(level = 30), adapt = mapOf("pool_plank" to Adapt(1))) }
        val s = run(old, "2026-10-14T10:00")
        // Pushups were 15 + 2 every 5 levels: 25 at level 30, now 10 steps of 1.
        assertEquals(10, s.stepOf("core_pushups"))
        // Plank: 60 + 5×5 = 85, +10% = 93.5 → the nearest 10 s step is 90.
        assertEquals(90.0, content.questDefById.getValue("pool_plank").targetAt(s.stepOf("pool_plank")), 0.0)
        assertEquals(7, s.version)
    }

    @Test fun `a new week sums up the last one`() {
        var s = fresh("2026-10-12T09:00")
        repeat(7) { d ->
            val day = java.time.LocalDate.parse("2026-10-12").plusDays(d.toLong())
            s = run(s, "${day}T08:00")
            s = run(s, "${day}T12:00") { if (d % 2 == 0) s.dailyQuests.forEach { completeQuest(it.id) } }
        }
        s = run(s, "2026-10-19T08:00")
        val report = s.rewards.filterIsInstance<Reward.WeekReport>().single()
        assertEquals("2026-10-12", report.weekStart)
        assertEquals(7, report.days)
        assertEquals(4, report.daysKept)
        assertEquals("2026-10-19", s.statsWeek)
        assertEquals(4, s.lastWeekKept)
        assertTrue(s.weekStats.isEmpty() || s.weekStats.values.all { it.total <= 1 })
    }

    @Test fun `each player gets their own boss draw`() {
        val bosses = (1..12).map { seed -> run(GameState(onboarded = true, seed = seed.toLong()), "2026-10-14T09:00").boss!!.bossId }
        assertTrue(bosses.toSet().size >= 4)
    }

    @Test fun `astral drake can show up from level 20`() {
        val seen = (1..40).map { seed ->
            val s = GameState(onboarded = true, seed = seed.toLong()).let { it.copy(player = it.player.copy(level = 22)) }
            run(s, "2026-09-14T09:00").boss!!.bossId
        }
        assertTrue("boss_astral_drake" in seen)
    }

    @Test fun `seasonal boss comes once per season`() {
        var s = run(GameState(onboarded = true, seed = 3), "2026-10-26T09:00")
        assertEquals("season_halloween", s.boss!!.bossId)
        s = run(s, "2026-11-02T09:00")
        assertTrue(s.boss!!.bossId != "season_halloween")
    }

    @Test fun `finishing a no-quitting session pays a bonus`() {
        val fq = buildQuest(content.questDefById.getValue("pool_deepwork"), 1, QuestOrigin.EXTRA, "fq")
        fun session(strict: Boolean): GameState {
            var s = fresh().let { it.copy(quests = it.quests + fq) }
            s = run(s, "2026-10-14T10:00") { startFocus(FocusSession(0, 20, strict = strict, questId = fq.id)) }
            return run(s, "2026-10-14T10:21")
        }
        val plain = session(false)
        val bet = session(true)
        assertEquals(20.0, plain.quests.first { it.id == fq.id }.progress, 0.01)
        assertEquals(25.0, bet.quests.first { it.id == fq.id }.progress, 0.01)
        // +4 gold for 20 min (the "no quitting" achievement may add more on top).
        assertTrue(bet.player.gold >= plain.player.gold + 4)
    }

    @Test fun `new echoes and items stay flagged until seen`() {
        var s = run(fresh(), "2026-10-14T10:00") { gainShadow("auto_pawn", SourceType.SHOP, EchoOrigin.SHOP); addItem("pergaminho_troca") }
        assertEquals(true, s.newEchoes["auto_pawn"])
        assertTrue("pergaminho_troca" in s.newItems)
        s = run(s, "2026-10-14T10:01") { gainShadow("auto_pawn", SourceType.SHOP, EchoOrigin.SHOP) }
        assertEquals(true, s.newEchoes["auto_pawn"])
        s = run(s, "2026-10-14T10:02") { markEchoesSeen(); markItemsSeen() }
        assertTrue(s.newEchoes.isEmpty() && s.newItems.isEmpty())
        s = run(s, "2026-10-14T10:03") { gainShadow("auto_pawn", SourceType.SHOP, EchoOrigin.SHOP) }
        assertEquals(false, s.newEchoes["auto_pawn"])
    }

    @Test fun `state survives json round trip`() {
        var s = run(fresh(), "2026-10-14T12:00") { s.dailyQuests.forEach { completeQuest(it.id) } }
        s = run(s, "2026-10-15T08:00")
        val text = Content.json.encodeToString(s)
        val back = Content.json.decodeFromString<GameState>(text)
        assertEquals(s, back)
    }

    @Test fun `an echo remembers how and when it first joined`() {
        var s = run(fresh(), "2026-10-14T10:00") { gainShadow("auto_pawn", SourceType.SHOP, EchoOrigin.SHOP) }
        s = run(s, "2026-10-15T10:00") { gainShadow("auto_pawn", SourceType.EXTRACTION, EchoOrigin.PORTAL) }
        val pawn = s.owned("auto_pawn")!!
        assertEquals(EchoOrigin.SHOP, pawn.origin)
        assertEquals("2026-10-14", pawn.obtainedOn)
        assertEquals(1, pawn.copies)
    }

    @Test fun `a full squad swaps one member for the new echo`() {
        val ids = content.shadows.take(4).map { it.id }
        var s = run(fresh(), "2026-10-14T10:00") { ids.forEach { gainShadow(it, SourceType.SHOP, EchoOrigin.SHOP) }; ids.take(3).forEach { toggleSquad(it) } }
        s = run(s, "2026-10-14T10:01") { toggleSquad(ids[3]) }
        assertEquals(ids.take(3), s.squad) // full: equipping alone does nothing
        s = run(s, "2026-10-14T10:02") { swapSquad(ids[1], ids[3]) }
        assertEquals(listOf(ids[0], ids[3], ids[2]), s.squad)
    }

    @Test fun `steps add up across days into the lifetime total`() {
        var s = run(fresh(), "2026-10-14T18:00") { applyAuto(AutoReading("2026-10-14", steps = 4_000)); applyAuto(AutoReading("2026-10-14", steps = 7_500)) }
        assertEquals(7_500L, s.statValue(StatKey.STEPS))
        s = run(run(s, "2026-10-15T09:00"), "2026-10-15T09:01") { applyAuto(AutoReading("2026-10-15", steps = 1_000)) }
        assertEquals(7_500L, s.count(StatKey.STEPS))
        assertEquals(8_500L, s.statValue(StatKey.STEPS))
    }

    @Test fun `achievements need a few repeats before the first tier`() {
        val s = run(fresh(), "2026-10-14T10:00") { openPortal() }.let { st -> run(st, "2026-10-14T10:10") { completeQuest(st.portal!!.quest.id) } }
        assertEquals(null, s.achievements["portals"])
        assertTrue(s.rewards.none { it is Reward.Toast && it.kind == ToastKind.ACHIEVEMENT })
    }

    /** XP earned since level 1, so level-ups don't hide gains. */
    private fun GameState.totalXp() = (1 until player.level).sumOf { Rules.xpForLevel(it) } + player.xp

    @Test fun `focus pays xp per minute and gold when won, up to the daily cap`() {
        // Level 4: tier ×1 and room for the XP below without a level-up; the first focus-hours
        // achievement already taken, so only focus pays gold here.
        val start = fresh().let { it.copy(player = it.player.copy(level = 4), achievements = mapOf("focus_hours" to 1)) }
        var s = run(start, "2026-10-14T10:00") { startFocus(FocusSession(0, 50)) }
        val xp0 = s.totalXp()
        s = run(s, "2026-10-14T10:50") { settleFocus() }
        assertEquals(50.0, s.daily.focusPaidMin, 1e-9)
        assertEquals(50, s.totalXp() - xp0)
        s = run(s, "2026-10-14T11:00") { startFocus(FocusSession(0, 100, strict = true)) }
        val gold = s.player.gold
        val xp1 = s.totalXp()
        s = run(s, "2026-10-14T12:40") { settleFocus() }
        // Only 70 of the 100 minutes were left in today's allowance; won: +25% XP and gold.
        assertEquals(Rules.FOCUS_PAID_MAX_MIN, s.daily.focusPaidMin, 1e-9)
        assertEquals(88, s.totalXp() - xp1)
        assertEquals(14, s.player.gold - gold)
        s = run(s, "2026-10-14T13:00") { startFocus(FocusSession(0, 30)) }
        val xp2 = s.totalXp()
        s = run(s, "2026-10-14T13:30") { settleFocus() }
        assertEquals(xp2, s.totalXp())
        assertEquals(30, s.count(StatKey.FOCUS_MINUTES) - 50 - 125) // the stats keep counting
        // A new day starts a new allowance.
        s = run(s, "2026-10-15T10:00") { startFocus(FocusSession(0, 25)) }
        s = run(s, "2026-10-15T10:25") { settleFocus() }
        assertEquals(25.0, s.daily.focusPaidMin, 1e-9)
    }

    @Test fun `measured limits warn when a quarter or 20 minutes are left`() {
        val screen = buildQuest(content.questDefById.getValue("pool_screen_limit"), 1, QuestOrigin.EXTRA, "scr")
        assertEquals(4.0, screen.target, 0.0)
        fun near(progress: Double) = GameState(quests = listOf(screen.copy(progress = progress))).limitsNearing()
        assertTrue(near(2.9).isEmpty())
        assertEquals(60, near(3.0).single().second)
        assertEquals(6, near(3.9).single().second)
        assertTrue(near(4.1).isEmpty()) // already broken
        val short = screen.copy(target = 1.0)
        assertEquals(19, GameState(quests = listOf(short.copy(progress = 41 / 60.0))).limitsNearing().single().second)
        assertTrue(GameState(quests = listOf(short.copy(progress = 0.5))).limitsNearing().isEmpty())
        assertTrue(GameState(quests = listOf(screen.copy(progress = 3.5, autoOff = true))).limitsNearing().isEmpty())
    }

    @Test fun `levels go to 1000 with steady growth and stop there`() {
        assertEquals(10_000, Rules.xpForLevel(100))
        assertEquals(10_050, Rules.xpForLevel(101))
        assertEquals(Rules.xpForLevel(Rules.MAX_LEVEL), Rules.xpForLevel(Rules.MAX_LEVEL + 5))
        assertEquals(5.0, Rules.xpMultiplier(90), 0.0)
        assertEquals(9.0, Rules.xpMultiplier(190), 0.0)
        val top = fresh().let { it.copy(player = it.player.copy(level = Rules.MAX_LEVEL - 1, xp = Rules.xpForLevel(Rules.MAX_LEVEL - 1) - 1)) }
        val s = run(top, "2026-10-14T10:00") { gainXp(10_000_000, hitsBoss = false, boosted = false) }
        assertEquals(Rules.MAX_LEVEL, s.player.level)
        assertEquals(Rules.xpForLevel(Rules.MAX_LEVEL), s.player.xp)
    }

    @Test fun `past the top tier mission xp keeps growing but gold does not`() {
        val def = content.questDefById.getValue("core_squats")
        val q90 = buildQuest(def, 90, QuestOrigin.DAILY)
        val q290 = buildQuest(def, 290, QuestOrigin.DAILY)
        assertEquals(q90.gold, q290.gold)
        assertEquals((def.baseXp * 13.0).roundToInt(), q290.xp)
    }

    @Test fun `milestone levels bring echoes, reserved ones first`() {
        fun reach(level: Int): GameState {
            val start = fresh().let { it.copy(player = it.player.copy(level = level - 1, xp = Rules.xpForLevel(level - 1) - 1)) }
            return run(start, "2026-10-14T10:00") { gainXp(1, hitsBoss = false, boosted = false) }
        }
        val at100 = reach(100)
        assertEquals(EchoOrigin.LEVEL, at100.owned("lvl_centurion")?.origin)
        val at150 = reach(150)
        val echo = at150.shadows.single { it.origin == EchoOrigin.LEVEL }
        assertEquals(ShadowRank.KNIGHT, content.shadowById.getValue(echo.id).rank)
        assertTrue(reach(155).shadows.none { it.origin == EchoOrigin.LEVEL })
        assertEquals(ShadowRank.MARSHAL, content.shadowById.getValue(reach(650).shadows.single { it.origin == EchoOrigin.LEVEL }.id).rank)
    }

    @Test fun `screen limits aren't drawn when the phone can't measure them`() {
        val s = fresh()
        assertTrue(s.availableDefs(content).any { it.id == "pool_screen_limit" })
        val blind = run(s, "2026-10-14T10:00") { setScreenMeasurable(false) }
        assertTrue(blind.availableDefs(content).none { it.auto == AutoKind.SCREEN_TIME || it.auto == AutoKind.DISTRACTION_TIME })
    }

    @Test fun `the squad's share of xp and gold is counted and undone with the mission`() {
        var s = fresh().let { it.copy(shadows = it.shadows + OwnedShadow("astral_eclipse"), squad = listOf("astral_eclipse")) }
        val q = s.dailyQuests.first { it.type != QuestType.FORBIDDEN && it.type != QuestType.LIMIT && it.fromHour == null }
        s = run(s, "2026-10-14T10:00") { completeQuest(q.id) }
        val done = s.quests.first { it.id == q.id }
        assertTrue(done.squad.xp > 0)
        assertEquals(done.xpGained - q.xp, done.squad.xp)
        assertEquals(done.squad, s.squadWeek)
        s = run(s, "2026-10-14T10:05") { undoQuest(q.id) }
        assertEquals(SquadGain(), s.squadWeek)
        assertEquals(SquadGain(), s.squadTotal)
    }

    @Test fun `each mission keeps its recent days for the habit history`() {
        var s = fresh()
        val ids = s.dailyQuests.filter { it.type != QuestType.FORBIDDEN && it.type != QuestType.LIMIT }.map { it.defId }
        s = run(s, "2026-10-15T09:00")
        val day = java.time.LocalDate.of(2026, 10, 14)
        ids.forEach { assertEquals(false, s.habitOn(it, day)) }
        assertEquals(MissionStat(0, 1), s.habitWindow(ids.first(), day, 30))
        assertNull(s.habitOn(ids.first(), day.minusDays(1)))
    }

    @Test fun `only owned echoes can be favourites, and starring again removes them`() {
        var s = fresh().let { it.copy(shadows = it.shadows + OwnedShadow("astral_eclipse")) }
        s = run(s, "2026-10-14T10:00") { toggleFavoriteEcho("astral_eclipse"); toggleFavoriteEcho("lvl_thousandth") }
        assertEquals(setOf("astral_eclipse"), s.favoriteEchoes)
        s = run(s, "2026-10-14T10:01") { toggleFavoriteEcho("astral_eclipse") }
        assertTrue(s.favoriteEchoes.isEmpty())
    }

    @Test fun `a broken avoid mission at night means no perfect day echo`() {
        val avoid = buildQuest(content.questDefById.getValue("pool_nonews"), 1, QuestOrigin.DAILY, "avoid_test")
        var s = fresh().let { it.copy(quests = it.quests + avoid) }
        s = run(s, "2026-10-14T22:00") { s.dailyQuests.filter { it.id != avoid.id }.forEach { completeQuest(it.id) } }
        assertEquals(FlameKind.PERFECT, s.flame().kind)
        s = run(s, "2026-10-14T23:30") { toggleFailed(avoid.id) }
        assertEquals(FlameKind.SAFE, s.flame().kind)
        s = run(s, "2026-10-15T08:00")
        assertTrue(s.shadows.none { it.origin == EchoOrigin.PERFECT_DAY })
    }

    @Test fun `the flame shows how today stands`() {
        var s = fresh()
        assertEquals(Flame(FlameKind.PENDING, 0), s.flame())
        // Complete missions one by one until the day counts, leaving at least one open.
        val open = s.dailyQuests.filter { it.type != QuestType.FORBIDDEN && it.type != QuestType.LIMIT }
        for (q in open.dropLast(1)) {
            if (s.dayGoal().safe) break
            s = run(s, "2026-10-14T22:00") { completeQuest(q.id) }
        }
        assertEquals(FlameKind.SAFE, s.flame().kind)
        assertEquals(1, s.flame().days)
        val recovering = s.copy(recovery = StreakRecovery(12, s.day))
        assertEquals(Flame(FlameKind.RECOVERING, 12), recovering.copy(quests = fresh().quests).flame())
        assertEquals(FlameKind.REST, s.copy(daily = s.daily.copy(rest = true)).flame().kind)
    }

    @Test fun `luck raises the chances it touches`() {
        val base = luckOdds(30, 0.0)
        val lucky = luckOdds(30, 0.3)
        assertEquals(0.2, base.portalEcho, 1e-9)
        assertEquals(0.26, lucky.portalEcho, 1e-9)
        assertEquals(0.45, base.atLeast.getValue(ShadowRank.KNIGHT), 0.01)
        assertTrue(lucky.atLeast.getValue(ShadowRank.MARSHAL) > base.atLeast.getValue(ShadowRank.MARSHAL))
    }

    @Test fun `slipping an avoid mission from the notification marks it once and never un-marks it`() {
        val avoid = buildQuest(content.questDefById.getValue("pool_nonews"), 1, QuestOrigin.DAILY, "avoid_n")
        var s = fresh().let { it.copy(quests = it.quests + avoid) }
        assertTrue(s.openAvoids().any { it.id == avoid.id })
        s = run(s, "2026-10-14T21:31") { slipAvoid(avoid.id) }
        assertEquals(QuestStatus.FAILED, s.quests.first { it.id == avoid.id }.status)
        s = run(s, "2026-10-14T21:32") { slipAvoid(avoid.id) }
        assertEquals(QuestStatus.FAILED, s.quests.first { it.id == avoid.id }.status)
        assertTrue(s.openAvoids().none { it.id == avoid.id })
    }
}
