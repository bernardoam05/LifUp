package com.lifup.app.domain

import java.time.MonthDay
import kotlin.math.roundToInt
import kotlin.random.Random

private fun MonthDay.inWindow(from: MonthDay, to: MonthDay) =
    if (from <= to) this in from..to else this >= from || this <= to

fun BossDef.activeOn(day: MonthDay): Boolean {
    val season = season ?: return false
    return day.inWindow(MonthDay.parse("--${season.from}"), MonthDay.parse("--${season.to}"))
}

/** Rotates the weekly boss on Mondays. Seasonal bosses take over during their window. */
fun Tx.ensureBoss() {
    val current = s.boss
    if (current != null && current.weekKey >= ctx.weekKey) return // ISO dates: never rotate backwards
    if (current != null && !current.defeated) toast(ToastKind.BOSS_ESCAPED, current.bossId)

    val level = s.player.level
    val weekRng = Random(ctx.weekKey.hashCode())
    val today = MonthDay.from(ctx.today)
    val seasonal = content.bosses.firstOrNull { it.activeOn(today) }
    val def = seasonal ?: run {
        val regular = content.bosses.filter { it.season == null && it.minLevel <= level }
        val wantS = level >= 30 && weekRng.nextDouble() < 0.6
        val byRank = regular.filter { (it.rank == "S") == wantS }.ifEmpty { regular }
        byRank.filterNot { it.id in s.bossHistory.takeLast(5) }.ifEmpty { byRank }.random(weekRng)
    }

    val dailyXp = s.dailyQuests.sumOf { it.xp }.coerceAtLeast(150)
    val maxHp = (dailyXp * 4 * if (def.rank == "S") 1.3 else 1.0).roundToInt()
    val challenge = Quest(
        id = "boss_${ctx.weekKey}",
        defId = def.id,
        origin = QuestOrigin.BOSS,
        type = def.type,
        title = def.title,
        description = def.description,
        unit = def.unit,
        target = def.target,
        xp = 0,
        gold = 0,
        rank = if (def.rank == "S") QuestRank.S else QuestRank.A,
    )
    s = s.copy(boss = BossState(ctx.weekKey, def.id, maxHp, maxHp, challenge, ctx.nextWeekStartMs))
}

fun Tx.damageBoss(amount: Int) {
    val b = s.boss ?: return
    if (b.defeated || amount <= 0) return
    val dmg = (amount * (1 + s.passives(content, ctx.now).bossDamage)).roundToInt()
    val hp = (b.hp - dmg).coerceAtLeast(0)
    s = s.copy(boss = b.copy(hp = hp))
    if (hp == 0) defeatBoss()
}

private fun Tx.defeatBoss() {
    val b = s.boss ?: return
    val def = content.bossById[b.bossId] ?: return
    s = s.copy(boss = b.copy(defeated = true, hp = 0), bossHistory = (s.bossHistory + b.bossId).takeLast(20))
    count(StatKey.BOSSES_DEFEATED)
    val xp = gainXp(def.baseXp, hitsBoss = false)
    val gold = gainGold(def.baseGold)
    addItem("bau_cacador")
    reward { Reward.BossDefeated(it, def.id, xp, gold, listOf("bau_cacador")) }
    gainShadow(def.shadowId, SourceType.BOSS)
}

// ── Portals ───────────────────────────────────────────────────────────────────

/** Hourly roll (08:00–21:59): 25% chance to open a timed portal, max two per day. */
fun Tx.rollPortal() {
    val hourKey = "${ctx.todayKey}T${ctx.hour}"
    if (s.portalRollHour == hourKey) return
    s = s.copy(portalRollHour = hourKey)
    if (s.portalDay != ctx.todayKey) s = s.copy(portalDay = ctx.todayKey, portalsToday = 0)
    expirePortal()
    if (s.portal != null || ctx.hour !in 8..21 || s.portalsToday >= Rules.MAX_PORTALS_PER_DAY) return
    if (ctx.rng.nextDouble() >= Rules.PORTAL_CHANCE) return
    openPortal()
}

fun Tx.openPortal() {
    val types = setOf(QuestType.TRAINING, QuestType.KNOWLEDGE, QuestType.FOCUS, QuestType.GPS)
    val def = s.availableDefs(content).filter { it.kind == DefKind.POOL && it.type in types }.randomOrNull(ctx.rng) ?: return
    val base = buildQuest(def, s.player.level, QuestOrigin.PORTAL, "portal_${s.nextId}")
    val quest = base.copy(target = roundTarget(base.target * 1.5, base.unit), xp = base.xp * 2, gold = base.gold * 2)
    val minutes = 60 + ctx.rng.nextInt(121)
    s = s.copy(
        portal = PortalState(quest, ctx.now, ctx.now + minutes * 60_000L),
        portalsToday = s.portalsToday + 1,
        nextId = s.nextId + 1,
    )
}

fun Tx.expirePortal() {
    val p = s.portal ?: return
    if (p.expiresAt > ctx.now) return
    s = s.copy(portal = null)
    toast(ToastKind.PORTAL_ESCAPED)
}

fun Tx.completePortal() {
    val p = s.portal ?: return
    val q = p.quest
    gainXp(q.xp, q.type)
    gainGold(q.gold)
    gainAttributes(q.type)
    s = s.copy(portal = null)
    count(StatKey.PORTALS_CLEARED)
    count(StatKey.QUESTS_COMPLETED)
    toast(ToastKind.PORTAL_CLEARED)
    val luck = s.passives(content, ctx.now).luck
    if (ctx.rng.nextDouble() < 0.2 * (1 + luck)) {
        val rank = Rules.extractionRank(s.player.level, ctx.rng.nextDouble() / (1 + luck))
        randomShadow(content.shadowPool(SourceType.EXTRACTION), rank)?.let { gainShadow(it.id, SourceType.EXTRACTION) }
    }
}
