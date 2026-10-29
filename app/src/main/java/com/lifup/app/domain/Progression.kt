package com.lifup.app.domain

import kotlin.math.roundToInt

/** Adds XP with squad/buff multipliers, handles level-ups, rank-ups and (optionally) boss damage. Returns XP gained. */
fun Tx.gainXp(base: Int, family: DrawGroup? = null, hitsBoss: Boolean = true, boosted: Boolean = true, bossShare: Double = 1.0, extra: Double = 0.0): Int {
    if (base <= 0) return 0
    val passives = s.passives(content, ctx.now)
    val mult = if (boosted) 1 + passives.xpFor(family) + extra else 1.0
    val cut = if (boosted) s.penaltyCut() else 1.0
    val amount = (base * mult * cut).roundToInt()
    // The squad's share: what this paid beyond what item buffs alone would have.
    if (boosted) squadAdded(SquadGain(xp = amount - (base * (1 + passives.buffXp) * cut).roundToInt()))
    var p = s.player
    var xp = p.xp + amount
    var level = p.level
    val oldRank = HunterRank.of(level)
    while (xp >= Rules.xpForLevel(level) && level < Rules.MAX_LEVEL) {
        xp -= Rules.xpForLevel(level)
        level++
        s = s.copy(player = p.copy(xp = xp, level = level))
        onLevelReached(level)
        p = s.player
    }
    if (level == Rules.MAX_LEVEL) xp = xp.coerceAtMost(Rules.xpForLevel(level))
    s = s.copy(player = s.player.copy(xp = xp, level = level))
    val newRank = HunterRank.of(level)
    if (newRank != oldRank) reward { Reward.RankUp(it, newRank) }
    if (hitsBoss) damageBoss((amount * bossShare).roundToInt())
    return amount
}

/** [gainXp] that also reports the boss HP it removed, so an undo can give it back. Returns (xp, damage). */
fun Tx.gainXpTracked(base: Int, family: DrawGroup?, bossShare: Double = 1.0, extra: Double = 0.0): Pair<Int, Int> {
    val hpBefore = s.boss?.takeUnless { it.defeated }?.hp
    val xp = gainXp(base, family, bossShare = bossShare, extra = extra)
    return xp to (hpBefore?.let { it - (s.boss?.hp ?: it) } ?: 0)
}

private fun Tx.onLevelReached(level: Int) {
    if (level % 5 != 0) {
        toast(ToastKind.LEVEL_UP, level.toString())
        return
    }
    val gold = Rules.levelGold(level)
    val items = List(if (level % 10 == 0) 2 else 1) { Rules.LEVEL_ITEMS.random(ctx.rng) }
    s = s.copy(player = s.player.copy(gold = s.player.gold + gold))
    count(StatKey.GOLD_EARNED, gold.toLong())
    items.forEach { addItem(it) }
    reward { Reward.LevelUp(it, level, gold, items) }
    levelEcho(level)?.let { gainShadow(it.id, it.source.type, EchoOrigin.LEVEL, level.toString()) }
}

/**
 * The echo a level brings: the one reserved for that level when there is one, otherwise (every
 * [Rules.LEVEL_ECHO_EVERY] levels from [Rules.LEVEL_ECHO_FROM]) one not owned yet of the level's rank.
 */
private fun Tx.levelEcho(level: Int): ShadowDef? {
    content.shadows.firstOrNull { it.source.type == SourceType.LEVEL && it.source.level == level }?.let { return it }
    if (level < Rules.LEVEL_ECHO_FROM || level % Rules.LEVEL_ECHO_EVERY != 0) return null
    val rank = Rules.levelEchoRank(level)
    val pool = content.shadowPool(SourceType.EXTRACTION, SourceType.SHOP).filter { it.rank >= rank }
    val fresh = pool.filter { s.owned(it.id) == null }
    // A new one of that rank, else a new higher one, else another copy of that rank.
    return fresh.filter { it.rank == rank }.ifEmpty { fresh }.ifEmpty { pool.filter { it.rank == rank } }.randomOrNull(ctx.rng)
}

/** What a mission pays if completed now, boosts included, so the card shows the real number before it's done. */
fun GameState.xpPreview(q: Quest, content: Content, now: Long): Int =
    if (q.origin.boosted()) passives(content, now).let { p ->
        (q.xp * (1 + p.portalShare(q)) * (1 + p.xpFor(q.family()) + p.missionXpBonus(this, q, hourAt(now))) * penaltyCut()).roundToInt()
    } else q.xp

fun GameState.goldPreview(q: Quest, content: Content, now: Long): Int =
    if (q.origin.boosted()) passives(content, now).let { p -> (q.gold * (1 + p.portalShare(q)) * (1 + p.gold + p.missionGoldBonus(this, q)) * penaltyCut()).roundToInt() } else q.gold

private fun hourAt(now: Long) = java.time.Instant.ofEpochMilli(now).atZone(java.time.ZoneId.systemDefault()).hour

/** The day after a failed one (not a rest day), which the comeback echoes reward. */
fun GameState.comebackDay() = dayLog.lastOrNull()?.let { !it.passed && !it.rest } == true

private fun Quest.ownMission() = origin == QuestOrigin.DAILY || origin == QuestOrigin.EXTRA || origin == QuestOrigin.WEEKLY

/** Extra XP share the timing echoes add to one of the player's own missions: early in the day, the day after a miss. */
fun Passives.missionXpBonus(s: GameState, q: Quest, hour: Int): Double =
    if (!q.ownMission()) 0.0 else (if (hour < Rules.EARLY_HOUR) earlyXp else 0.0) + (if (s.comebackDay()) comeback else 0.0)

fun Passives.missionGoldBonus(s: GameState, q: Quest): Double = if (q.ownMission() && s.comebackDay()) comeback else 0.0

/** A penalty without the app block halves what missions pay while it lasts. */
fun GameState.penaltyCut() = if (penalty.active && !penaltyBlocks()) Rules.PENALTY_REWARD_CUT else 1.0

private fun Passives.portalShare(q: Quest) = if (q.origin == QuestOrigin.PORTAL) portal else 0.0

private fun QuestOrigin.boosted() = this == QuestOrigin.DAILY || this == QuestOrigin.EXTRA || this == QuestOrigin.WEEKLY || this == QuestOrigin.PORTAL

fun Tx.gainGold(base: Int, boosted: Boolean = true, extra: Double = 0.0): Int {
    if (base <= 0) return 0
    val passives = s.passives(content, ctx.now)
    val cut = if (boosted) s.penaltyCut() else 1.0
    val amount = if (boosted) (base * (1 + passives.gold + extra) * cut).roundToInt() else base
    if (boosted) squadAdded(SquadGain(gold = amount - (base * (1 + passives.buffGold) * cut).roundToInt()))
    s = s.copy(player = s.player.copy(gold = s.player.gold + amount))
    count(StatKey.GOLD_EARNED, amount.toLong())
    return amount
}

/** Adds to what the squad brought this week and overall; a negative gain takes it back (undo). */
fun Tx.squadAdded(g: SquadGain) {
    if (g == SquadGain()) return
    fun SquadGain.clamped() = SquadGain(xp.coerceAtLeast(0), gold.coerceAtLeast(0), saves.coerceAtLeast(0))
    s = s.copy(squadWeek = (s.squadWeek + g).clamped(), squadTotal = (s.squadTotal + g).clamped())
}

/** Runs [block] and returns what the squad added during it. */
inline fun Tx.squadDuring(block: () -> Unit): SquadGain {
    val before = s.squadTotal
    block()
    return s.squadTotal - before
}

fun Tx.gainAttributes(group: DrawGroup?) {
    val g = Rules.attrGain(group)
    val a = s.player.attrXp
    s = s.copy(player = s.player.copy(attrXp = Attributes(a.str + g.str, a.agi + g.agi, a.int + g.int, a.vit + g.vit)))
}

/** Takes back what [gainAttributes] gave, for an undo. */
fun Tx.loseAttributes(group: DrawGroup?) {
    val g = Rules.attrGain(group)
    val a = s.player.attrXp
    s = s.copy(player = s.player.copy(attrXp = Attributes((a.str - g.str).coerceAtLeast(0), (a.agi - g.agi).coerceAtLeast(0), (a.int - g.int).coerceAtLeast(0), (a.vit - g.vit).coerceAtLeast(0))))
}

/**
 * Removes XP without ever dropping a level (used by penalties and undo): below zero it goes negative and the
 * next XP earned fills that first, so levelling up and then undoing can't keep the XP.
 */
fun Tx.loseXp(amount: Int) {
    s = s.copy(player = s.player.copy(xp = s.player.xp - amount))
}

/** Takes back gold that an undone action paid, so "gold earned" stays truthful. */
fun Tx.refundGold(amount: Int) {
    count(StatKey.GOLD_EARNED, -loseGold(amount).toLong())
}

/** Takes gold even past zero: spending what a mission paid and then undoing it leaves a debt, not a free mission. */
fun Tx.loseGold(amount: Int): Int {
    s = s.copy(player = s.player.copy(gold = s.player.gold - amount))
    return amount
}

/** What reaching a level brings, for the progression sheet: gold and items every 5 levels, a rank, an echo. */
data class LevelMilestone(
    val level: Int,
    val gold: Int = 0,
    val items: Int = 0,
    val rank: HunterRank? = null,
    /** The echo reserved for this level, when there is one. */
    val echoId: String? = null,
    /** An echo not owned yet of the level's rank (every [Rules.LEVEL_ECHO_EVERY] levels from [Rules.LEVEL_ECHO_FROM]). */
    val rankEcho: Boolean = false,
)

/** The next [count] levels after [from] that bring something, mirroring what a level-up hands out. */
fun levelMilestones(content: Content, from: Int, count: Int): List<LevelMilestone> =
    ((from + 1)..Rules.MAX_LEVEL).asSequence().mapNotNull { level ->
        val reserved = content.shadows.firstOrNull { it.source.type == SourceType.LEVEL && it.source.level == level }
        val m = LevelMilestone(
            level,
            gold = if (level % 5 == 0) Rules.levelGold(level) else 0,
            items = if (level % 10 == 0) 2 else if (level % 5 == 0) 1 else 0,
            rank = HunterRank.entries.firstOrNull { it.minLevel == level },
            echoId = reserved?.id,
            rankEcho = reserved == null && level >= Rules.LEVEL_ECHO_FROM && level % Rules.LEVEL_ECHO_EVERY == 0,
        )
        m.takeIf { it.gold > 0 || it.rank != null || it.echoId != null || it.rankEcho }
    }.take(count).toList()
