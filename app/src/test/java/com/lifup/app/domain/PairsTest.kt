package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.math.roundToInt
import kotlin.random.Random

class PairsTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }
    private val def = content.quests.first { PairRules.eligible(it) && !it.optional }

    private fun at(text: String, z: ZoneId = zone) = LocalDateTime.parse(text).atZone(z).toInstant().toEpochMilli()
    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}) = Engine.run(state, Ctx(content, at(time), zone, Random(1)), action = action)

    private fun pair(kind: PairRepeat = PairRepeat.DAILY, start: String = "2026-11-11", joined: Boolean = true, days: List<Int> = emptyList(), every: Int = 2) = PairQuest(
        id = "p1", defId = def.id, recurrence = PairRecurrence(kind, days, every), tz = "Europe/Lisbon", start = start,
        creator = true, myUid = "ana", secret = PairLink.newSecret(),
        partnerUid = if (joined) "rui" else null, partnerName = if (joined) "Rui" else "", invite = if (joined) null else "ABCDEFGH",
    )

    private fun withPair(p: PairQuest = pair(), time: String = "2026-11-11T09:00") = run(GameState(onboarded = true), time) { addPair(p) }
    private fun GameState.p() = pairs.first()
    private fun mark(time: String) = PartnerMark(at(time), 40)
    private fun toasts(s: GameState) = s.rewards.filterIsInstance<Reward.Toast>().map { it.kind }

    @Test fun `recurrences pick the right days`() {
        val d = LocalDate.parse("2026-11-11") // a Wednesday
        assertTrue(pair(PairRepeat.ONCE).isCycleDay(d))
        assertFalse(pair(PairRepeat.ONCE).isCycleDay(d.plusDays(1)))
        assertFalse(pair(PairRepeat.DAILY).isCycleDay(d.minusDays(1)))
        val weekly = pair(PairRepeat.WEEKLY, days = listOf(1, 3, 5))
        assertEquals(listOf(true, false, true, false, false, true), (0L..5L).map { weekly.isCycleDay(d.plusDays(it)) })
        val every3 = pair(PairRepeat.EVERY, every = 3)
        assertEquals(listOf(true, false, false, true), (0L..3L).map { every3.isCycleDay(d.plusDays(it)) })
        assertNull(pair(PairRepeat.ONCE).nextCycle(at("2026-11-12T10:00")))
        assertEquals(LocalDate.parse("2026-11-13"), weekly.nextCycle(at("2026-11-12T10:00")))
    }

    @Test fun `the deadline is the creator's midnight, wherever the partner is`() {
        val p = pair().copy(tz = "America/New_York")
        assertEquals(at("2026-11-12T00:00", ZoneId.of("America/New_York")), p.deadline("2026-11-11"))
        // 03:00 in Lisbon is still the 10th in New York.
        assertEquals(LocalDate.parse("2026-11-10"), p.copy(start = "2026-11-01").cycleAt(at("2026-11-11T03:00")))
    }

    @Test fun `deciding a cycle`() {
        val dl = at("2026-11-12T00:00")
        fun decide(done: Boolean, mark: PartnerMark?, now: String, lastRead: Long = 0) = PairRules.decide(done, mark, dl, at(now), lastRead)
        assertNull(decide(true, null, "2026-11-11T23:00"))
        assertEquals(PairOutcome.MISSED, decide(false, null, "2026-11-12T00:10"))
        assertEquals(PairOutcome.BOTH, decide(true, mark("2026-11-11T22:00"), "2026-11-12T00:10"))
        assertEquals(PairOutcome.UNKNOWN, decide(true, mark("2026-11-12T08:30"), "2026-11-12T09:00"))
        // No sign of the partner: wait for a read after the quota reset (08:00 in Lisbon) before blaming them.
        assertNull(decide(true, null, "2026-11-12T00:10", lastRead = at("2026-11-12T00:06")))
        val final = PairRules.finalCheckAt(dl)
        assertEquals(at("2026-11-12T08:30"), final)
        assertEquals(PairOutcome.PARTNER_MISSED, decide(true, null, "2026-11-12T08:40", lastRead = final + 1))
        assertEquals(PairOutcome.UNKNOWN, decide(true, null, "2026-11-13T12:01"))
    }

    @Test fun `today's part appears once the partner is in, and pays like a mission`() {
        var s = withPair(pair(joined = false))
        assertTrue(s.p().parts.isEmpty())
        s = run(s, "2026-11-11T10:00") { pairRead("p1", "rui", "Rui", emptyMap(), gone = false) }
        val part = s.p().parts.single()
        assertEquals("2026-11-11", part.cycle)
        assertNull(s.p().invite)
        val completed = s.count(StatKey.QUESTS_COMPLETED)
        s = run(s, "2026-11-11T18:00") { completePairPart("p1") }
        val done = s.p().parts.single()
        assertNotNull(done.doneAt)
        assertTrue(done.xpGained > 0)
        assertEquals(completed + 1, s.count(StatKey.QUESTS_COMPLETED))
        assertFalse(done.sent)
        // Twice does nothing.
        val again = run(s, "2026-11-11T18:01") { completePairPart("p1") }
        assertEquals(completed + 1, again.count(StatKey.QUESTS_COMPLETED))
        assertEquals(done, again.p().parts.single())
    }

    @Test fun `both kept - the bonus comes once the partner shows up`() {
        var s = run(withPair(), "2026-11-11T18:00") { completePairPart("p1") }
        val part = s.p().parts.single()
        s = run(s, "2026-11-12T00:06") { pairRead("p1", "rui", "Rui", mapOf("2026-11-11" to mark("2026-11-11T21:00")), gone = false) }
        assertEquals(PairOutcome.BOTH, s.p().parts.first { it.cycle == "2026-11-11" }.outcome)
        assertTrue(ToastKind.PAIR_BOTH in toasts(s))
        val bonus = s.rewards.filterIsInstance<Reward.Toast>().first { it.kind == ToastKind.PAIR_BOTH }.arg.split(':')
        assertEquals((part.goldGained * PairRules.BONUS).roundToInt(), bonus[2].toInt())
        assertEquals(1, s.p().streak)
        assertEquals(1, s.pairSync.bonusUsed)
    }

    @Test fun `partner missed - cut only after the read past the quota reset`() {
        var s = run(withPair(), "2026-11-11T18:00") { completePairPart("p1") }
        val gained = s.p().parts.single().goldGained
        s = run(s, "2026-11-12T00:06") { pairRead("p1", "rui", "Rui", emptyMap(), gone = false) }
        assertNull(s.p().parts.first { it.cycle == "2026-11-11" }.outcome)
        val gold = s.player.gold
        s = run(s, "2026-11-12T08:40") { pairRead("p1", "rui", "Rui", emptyMap(), gone = false) }
        assertEquals(PairOutcome.PARTNER_MISSED, s.p().parts.first { it.cycle == "2026-11-11" }.outcome)
        assertEquals(gold - (gained * PairRules.CUT).roundToInt(), s.player.gold)
        assertEquals(0, s.p().streak)
    }

    @Test fun `no answer for 36 hours counts as x1`() {
        var s = run(withPair(), "2026-11-11T18:00") { completePairPart("p1") }
        s = run(s, "2026-11-13T12:30")
        assertTrue(ToastKind.PAIR_UNKNOWN in toasts(s))
        assertFalse(ToastKind.PAIR_CUT in toasts(s))
    }

    @Test fun `a link counts as proof when the cloud can't be read`() {
        var s = run(withPair(), "2026-11-11T18:00") { completePairPart("p1") }
        s = run(s, "2026-11-11T22:00") { pairLinkMark("p1", "2026-11-11", PartnerMark(at("2026-11-11T21:55"), 40, viaLink = true)) }
        s = run(s, "2026-11-12T00:10")
        assertEquals(PairOutcome.BOTH, s.p().parts.first { it.cycle == "2026-11-11" }.outcome)
    }

    @Test fun `missing your own part costs like a missed mission`() {
        var s = withPair()
        val part = s.p().parts.single()
        val gold = s.player.gold
        s = run(s, "2026-11-12T00:10")
        assertEquals(PairOutcome.MISSED, s.p().parts.first { it.cycle == "2026-11-11" }.outcome)
        assertTrue(ToastKind.PAIR_MISSED in toasts(s))
        assertTrue(part.gold > 0)
        assertTrue(s.player.gold <= gold - (part.gold * Rules.lossMultiplier(Rigor.NORMAL) * 0.5).toInt())
    }

    @Test fun `a one-off pair ends after its cycle and leaving never cuts`() {
        var s = run(withPair(pair(PairRepeat.ONCE)), "2026-11-11T18:00") { completePairPart("p1") }
        s = run(s, "2026-11-11T19:00") { leavePair("p1") }
        assertTrue(s.p().ended)
        s = run(s, "2026-11-12T00:10")
        assertEquals(PairOutcome.UNKNOWN, s.p().parts.first().outcome)
        assertFalse(ToastKind.PAIR_CUT in toasts(s))
        s = run(s, "2026-11-12T00:11") { dropPair("p1") }
        assertTrue(s.pairs.isEmpty())
    }

    @Test fun `at most three pairs`() {
        var s = GameState(onboarded = true)
        repeat(3) { i -> s = run(s, "2026-11-11T09:00") { addPair(pair().copy(id = "p$i")) } }
        assertFalse(s.canAddPair())
    }

    @Test fun `links round-trip, and a changed or foreign one fails`() {
        val secret = PairLink.newSecret()
        val done = PairLink.Done("p1", "2026-11-11", "rui", 40, 1_700_000_000_000)
        val url = PairLink.build(done, secret)
        assertTrue(url.startsWith("https://${PairLink.HOST}${PairLink.PATH}#"))
        val data = url.substringAfter('#')
        assertEquals(done, PairLink.parse(data)?.first)
        assertTrue(PairLink.verify(data, secret))
        assertFalse(PairLink.verify(data, PairLink.newSecret()))
        val forged = PairLink.build(done.copy(at = 1), PairLink.newSecret()).substringAfter('#').substringBefore('.') + "." + data.substringAfter('.')
        assertFalse(PairLink.verify(forged, secret))
        assertNull(PairLink.parse("garbage"))
        assertTrue(PairLink.newInviteCode().matches(Regex("^[A-HJ-NP-Z2-9]{8}$")))
        assertEquals("ABCD2345", PairLink.normalizeCode(" abcd-2345 "))
    }

    @Test fun `the part is a mission - progress counts and reaching the target completes it`() {
        var s = withPair()
        val q = s.pairQuests().single()
        assertEquals(QuestOrigin.PAIR, q.origin)
        assertTrue(s.allQuests.any { it.id == q.id })
        s = run(s, "2026-11-11T10:00") { setProgress(q.id, q.target / 2) }
        assertEquals(q.target / 2, s.pairQuests().single().progress, 0.001)
        assertNull(s.p().parts.single().doneAt)
        s = run(s, "2026-11-11T10:05") { setProgress(q.id, q.target) }
        assertNotNull(s.p().parts.single().doneAt)
        assertEquals(QuestStatus.DONE, s.p().parts.single().quest?.status)
        assertTrue(s.p().parts.single().xpGained > 0)
    }

    @Test fun `parts saved before they were missions get one`() {
        var s = withPair()
        s = s.copy(pairs = s.pairs.map { p -> p.copy(parts = p.parts.map { it.copy(quest = null, doneAt = at("2026-11-11T08:00"), xpGained = 7) }) })
        s = run(s, "2026-11-11T09:30")
        val q = s.p().parts.single().quest
        assertNotNull(q)
        assertEquals(QuestStatus.DONE, q!!.status)
        assertEquals(7, q.xpGained)
    }

    @Test fun `invite codes come out of whatever was pasted`() {
        val message = "Faz comigo a missão \"Flexões\" no Questborn! Toca para entrar: ${PairLink.joinLink("ABCD2345")} (ou escreve o código ABCD2345)"
        assertEquals("ABCD2345", PairLink.extractCode(message))
        assertEquals("ABCD2345", PairLink.extractCode("abcd 2345"))
        assertEquals("ABCD2345", PairLink.extractCode("Code: ABCD-2345."))
        assertEquals("AB", PairLink.extractCode("ab"))
        assertEquals("ABCD2345", PairLink.joinCodeOf("j-abcd2345"))
        assertNull(PairLink.joinCodeOf("j-ABCD"))
        assertNull(PairLink.joinCodeOf(PairLink.build(PairLink.Done("p", "2026-11-11", "u", 1, 1), PairLink.newSecret()).substringAfter('#')))
    }

    @Test fun `the next wake-up follows the pending work`() {
        val s = run(withPair(), "2026-11-11T18:00") { completePairPart("p1") }
        // Done but not sent: right away.
        assertEquals(at("2026-11-11T18:30"), s.nextPairWake(at("2026-11-11T18:30"), zone))
        val sent = run(s, "2026-11-11T18:31") { pairSent("p1", "2026-11-11") }
        // Then tomorrow's cycle opening, just after midnight.
        assertEquals(at("2026-11-12T00:01"), sent.nextPairWake(at("2026-11-11T18:40"), zone))
    }
}
