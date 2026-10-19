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
) {
    fun xpFor(type: QuestType?): Double = xp + when (type) {
        QuestType.TRAINING -> trainingXp
        QuestType.KNOWLEDGE, QuestType.FOCUS -> mindXp
        QuestType.GPS -> explorerXp
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
            else -> totals[def.passive] = (totals[def.passive] ?: 0.0) + Rules.passiveValue(def, level)
        }
    }
    val amp = 1 + (totals[Passive.ALL_BOOST] ?: 0.0)
    fun v(p: Passive) = (totals[p] ?: 0.0) * amp
    val live = buffs.filter { it.expiresAt > now }
    return Passives(
        xp = v(Passive.XP_BOOST) + live.filter { it.stat == "xp" }.sumOf { it.value },
        gold = v(Passive.GOLD_BOOST) + live.filter { it.stat == "gold" }.sumOf { it.value },
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

/** Weekly-cooldown passives (immunity, streak protection). Returns the shadow that fired, if any. */
fun Tx.tryWeeklyPassive(passive: Passive): ShadowDef? {
    val shadow = s.squad.mapNotNull { content.shadowById[it] }.firstOrNull { it.passive == passive } ?: return null
    val last = s.passiveCooldowns[passive] ?: 0L
    if (ctx.now - last < Rules.WEEK_MS) return null
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

/** With a full squad, [inId] takes [outId]'s place. */
fun Tx.swapSquad(outId: String, inId: String) {
    if (s.owned(inId) == null || outId !in s.squad || inId in s.squad) return
    s = s.copy(squad = s.squad.map { if (it == outId) inId else it })
}

fun Tx.toggleSquad(id: String) {
    if (s.owned(id) == null) return
    s = when {
        id in s.squad -> s.copy(squad = s.squad - id)
        s.squad.size >= Rules.SQUAD_SIZE -> s
        else -> s.copy(squad = s.squad + id)
    }
}
