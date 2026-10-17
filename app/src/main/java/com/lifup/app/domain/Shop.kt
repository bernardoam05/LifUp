package com.lifup.app.domain

import kotlin.math.roundToInt
import kotlin.random.Random

fun Tx.ensureShop() {
    if (s.shop.weekKey >= ctx.weekKey) return
    val stock = content.items.mapNotNull { item -> item.weeklyStock?.let { item.id to it } }.toMap()
    val offers = content.shadowPool(SourceType.SHOP).shuffled(s.weekRandom(ctx, salt = 7)).take(3).map { it.id }
    s = s.copy(shop = ShopState(ctx.weekKey, stock, offers))
}

fun GameState.price(content: Content, base: Int, now: Long): Int =
    (base * (1 - passives(content, now).shopDiscount)).roundToInt()

fun Tx.buyItem(id: String): Boolean {
    val item = content.itemById[id] ?: return false
    val left = s.shop.stock[id]
    if (left != null && left <= 0) return false
    val cost = s.price(content, item.cost, ctx.now)
    if (s.player.gold < cost) return false
    s = s.copy(player = s.player.copy(gold = s.player.gold - cost))
    if (left != null) s = s.copy(shop = s.shop.copy(stock = s.shop.stock + (id to left - 1)))
    addItem(id)
    count(StatKey.GOLD_SPENT, cost.toLong())
    return true
}

fun Tx.buyShadow(id: String): Boolean {
    val def = content.shadowById[id] ?: return false
    if (id !in s.shop.shadowOffers) return false
    val cost = s.price(content, Rules.shopShadowPrice(def.rank), ctx.now)
    if (s.player.gold < cost) return false
    s = s.copy(player = s.player.copy(gold = s.player.gold - cost))
    count(StatKey.GOLD_SPENT, cost.toLong())
    gainShadow(id, SourceType.SHOP)
    return true
}

/** Items used from the inventory. [questId] is required by quest-targeting items. */
fun Tx.useItem(id: String, questId: String? = null): Boolean {
    val item = content.itemById[id] ?: return false
    if (s.items(id) <= 0) return false
    val ok = when (item.effect) {
        ItemEffect.COMPLETE_QUEST -> {
            val q = s.quests.firstOrNull { it.id == questId && it.status == QuestStatus.OPEN } ?: return false
            completeQuest(q.id); true
        }
        ItemEffect.DOUBLE_NEXT_XP -> if (s.doubleXpNext) false else { s = s.copy(doubleXpNext = true); true }
        ItemEffect.REMOVE_PENALTY -> if (!s.penalty.active) false else { clearPenalty(cleared = false); true }
        ItemEffect.BUFF_XP, ItemEffect.BUFF_GOLD -> {
            val stat = if (item.effect == ItemEffect.BUFF_XP) "xp" else "gold"
            val existing = s.buffs.firstOrNull { it.itemId == id && it.expiresAt > ctx.now }
            val duration = item.hours * 3_600_000L
            val buff = existing?.copy(expiresAt = existing.expiresAt + duration)
                ?: Buff(id, stat, item.value, ctx.now + duration)
            s = s.copy(buffs = s.buffs.filterNot { it.itemId == id } + buff)
            toast(ToastKind.BUFF_ACTIVE, id)
            true
        }
        ItemEffect.SHADOW_ESSENCE -> {
            val pool = content.shadowPool(SourceType.EXTRACTION, SourceType.SHOP)
            randomShadow(pool, Rules.essenceRank(ctx.rng.nextDouble()))?.let { gainShadow(it.id, SourceType.EXTRACTION) } != null
        }
        ItemEffect.SWAP_QUEST -> {
            // swapQuest spends the free daily swap first and consumes the scroll itself afterwards.
            return swapQuest(questId ?: return false)
        }
        ItemEffect.CHEST -> { openChest(); true }
        ItemEffect.ADD_XP -> { gainXp(item.value.roundToInt(), hitsBoss = false, boosted = false); true }
        ItemEffect.STREAK_SHIELD, ItemEffect.SPELL_BREAKER -> false
    }
    if (ok) {
        addItem(id, -1)
        count(StatKey.ITEMS_USED)
    }
    return ok
}

private fun Tx.openChest() {
    val luck = 1 + s.passives(content, ctx.now).luck
    val roll = ctx.rng.nextDouble()
    when {
        roll < 0.55 -> {
            val gold = gainGold(((150 + ctx.rng.nextInt(251)) * luck).roundToInt(), boosted = false)
            reward { Reward.ChestOpened(it, gold, 0, null) }
        }
        roll < 0.85 -> {
            val xp = gainXp(100 + ctx.rng.nextInt(201), hitsBoss = false, boosted = false)
            reward { Reward.ChestOpened(it, 0, xp, null) }
        }
        else -> {
            val item = Rules.CHEST_ITEMS.random(ctx.rng)
            addItem(item)
            reward { Reward.ChestOpened(it, 0, 0, item) }
        }
    }
}

// ── Focus sessions ────────────────────────────────────────────────────────────

fun Tx.startFocus(session: FocusSession) {
    if (s.focus != null) return
    val plan = session.pomodoro?.let(Pomodoro::sane)?.let { p ->
        if (session.open) p.copy(rounds = Pomodoro.roundsWithin(p, Rules.OPEN_SESSION_MAX_MIN)) else p
    }
    // Strict means "don't stop early", which an open session doesn't have.
    s = s.copy(
        focus = session.copy(startedAt = ctx.now, pomodoro = plan, strict = session.strict && !session.open),
        settings = if (session.pomodoro == null && !session.open) s.settings.copy(focusMinutes = session.minutes) else s.settings,
    )
}

/** Finishes a session whose time has run out. */
fun Tx.settleFocus() {
    val f = s.focus ?: return
    if (ctx.now < f.endsAt()) return
    finishFocus(f, f.creditableMinutes(ctx.now), completed = true)
}

/** Early stop. Strict sessions lose their minutes unless a Spellbreaker is used. */
fun Tx.stopFocus(useSpellbreaker: Boolean = false) {
    val f = s.focus ?: return
    if (ctx.now >= f.endsAt()) return settleFocus()
    val minutes = f.creditableMinutes(ctx.now)
    if (f.strict) {
        if (useSpellbreaker && s.items("quebra_feiticos") > 0) {
            addItem("quebra_feiticos", -1)
            count(StatKey.ITEMS_USED)
        } else {
            s = s.copy(focus = null)
            toast(ToastKind.FOCUS_LOST, minutes.roundToInt().toString())
            return
        }
    }
    finishFocus(f, minutes, completed = f.open)
}

private fun Tx.finishFocus(f: FocusSession, minutes: Double, completed: Boolean) {
    s = s.copy(focus = null)
    if (minutes < 1) return
    count(StatKey.FOCUS_SESSIONS)
    if (completed && f.strict) count(StatKey.STRICT_SESSIONS)
    f.pomodoro?.let { count(StatKey.POMODORO_CYCLES, Pomodoro.completedCycles(it, f.elapsedMinutes(ctx.now)).toLong()) }
    // "No quitting" is a bet: finishing pays the minutes +25% and some gold.
    val won = completed && f.strict
    if (won) gainGold((minutes / Rules.STRICT_GOLD_EVERY_MIN).toInt(), boosted = false)
    creditFocus(if (won) minutes * Rules.STRICT_BONUS else minutes, f.questId, pomodoro = f.pomodoro != null)
    toast(ToastKind.FOCUS_DONE, minutes.roundToInt().toString())
}
