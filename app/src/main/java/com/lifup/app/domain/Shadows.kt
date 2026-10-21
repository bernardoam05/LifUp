package com.lifup.app.domain

/** Aggregated effect of the squad plus active buffs. */
data class Passives(
    val xp: Double = 0.0,
    val gold: Double = 0.0,
    val trainingXp: Double = 0.0,
    val mindXp: Double = 0.0,
    val explorerXp: Double = 0.0,
    val bossDamage: Double = 0.0,
    val penaltyReduce: Double = 0.0,
    val shopDiscount: Double = 0.0,
    val focusMastery: Double = 0.0,
    val dailyBonus: Double = 0.0,
    val luck: Double = 0.0,
    val immunity: Boolean = false,
    val streakProtect: Boolean = false,
    /** The parts of [xp] and [gold] that come from item buffs rather than the squad. */
    val buffXp: Double = 0.0,
    val buffGold: Double = 0.0,
) {
    /** All-round XP plus the family's own: strength, movement or mind. */
    fun xpFor(family: DrawGroup?): Double = xp + when (family) {
        DrawGroup.STRENGTH -> trainingXp
        DrawGroup.MIND -> mindXp
        DrawGroup.MOVEMENT -> explorerXp
        else -> 0.0
    }
}

fun GameState.passives(content: Content, now: Long): Passives {
    val totals = mutableMapOf<Passive, Double>()
    var immunity = false
    var streak = false
    for (id in squad) {
        val def = content.shadowById[id] ?: continue
        val level = owned(id)?.level ?: continue
        when (def.passive) {
            Passive.PENALTY_IMMUNITY -> immunity = true
            Passive.STREAK_PROTECT -> streak = true
            else -> totals[def.passive] = (totals[def.passive] ?: 0.0) + Rules.passiveValue(def, level, player.level)
        }
    }
    val amp = 1 + (totals[Passive.ALL_BOOST] ?: 0.0)
    fun v(p: Passive) = (totals[p] ?: 0.0) * amp
    val live = buffs.filter { it.expiresAt > now }
    val buffXp = live.filter { it.stat == "xp" }.sumOf { it.value }
    val buffGold = live.filter { it.stat == "gold" }.sumOf { it.value }
    return Passives(
        xp = v(Passive.XP_BOOST) + buffXp,
        gold = v(Passive.GOLD_BOOST) + buffGold,
        buffXp = buffXp,
        buffGold = buffGold,
        trainingXp = v(Passive.TRAINING_XP),
        mindXp = v(Passive.MIND_XP),
        explorerXp = v(Passive.EXPLORER_XP),
        bossDamage = v(Passive.BOSS_DAMAGE),
        penaltyReduce = v(Passive.PENALTY_REDUCE).coerceAtMost(0.9),
        shopDiscount = v(Passive.SHOP_DISCOUNT).coerceAtMost(0.5),
        focusMastery = v(Passive.FOCUS_MASTERY).coerceAtMost(1.0),
        dailyBonus = v(Passive.DAILY_BONUS),
        luck = v(Passive.SHADOW_LUCK).coerceAtMost(1.0),
        immunity = immunity,
        streakProtect = streak,
    )
}

/**
 * One value per passive in the squad, as it applies: summed and amplified, or for flags the shortest wait.
 */
fun GameState.squadEffects(content: Content): List<Pair<Passive, Double>> {
    val members = squad.mapNotNull { id -> content.shadowById[id]?.let { it to (owned(id)?.level ?: 1) } }
    val amp = 1 + members.filter { it.first.passive == Passive.ALL_BOOST }.sumOf { (d, l) -> Rules.passiveValue(d, l) }
    return members.groupBy { it.first.passive }.map { (passive, ds) ->
        val values = ds.map { (d, l) -> Rules.passiveValue(d, l, player.level) }
        passive to when {
            Rules.isFlag(passive) -> values.min()
            passive == Passive.ALL_BOOST -> values.sum()
            else -> values.sum() * amp
        }
    }
}

/** Passives that fire once in a while (immunity, streak protection); the squad's quickest one sets the wait. */
fun Tx.tryCooldownPassive(passive: Passive): ShadowDef? {
    fun days(d: ShadowDef) = Rules.flagDays(d, s.owned(d.id)?.level ?: 1)
    val shadow = s.squad.mapNotNull { content.shadowById[it] }.filter { it.passive == passive }.minByOrNull(::days) ?: return null
    val last = s.passiveCooldowns[passive] ?: 0L
    if (ctx.now - last < days(shadow) * Rules.DAY_MS) return null
    s = s.copy(passiveCooldowns = s.passiveCooldowns + (passive to ctx.now))
    return shadow
}

fun Tx.gainShadow(id: String, source: SourceType, origin: EchoOrigin, ref: String? = null) {
    if (content.shadowById[id] == null) return
    val existing = s.owned(id)
    s = if (existing == null) s.copy(shadows = s.shadows + OwnedShadow(id, origin = origin, originRef = ref, obtainedOn = ctx.todayKey))
    else s.copy(shadows = s.shadows.map { if (it.id == id) it.copy(copies = it.copies + 1) else it })
    reward { Reward.ShadowGained(it, id, existing == null, (existing?.copies ?: -1) + 1, source, origin, ref) }
    s = s.copy(newEchoes = s.newEchoes + (id to (existing == null || s.newEchoes[id] == true)))
}

fun Tx.randomShadow(pool: List<ShadowDef>, rank: ShadowRank): ShadowDef? {
    val inRank = pool.filter { it.rank == rank }
    return (inRank.ifEmpty { pool.filter { it.rank == ShadowRank.NORMAL } }).randomOrNull(ctx.rng)
}

/** Once per day, finishing every daily mission binds a new shadow. */
fun Tx.rollExtraction() {
    if (s.daily.extractionDone) return
    s = s.copy(daily = s.daily.copy(extractionDone = true))
    val luck = s.passives(content, ctx.now).luck
    val rank = Rules.extractionRank(s.player.level, ctx.rng.nextDouble() / (1 + luck))
    randomShadow(content.shadowPool(SourceType.EXTRACTION), rank)?.let { gainShadow(it.id, SourceType.EXTRACTION, EchoOrigin.PERFECT_DAY) }
}

data class UpgradeCost(val gold: Int, val copies: Int, val levelCapped: Boolean)

fun GameState.upgradeCost(content: Content, id: String): UpgradeCost? {
    val owned = owned(id) ?: return null
    val def = content.shadowById[id] ?: return null
    return UpgradeCost(Rules.upgradeGold(def.rank, owned.level), Rules.upgradeCopies(def.rank), owned.level >= player.level)
}

fun Tx.upgradeShadow(id: String): Boolean {
    val cost = s.upgradeCost(content, id) ?: return false
    val owned = s.owned(id)!!
    if (cost.levelCapped || s.player.gold < cost.gold || owned.copies < cost.copies) return false
    s = s.copy(
        player = s.player.copy(gold = s.player.gold - cost.gold),
        shadows = s.shadows.map { if (it.id == id) it.copy(level = it.level + 1, copies = it.copies - cost.copies) else it },
    )
    count(StatKey.GOLD_SPENT, cost.gold.toLong())
    toast(ToastKind.SHADOW_UPGRADED, id)
    return true
}

/**
 * A member that joined today stays until tomorrow: the squad is a choice for the day, so a passive can't
 * be slotted in for one purchase or one mission and taken out again. Joining is always immediate.
 */
fun GameState.squadLocked(id: String) = squadSince[id] == day

/** With a full squad, [inId] takes [outId]'s place. */
fun Tx.swapSquad(outId: String, inId: String) {
    if (s.owned(inId) == null || outId !in s.squad || inId in s.squad || s.squadLocked(outId)) return
    s = s.copy(squad = s.squad.map { if (it == outId) inId else it }, squadSince = s.squadSince - outId + (inId to s.day))
}

fun Tx.toggleSquad(id: String) {
    if (s.owned(id) == null) return
    s = when {
        id in s.squad -> if (s.squadLocked(id)) s else s.copy(squad = s.squad - id, squadSince = s.squadSince - id)
        s.squad.size >= Rules.SQUAD_SIZE -> s
        else -> s.copy(squad = s.squad + id, squadSince = s.squadSince + (id to s.day))
    }
}

fun Tx.toggleFavoriteEcho(id: String) {
    if (s.owned(id) == null) return
    s = s.copy(favoriteEchoes = if (id in s.favoriteEchoes) s.favoriteEchoes - id else s.favoriteEchoes + id)
}

/** The chances luck changes, for showing them: an item after a mission, an echo from a portal, and a found echo's rank. */
data class LuckOdds(val item: Double, val portalEcho: Double, val atLeast: Map<ShadowRank, Double>)

fun luckOdds(level: Int, luck: Double): LuckOdds {
    val k = 1 + luck
    // Found echoes roll their rank with the roll divided by (1 + luck): sample it rather than restate the table.
    val samples = 2000
    val ranks = (0 until samples).map { Rules.extractionRank(level, (it + 0.5) / samples / k) }
    val atLeast = ShadowRank.entries.drop(1).associateWith { r -> ranks.count { it >= r } / samples.toDouble() }.filterValues { it > 0 }
    return LuckOdds((Rules.MISSION_DROP_CHANCE * k).coerceAtMost(1.0), (Rules.PORTAL_ECHO_CHANCE * k).coerceAtMost(1.0), atLeast)
}
