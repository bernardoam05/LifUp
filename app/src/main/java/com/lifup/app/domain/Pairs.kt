package com.lifup.app.domain

import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import kotlin.math.floor
import kotlin.math.roundToInt

/*
 * Pair quests (docs/PAIRS.md): two people do the same mission, each their own part, and a bonus opens when both
 * finish. Everything here is pure; the phone-to-phone sync lives in system/PairCloud and only feeds facts in
 * (the partner joined, the partner's completions, a read that worked) through the Tx functions below.
 */

@Serializable
enum class PairRepeat { ONCE, DAILY, WEEKLY, EVERY }

/** [days]: ISO days of week for [PairRepeat.WEEKLY]; [every]: the gap in days for [PairRepeat.EVERY]. */
@Serializable
data class PairRecurrence(val kind: PairRepeat, val days: List<Int> = emptyList(), val every: Int = 2)

/** The partner finished a cycle at [at] (server time, or the phone's time when it came by [viaLink]). */
@Serializable
data class PartnerMark(val at: Long, val amount: Int = 0, val viaLink: Boolean = false)

@Serializable
enum class PairOutcome { BOTH, PARTNER_MISSED, UNKNOWN, MISSED }

/** One cycle's part: what this phone has to do and what doing it paid. [sent]: the completion reached the cloud. */
@Serializable
data class PairPart(
    val cycle: String,
    val target: Double,
    val xp: Int,
    val gold: Int,
    val doneAt: Long? = null,
    val xpGained: Int = 0,
    val goldGained: Int = 0,
    val sent: Boolean = false,
    val outcome: PairOutcome? = null,
    /** The evening check for this cycle already ran (one read, one notification at most). */
    val nudged: Boolean = false,
    /** The part as a mission: same card, sheet, counter, timer and focus credit as any other (null on 2.0.20 saves). */
    val quest: Quest? = null,
)

@Serializable
data class PairQuest(
    val id: String,
    val defId: String,
    val recurrence: PairRecurrence,
    /** The creator's time zone: cycles and deadlines follow their calendar. */
    val tz: String,
    /** First cycle (creator's date). */
    val start: String,
    val creator: Boolean,
    val myUid: String,
    /** Signs the "tell my partner" links; only the two members can read it. */
    val secret: String,
    val partnerUid: String? = null,
    val partnerName: String = "",
    /** Code for the partner to join, while nobody has. */
    val invite: String? = null,
    val inviteExpires: Long = 0,
    /** Current and not yet settled parts (a few at most). */
    val parts: List<PairPart> = emptyList(),
    /** The partner's completions by cycle, from the cloud or from their link. */
    val partner: Map<String, PartnerMark> = emptyMap(),
    /** Last time the cloud answered a read of this pair. */
    val lastRead: Long = 0,
    /** Last time this phone renewed the pair's expiry in the cloud. */
    val lastBump: Long = 0,
    /** Cycles in a row both kept. */
    val streak: Int = 0,
    /** Over: left, ended by the partner, or a one-off that has been settled. Cleared from the cloud, then dropped. */
    val ended: Boolean = false,
    /** Cycles whose completion this phone wrote to the cloud (for pruning). */
    val sentCycles: List<String> = emptyList(),
)

/** Sync bookkeeping: the free quota, the bonus cap and links opened today. */
@Serializable
data class PairSyncState(
    val quotaBlockedUntil: Long = 0,
    val bonusDay: String = "",
    val bonusUsed: Int = 0,
    val linkDay: String = "",
    val linkReads: Int = 0,
)

object PairRules {
    const val BONUS = 0.25
    const val CUT = 0.10
    const val BONUS_PER_DAY = 2
    const val MAX_ACTIVE = 3
    const val LINK_READS_PER_DAY = 3
    const val SETTLE_DELAY_MS = 5 * 60_000L
    const val GIVE_UP_MS = 36 * 3_600_000L
    const val INVITE_MS = 24 * 3_600_000L
    const val NUDGE_HOUR = 20
    const val KEEP_CYCLES = 7
    private val PACIFIC: ZoneId = ZoneId.of("America/Los_Angeles")

    /** Missions that can be done in a pair: built-in, ticked off by hand, every day the same kind of task. */
    fun eligible(def: QuestDef) = !def.retired && (def.kind == DefKind.CORE || def.kind == DefKind.POOL) &&
        def.type in setOf(QuestType.TRAINING, QuestType.KNOWLEDGE, QuestType.FOCUS, QuestType.GPS) &&
        def.auto == null && def.fromHour == null && !def.isWeekly()

    /** When the free quota resets: midnight in California, wherever the phone is. */
    fun nextQuotaReset(now: Long): Long =
        Instant.ofEpochMilli(now).atZone(PACIFIC).toLocalDate().plusDays(1).atStartOfDay(PACIFIC).toInstant().toEpochMilli()

    /** The second, decisive read: after the first quota reset that follows the deadline. */
    fun finalCheckAt(deadline: Long) = nextQuotaReset(deadline) + 30 * 60_000L

    /**
     * What a cycle came to, or null while it is too early to say. The good news needs one read; "your partner
     * missed it" needs a read after the next quota reset; a partner who only shows up after the deadline, or no
     * answer at all for [GIVE_UP_MS], counts as unknown (x1): neither bonus nor cut.
     */
    fun decide(myDone: Boolean, mark: PartnerMark?, deadline: Long, now: Long, lastRead: Long): PairOutcome? {
        if (now < deadline) return null
        if (!myDone) return PairOutcome.MISSED
        if (mark != null) return if (mark.at <= deadline) PairOutcome.BOTH else PairOutcome.UNKNOWN
        if (lastRead >= finalCheckAt(deadline)) return PairOutcome.PARTNER_MISSED
        if (now >= deadline + GIVE_UP_MS) return PairOutcome.UNKNOWN
        return null
    }
}

fun PairQuest.zone(): ZoneId = runCatching { ZoneId.of(tz) }.getOrDefault(ZoneId.of("UTC"))
fun PairQuest.startDate(): LocalDate = LocalDate.parse(start)

fun PairQuest.isCycleDay(d: LocalDate): Boolean {
    val first = startDate()
    if (d < first) return false
    return when (recurrence.kind) {
        PairRepeat.ONCE -> d == first
        PairRepeat.DAILY -> true
        PairRepeat.WEEKLY -> d.dayOfWeek.value in recurrence.days
        PairRepeat.EVERY -> ChronoUnit.DAYS.between(first, d) % recurrence.every.coerceAtLeast(1) == 0L
    }
}

/** The cycle running at [now] (creator's calendar), if today is one. */
fun PairQuest.cycleAt(now: Long): LocalDate? = Instant.ofEpochMilli(now).atZone(zone()).toLocalDate().takeIf { isCycleDay(it) }

fun PairQuest.deadline(cycle: String): Long = LocalDate.parse(cycle).plusDays(1).atStartOfDay(zone()).toInstant().toEpochMilli()

/** The next cycle from [now] on (today's included), or null when there are none left (a one-off already past). */
fun PairQuest.nextCycle(now: Long): LocalDate? {
    var d = Instant.ofEpochMilli(now).atZone(zone()).toLocalDate().coerceAtLeast(startDate())
    repeat(400) {
        if (isCycleDay(d)) return d
        if (recurrence.kind == PairRepeat.ONCE) return null
        d = d.plusDays(1)
    }
    return null
}

private fun LocalDate.coerceAtLeast(o: LocalDate) = if (this < o) o else this

val PairQuest.joined get() = partnerUid != null
fun PairQuest.currentPart(now: Long): PairPart? = cycleAt(now)?.toString()?.let { c -> parts.firstOrNull { it.cycle == c } }
fun PairQuest.partnerDone(cycle: String) = partner[cycle]?.let { it.at <= deadline(cycle) } == true

fun GameState.activePairs() = pairs.filter { !it.ended }

fun pairQuestId(pairId: String, cycle: String) = "pair_${pairId}_$cycle"

/** Pair parts still in play, as missions (see [GameState.allQuests]). */
fun GameState.pairQuests(): List<Quest> = pairs.filter { !it.ended }.flatMap { p -> p.parts.filter { it.outcome == null }.mapNotNull { it.quest } }

/** The pair a pair mission belongs to. */
fun GameState.pairOf(questId: String): PairQuest? = pairs.firstOrNull { p -> p.parts.any { it.quest?.id == questId } }
fun GameState.canAddPair() = activePairs().size < PairRules.MAX_ACTIVE
fun GameState.pairQuotaBlocked(now: Long) = pairSync.quotaBlockedUntil > now

fun GameState.pairDefs(content: Content): List<QuestDef> =
    availableDefs(content).filter { content.questDefById[it.id] != null && PairRules.eligible(it) }

private fun Tx.updatePair(id: String, f: (PairQuest) -> PairQuest) {
    s = s.copy(pairs = s.pairs.map { if (it.id == id) f(it) else it })
}

/** A new pair, this phone being its creator ([PairQuest.invite] set) or having just joined it. */
fun Tx.addPair(p: PairQuest) {
    if (s.pairs.any { it.id == p.id }) return
    s = s.copy(pairs = s.pairs + p)
    ensurePairs()
}

fun Tx.pairInvite(id: String, code: String, expires: Long) = updatePair(id) { it.copy(invite = code, inviteExpires = expires) }

/**
 * What one read of the cloud found. [partnerUid] null with [gone] false: nobody joined yet. [gone]: the pair no
 * longer exists, or the partner left; cycles still open settle as if the partner did nothing from then on.
 */
fun Tx.pairRead(id: String, partnerUid: String?, partnerName: String?, marks: Map<String, PartnerMark>, gone: Boolean) {
    updatePair(id) { p ->
        // What the cloud says wins over a link: it carries the server's time.
        val merged = p.partner + marks
        p.copy(
            partnerUid = partnerUid ?: p.partnerUid,
            partnerName = partnerName?.takeIf { it.isNotBlank() } ?: p.partnerName,
            invite = if (partnerUid != null) null else p.invite,
            partner = merged,
            lastRead = ctx.now,
            ended = p.ended || gone,
        )
    }
    ensurePairs()
}

/** The partner's link: a completion this phone may not be able to read from the cloud (quota, no network). */
fun Tx.pairLinkMark(id: String, cycle: String, mark: PartnerMark) {
    updatePair(id) { p -> if (p.partner.containsKey(cycle)) p else p.copy(partner = p.partner + (cycle to mark)) }
    ensurePairs()
}

fun Tx.pairSent(id: String, cycle: String) = updatePair(id) { p ->
    p.copy(
        parts = p.parts.map { if (it.cycle == cycle) it.copy(sent = true) else it },
        sentCycles = (p.sentCycles + cycle).distinct().takeLast(PairRules.KEEP_CYCLES * 2),
    )
}

fun Tx.pairBumped(id: String) = updatePair(id) { it.copy(lastBump = ctx.now) }
fun Tx.pairNudged(id: String, cycle: String) = updatePair(id) { p -> p.copy(parts = p.parts.map { if (it.cycle == cycle) it.copy(nudged = true) else it }) }

/** Leaving (or cancelling an invite): open cycles still settle, as missed by whoever didn't finish. */
fun Tx.leavePair(id: String) {
    updatePair(id) { it.copy(ended = true) }
    ensurePairs()
}

/** Over, and nothing left to settle (a done part still waits for its outcome; an undone one just lapses). */
fun PairQuest.droppable() = ended && parts.all { it.outcome != null || it.doneAt == null }

/** Gone from the cloud too: drop it. */
fun Tx.dropPair(id: String) {
    s = s.copy(pairs = s.pairs.filterNot { it.id == id && it.droppable() })
}

fun Tx.pairQuotaHit() {
    s = s.copy(pairSync = s.pairSync.copy(quotaBlockedUntil = PairRules.nextQuotaReset(ctx.now) + 10 * 60_000L))
}

/** Counts a read triggered by opening a link; false once today's allowance is used. */
fun Tx.useLinkRead(): Boolean {
    val sync = s.pairSync.let { if (it.linkDay != ctx.todayKey) it.copy(linkDay = ctx.todayKey, linkReads = 0) else it }
    if (sync.linkReads >= PairRules.LINK_READS_PER_DAY) { s = s.copy(pairSync = sync); return false }
    s = s.copy(pairSync = sync.copy(linkReads = sync.linkReads + 1))
    return true
}

/** Finishes this phone's part of today's cycle (see [completePairQuest]). */
fun Tx.completePairPart(id: String) {
    val p = s.pairs.firstOrNull { it.id == id } ?: return
    val q = p.currentPart(ctx.now)?.quest ?: return
    completePairQuest(q.id)
}

/** A pair mission completed (by hand, the counter, focus or a run): paid like a mission of the same size, right away. */
internal fun Tx.completePairQuest(questId: String) {
    val p = s.pairOf(questId)?.takeIf { !it.ended && it.joined } ?: return
    val part = p.parts.first { it.quest?.id == questId }
    if (part.doneAt != null || ctx.now >= p.deadline(part.cycle)) return
    val def = s.defOf(p.defId, content)
    val family = def?.drawGroup()
    val xp = gainXp(part.xp, family)
    val gold = gainGold(part.gold)
    def?.let { gainAttributes(it.drawGroup()) }
    count(StatKey.QUESTS_COMPLETED)
    updatePair(p.id) { q ->
        q.copy(parts = q.parts.map {
            if (it.cycle != part.cycle) it
            else it.copy(
                doneAt = ctx.now, xpGained = xp, goldGained = gold,
                quest = it.quest?.copy(status = QuestStatus.DONE, progress = maxOf(it.quest.progress, it.quest.target), xpGained = xp, goldGained = gold, doneHour = ctx.hour),
            )
        })
    }
}

/**
 * Keeps pairs up to date with the clock: today's part appears on its cycle days, past cycles settle as soon as
 * they can (see [PairRules.decide]), and a one-off pair ends once its only cycle is settled.
 */
fun Tx.ensurePairs() {
    if (s.pairs.isEmpty()) return
    s.pairs.forEach { p ->
        p.parts.filter { it.outcome == null }.forEach { part -> settlePart(p.id, part.cycle) }
        val cur = s.pairs.first { it.id == p.id }
        val cycle = cur.cycleAt(ctx.now)?.toString()
        if (!cur.ended && cur.joined && cycle != null && cur.parts.none { it.cycle == cycle }) {
            val def = s.defOf(cur.defId, content) ?: return@forEach
            val q = buildQuest(def, s.player.level, QuestOrigin.PAIR, pairQuestId(cur.id, cycle), s.stepOf(def.id), ctx.today)
            updatePair(p.id) { it.copy(parts = it.parts + PairPart(cycle, q.target, q.xp, q.gold, quest = q)) }
        }
        // Parts from 2.0.20 had no mission of their own yet.
        s.defOf(cur.defId, content)?.let { def ->
            updatePair(p.id) { pq ->
                pq.copy(parts = pq.parts.map { part ->
                    if (part.quest != null) part
                    else {
                        val base = buildQuest(def, s.player.level, QuestOrigin.PAIR, pairQuestId(pq.id, part.cycle), s.stepOf(def.id))
                        val done = part.doneAt != null
                        part.copy(quest = base.copy(
                            target = part.target, xp = part.xp, gold = part.gold,
                            status = if (done) QuestStatus.DONE else QuestStatus.OPEN, progress = if (done) part.target else 0.0,
                            xpGained = part.xpGained, goldGained = part.goldGained,
                        ))
                    }
                })
            }
        }
        updatePair(p.id) { q ->
            val noMore = q.recurrence.kind == PairRepeat.ONCE && q.nextCycle(ctx.now) == null && q.parts.all { it.outcome != null }
            // A cycle the partner never joined in time just lapses: nothing was promised.
            val lapsed = !q.joined && q.recurrence.kind == PairRepeat.ONCE && q.nextCycle(ctx.now) == null
            q.copy(
                ended = q.ended || noMore || lapsed,
                // Settled parts linger a day for the card, then go; the partner's old marks too.
                parts = q.parts.filter { it.outcome == null || ctx.now < q.deadline(it.cycle) + 24 * 3_600_000L },
                partner = q.partner.filterKeys { k -> ChronoUnit.DAYS.between(LocalDate.parse(k), ctx.today) <= PairRules.KEEP_CYCLES },
            )
        }
    }
}

private fun Tx.settlePart(id: String, cycle: String) {
    val p = s.pairs.first { it.id == id }
    val part = p.parts.first { it.cycle == cycle }
    val deadline = p.deadline(cycle)
    // An ended pair has no partner left to wait for.
    val lastRead = if (p.ended) Long.MAX_VALUE else p.lastRead
    val decided = PairRules.decide(part.doneAt?.let { it < deadline } == true, p.partner[cycle], deadline, ctx.now, lastRead) ?: return
    // Nobody to blame once the pair is over (one of the two left): no cut, just x1.
    val outcome = if (p.ended && decided == PairOutcome.PARTNER_MISSED) PairOutcome.UNKNOWN else decided
    val name = p.partnerName
    when (outcome) {
        PairOutcome.BOTH -> {
            val sync = s.pairSync.let { if (it.bonusDay != ctx.todayKey) it.copy(bonusDay = ctx.todayKey, bonusUsed = 0) else it }
            if (sync.bonusUsed < PairRules.BONUS_PER_DAY) {
                val xp = gainXp((part.xpGained * PairRules.BONUS).roundToInt(), hitsBoss = false, boosted = false)
                val gold = gainGold((part.goldGained * PairRules.BONUS).roundToInt(), boosted = false)
                s = s.copy(pairSync = sync.copy(bonusUsed = sync.bonusUsed + 1))
                toast(ToastKind.PAIR_BOTH, "$name:$xp:$gold")
            } else {
                s = s.copy(pairSync = sync)
                toast(ToastKind.PAIR_BOTH_CAPPED, name)
            }
            count(StatKey.PAIR_CYCLES)
        }
        PairOutcome.PARTNER_MISSED -> {
            val xp = (part.xpGained * PairRules.CUT).roundToInt()
            val gold = (part.goldGained * PairRules.CUT).roundToInt()
            loseXp(xp)
            refundGold(gold)
            toast(ToastKind.PAIR_CUT, "$name:$xp:$gold")
        }
        PairOutcome.UNKNOWN -> toast(ToastKind.PAIR_UNKNOWN, name)
        PairOutcome.MISSED -> {
            // What one failed mission of this size costs on a failed day, with the same protections.
            val share = Rules.lossMultiplier(s.settings.rigor)
            val reduce = s.passives(content, ctx.now).penaltyReduce
            val xp = floor(part.xp * share * (1 - reduce)).toInt()
            val gold = floor(part.gold * share * (1 - reduce)).toInt()
            loseXp(xp)
            loseGold(gold)
            toast(ToastKind.PAIR_MISSED, "$name:$xp:$gold")
        }
    }
    updatePair(id) { q ->
        q.copy(
            parts = q.parts.map { if (it.cycle == cycle) it.copy(outcome = outcome) else it },
            streak = when (outcome) { PairOutcome.BOTH -> q.streak + 1; PairOutcome.UNKNOWN -> q.streak; else -> 0 },
        )
    }
}

/** Next moment the sync should look at the pairs, or null when nothing is pending. */
fun GameState.nextPairWake(now: Long, zone: ZoneId = ZoneId.systemDefault()): Long? {
    val times = mutableListOf<Long>()
    pairs.forEach { p ->
        if (p.droppable()) times += now
        if (!p.joined && !p.ended) times += now + 6 * 3_600_000L
        p.parts.filter { it.outcome == null }.forEach { part ->
            val dl = p.deadline(part.cycle)
            times += if (now < dl + PairRules.SETTLE_DELAY_MS) dl + PairRules.SETTLE_DELAY_MS else PairRules.finalCheckAt(dl).coerceAtLeast(now + 30 * 60_000L)
            if (part.doneAt == null && !part.nudged) {
                val nudge = Instant.ofEpochMilli(now).atZone(zone).toLocalDate().atTime(PairRules.NUDGE_HOUR, 0).atZone(zone).toInstant().toEpochMilli()
                if (nudge in (now + 1)..<dl) times += nudge
            }
            if (part.doneAt != null && !part.sent) times += now
        }
        // The next cycle's part, so its evening reminder can be planned.
        val tomorrow = Instant.ofEpochMilli(now).atZone(p.zone()).toLocalDate().plusDays(1).atStartOfDay(p.zone()).toInstant().toEpochMilli()
        if (p.joined && !p.ended) p.nextCycle(tomorrow)?.let { c -> times += c.atStartOfDay(p.zone()).toInstant().toEpochMilli() + 60_000L }
    }
    return times.minOrNull()?.let { maxOf(it, pairSync.quotaBlockedUntil) }
}

/** Is the evening reminder due for this pair's open part? */
fun PairQuest.nudgeDue(now: Long, zone: ZoneId = ZoneId.systemDefault()): PairPart? {
    val part = currentPart(now) ?: return null
    if (part.doneAt != null || part.nudged) return null
    return part.takeIf { Instant.ofEpochMilli(now).atZone(zone).hour >= PairRules.NUDGE_HOUR }
}
