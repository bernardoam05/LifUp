package com.lifup.app.domain

import kotlin.math.roundToInt

/** Adds XP with squad/buff multipliers, handles level-ups, rank-ups and (optionally) boss damage. Returns XP gained. */
fun Tx.gainXp(base: Int, type: QuestType? = null, hitsBoss: Boolean = true, boosted: Boolean = true): Int {
    if (base <= 0) return 0
    val mult = if (boosted) 1 + s.passives(content, ctx.now).xpFor(type) else 1.0
    val amount = (base * mult).roundToInt()
    var p = s.player
    var xp = p.xp + amount
    var level = p.level
    val oldRank = HunterRank.of(level)
    while (xp >= Rules.xpForLevel(level)) {
        xp -= Rules.xpForLevel(level)
        level++
        s = s.copy(player = p.copy(xp = xp, level = level))
        onLevelReached(level)
        p = s.player
    }
    s = s.copy(player = s.player.copy(xp = xp, level = level))
    val newRank = HunterRank.of(level)
    if (newRank != oldRank) reward { Reward.RankUp(it, newRank) }
    if (hitsBoss) damageBoss(amount)
    return amount
}

private fun Tx.onLevelReached(level: Int) {
    if (level % 5 != 0) {
        toast(ToastKind.LEVEL_UP, level.toString())
        return
    }
    val gold = level * 25
    val items = List(if (level % 10 == 0) 2 else 1) { Rules.LEVEL_ITEMS.random(ctx.rng) }
    s = s.copy(player = s.player.copy(gold = s.player.gold + gold))
    count(StatKey.GOLD_EARNED, gold.toLong())
    items.forEach { addItem(it) }
    reward { Reward.LevelUp(it, level, gold, items) }
}

fun Tx.gainGold(base: Int, boosted: Boolean = true): Int {
    if (base <= 0) return 0
    val amount = if (boosted) (base * (1 + s.passives(content, ctx.now).gold)).roundToInt() else base
    s = s.copy(player = s.player.copy(gold = s.player.gold + amount))
    count(StatKey.GOLD_EARNED, amount.toLong())
    return amount
}

fun Tx.gainAttributes(type: QuestType?) {
    val g = Rules.attrGain(type)
    val a = s.player.attrXp
    s = s.copy(player = s.player.copy(attrXp = Attributes(a.str + g.str, a.agi + g.agi, a.int + g.int, a.vit + g.vit)))
}

/** Removes XP without ever dropping a level (used by penalties and undo). */
fun Tx.loseXp(amount: Int) {
    s = s.copy(player = s.player.copy(xp = (s.player.xp - amount).coerceAtLeast(0)))
}

fun Tx.loseGold(amount: Int): Int {
    val lost = minOf(amount, s.player.gold)
    s = s.copy(player = s.player.copy(gold = s.player.gold - lost))
    return lost
}
