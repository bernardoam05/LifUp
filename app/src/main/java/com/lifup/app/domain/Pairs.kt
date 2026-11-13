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
    /** A pair's mission when it's a different one each cycle, the same for both (see [pairDefFor]). */
    const val RANDOM = "random"
    /** A different one each cycle, and each partner draws their own: what counts is that both did theirs. */
    const val EACH = "each"
    /** Pairs at once without CoreQuest+ (with it, [MAX_ACTIVE]). */
    const val FREE_ACTIVE = 1
    const val BONUS = 0.25
    const val CUT = 0.10
    const val BOSS_SHARE = 0.50
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

val PairQuest.isRandom get() = defId == PairRules.RANDOM || defId == PairRules.EACH

/**
 * The mission of [cycle]: the pair's own, or for a random pair one drawn from every built-in pair mission. Both
 * phones draw the same one without talking: the pick only depends on the pair and the date.
 */
fun GameState.pairDefFor(p: PairQuest, cycle: String, content: Content): QuestDef? {
    if (!p.isRandom) return defOf(p.defId, content)
    val pool = (if (p.defId == PairRules.EACH) pairDefs(content)
        else content.quests.filter { PairRules.eligible(it) && !it.optional }).sortedBy { it.id }
    if (pool.isEmpty()) return null
    // "Each their own": the draw depends on the member and their local active pool. Picks may coincide.
    val seed = p.id + cycle + if (p.defId == PairRules.EACH) p.myUid else ""
    val pick = pool[Math.floorMod(seed.hashCode(), pool.size)]
    return defOf(pick.id, content) ?: pick
}

/** Pair parts still in play, as missions (see [GameState.allQuests]). */
fun GameState.pairQuests(): List<Quest> = pairs.filter { !it.ended }.flatMap { p -> p.parts.filter { it.outcome == null }.mapNotNull { it.quest } }

/** The pair a pair mission belongs to. */
fun GameState.pairOf(questId: String): PairQuest? = pairs.firstOrNull { p -> p.parts.any { it.quest?.id == questId } }
fun GameState.pairLimit() = if (plus) PairRules.MAX_ACTIVE else PairRules.FREE_ACTIVE
fun GameState.canAddPair() = activePairs().size < pairLimit()
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
fun Tx.pairRead(id: String, partnerUid: String?, partnerName: String?, marks: Map<String, PartnerMark>, gone: Boolean, partnerLeft: Boolean = false) {
    if (partnerLeft) return pairPartnerLeft(id)
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

/**
 * The partner left, but this phone is still in the pair: it waits for someone to join again (the same person or
 * another) instead of ending. Cycles under way count x1 (nobody to blame), and today's undone part goes.
 */
fun Tx.pairPartnerLeft(id: String) {
    val p = s.pairs.firstOrNull { it.id == id } ?: return
    if (p.partnerUid == null) return
    updatePair(id) { q ->
        q.copy(
            partnerUid = null, partnerName = "", invite = null, inviteExpires = 0, partner = emptyMap(), lastRead = ctx.now, streak = 0,
            parts = q.parts.mapNotNull { part ->
                when {
                    part.outcome != null -> part
                    part.doneAt != null -> part.copy(outcome = PairOutcome.UNKNOWN)
                    else -> null
                }
            },
        )
    }
    toast(ToastKind.PAIR_PARTNER_LEFT, p.partnerName)
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
    val def = s.defOf(part.quest?.defId ?: p.defId, content)
    val family = def?.drawGroup()
    val pairBoost = s.passives(content, ctx.now).pairBoost
    // Pair missions are optional extra work: they help against the boss, but only for half their XP and never
    // receive the boss-weakness multiplier. Their dedicated echo can still improve their own XP and gold.
    val xp = gainXp(part.xp, family, bossShare = PairRules.BOSS_SHARE, extra = pairBoost)
    val gold = gainGold(part.gold, extra = pairBoost)
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
            val def = s.pairDefFor(cur, cycle, content) ?: return@forEach
            val q = buildQuest(def, s.player.level, QuestOrigin.PAIR, pairQuestId(cur.id, cycle), s.stepOf(def.id), ctx.today)
            updatePair(p.id) { it.copy(parts = it.parts + PairPart(cycle, q.target, q.xp, q.gold, quest = q)) }
        }
        // Parts from 2.0.20 had no mission of their own yet.
        (if (cur.isRandom) null else s.defOf(cur.defId, content))?.let { def ->
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
                val bonus = PairRules.BONUS + s.passives(content, ctx.now).pairBond
                val xp = gainXp((part.xpGained * bonus).roundToInt(), hitsBoss = false, boosted = false)
                val gold = gainGold((part.goldGained * bonus).roundToInt(), boosted = false)
                s = s.copy(pairSync = sync.copy(bonusUsed = sync.bonusUsed + 1))
                toast(ToastKind.PAIR_BOTH, "$name:$xp:$gold")
            } else {
                s = s.copy(pairSync = sync)
                toast(ToastKind.PAIR_BOTH_CAPPED, name)
            }
        }
        PairOutcome.PARTNER_MISSED -> {
            // No repeated drain from an abandoned pair: only an active pair sequence carries a stake.
            if (p.streak > 0) {
                val kept = 1 - s.passives(content, ctx.now).pairGuard
                val xp = (part.xpGained * PairRules.CUT * kept).roundToInt()
                val gold = (part.goldGained * PairRules.CUT * kept).roundToInt()
                loseXp(xp)
                refundGold(gold)
                toast(ToastKind.PAIR_CUT, "$name:$xp:$gold")
            } else toast(ToastKind.PAIR_CUT_GRACE, name)
        }
        PairOutcome.UNKNOWN -> toast(ToastKind.PAIR_UNKNOWN, name)
        PairOutcome.MISSED -> {
            if (p.streak > 0) {
                // What one failed mission of this size costs on a failed day, with the same protections.
                val share = Rules.lossMultiplier(s.settings.rigor)
                val reduce = s.passives(content, ctx.now).penaltyReduce
                val guard = s.passives(content, ctx.now).pairGuard
                val xp = floor(part.xp * share * (1 - reduce) * (1 - guard)).toInt()
                val gold = floor(part.gold * share * (1 - reduce) * (1 - guard)).toInt()
                loseXp(xp)
                loseGold(gold)
                toast(ToastKind.PAIR_MISSED, "$name:$xp:$gold")
            } else toast(ToastKind.PAIR_MISSED_GRACE, name)
        }
    }
    val recurringBoth = outcome == PairOutcome.BOTH && p.recurrence.kind != PairRepeat.ONCE
    val nextStreak = when { recurringBoth -> p.streak + 1; outcome == PairOutcome.UNKNOWN -> p.streak; else -> 0 }
    updatePair(id) { q ->
        q.copy(
            parts = q.parts.map { if (it.cycle == cycle) it.copy(outcome = outcome) else it },
            streak = nextStreak,
        )
    }
    if (recurringBoth) {
        count(StatKey.PAIR_CYCLES)
        if (nextStreak > s.bestPairStreak) s = s.copy(bestPairStreak = nextStreak, bestPairPartner = name)
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
