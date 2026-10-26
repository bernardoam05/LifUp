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
    val weekRng = s.weekRandom(ctx, salt = 0)
    // A seasonal boss takes the week its window covers on Monday, as the "next week" teaser says, so a player
    // starting on the weekend before doesn't get it for two days and then miss the real week. Once per season,
    // even if the window covers two Mondays.
    val monday = MonthDay.from(ctx.weekStart)
    val seasonal = content.bosses.firstOrNull { it.activeOn(monday) && it.id != current?.bossId }
    val def = seasonal ?: run {
        val regular = content.bosses.filter { it.season == null && it.minLevel <= level }
        // S-rank weeks get likelier as more S bosses unlock (12% each, up to 60%).
        val sPool = regular.count { it.rank == "S" }
        val wantS = sPool > 0 && weekRng.nextDouble() < minOf(0.6, 0.12 * sPool)
        val byRank = regular.filter { (it.rank == "S") == wantS }.ifEmpty { regular }
        val recent = s.bossHistory.takeLast(5) + listOfNotNull(current?.bossId)
        byRank.filterNot { it.id in recent }.ifEmpty { byRank }.random(weekRng)
    }

    val dailyXp = s.expectedDailyXp(content).coerceAtLeast(150)
    // A few full days plus both challenges: steady players win by the weekend, occasional ones only sometimes (see SimulationTest).
    val challengeShare = Rules.BOSS_CHALLENGE_DAMAGE * Rules.BOSS_CHALLENGES
    // The very first boss may come mid-week: its health covers only the days left, Sunday included.
    val weekShare = if (current == null) (8 - ctx.today.dayOfWeek.value) / 7.0 else 1.0
    val maxHp = (dailyXp * Rules.BOSS_HP_DAYS / (1 - challengeShare) * (if (def.rank == "S") 1.2 else 1.0) * weekShare).roundToInt().coerceAtLeast(1)
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

/**
 * What a full day pays at the player's level and load: the fixed missions (by the share of days they come up)
 * plus the drawn ones at the pool's average, so a boss's health doesn't hang on how lucky Monday's draw was.
 */
fun GameState.expectedDailyXp(content: Content): Int {
    val defs = availableDefs(content).filterNot { it.isWeekly() }
    fun xp(d: QuestDef) = buildQuest(d, player.level, QuestOrigin.DAILY, step = stepOf(d.id)).xp
    fun share(d: QuestDef) = d.daysOfWeek?.size?.div(7.0) ?: 1.0
    val core = defs.filter { it.kind == DefKind.CORE }
    val pool = defs.filter { it.kind == DefKind.POOL }
    val drawn = if (settings.dailyPoolOverride != null) drawnCount() else minOf(drawnCount(), Rules.MAX_DAY_MISSIONS - core.size).coerceAtLeast(0)
    val poolAvg = if (pool.isEmpty()) 0.0 else pool.sumOf { xp(it) * share(it) } / pool.sumOf(::share)
    return (core.sumOf { xp(it) * share(it) } + minOf(drawn, pool.size) * poolAvg).roundToInt()
}

/** From Thursday a standing boss gets its second challenge, announced so it isn't missed. */
fun Tx.ensureSecondChallenge() {
    val b = s.boss ?: return
    val second = content.bossById[b.bossId]?.second ?: return
    if (b.defeated || b.second != null || b.weekKey != ctx.weekKey || ctx.today.dayOfWeek < Rules.BOSS_SECOND_DAY) return
    val quest = b.challenge.copy(
        id = "boss2_${b.weekKey}",
        type = second.type,
        description = second.description,
        unit = second.unit,
        target = second.target,
        progress = 0.0,
        status = QuestStatus.OPEN,
    )
    s = s.copy(boss = b.copy(second = quest))
    reward { Reward.BossSecondChallenge(it, b.bossId) }
}

fun Tx.markSecondSeen() {
    val b = s.boss ?: return
    if (b.second != null && !b.secondSeen) s = s.copy(boss = b.copy(secondSeen = true))
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
    if (def.season != null) count(StatKey.SEASONAL_BOSSES)
    val xp = gainXp(def.baseXp, hitsBoss = false)
    val gold = gainGold(def.baseGold)
    val loot = if (b.lootGiven) emptyList() else listOf("bau_cacador")
    loot.forEach { addItem(it) }
    s = s.copy(boss = s.boss?.copy(spoils = BossSpoils(xp, gold), lootGiven = true))
    reward { Reward.BossDefeated(it, def.id, xp, gold, loot) }
    if (!b.lootGiven) gainShadow(def.shadowId, SourceType.BOSS, EchoOrigin.BOSS, def.id)
}

/** Gives back HP removed by an undone quest. A boss that fell to it comes back and takes its XP and gold back. */
fun Tx.healBoss(amount: Int) {
    val b = s.boss ?: return
    if (amount <= 0) return
    if (!b.defeated) {
        s = s.copy(boss = b.copy(hp = minOf(b.maxHp, b.hp + amount)))
        return
    }
    b.spoils?.let { loseXp(it.xp); refundGold(it.gold) }
    count(StatKey.BOSSES_DEFEATED, -1)
    if (content.bossById[b.bossId]?.season != null) count(StatKey.SEASONAL_BOSSES, -1)
    val history = s.bossHistory.toMutableList().apply { lastIndexOf(b.bossId).takeIf { it >= 0 }?.let(::removeAt) }
    s = s.copy(boss = b.copy(defeated = false, hp = minOf(b.maxHp, amount), spoils = null), bossHistory = history)
    toast(ToastKind.BOSS_REVIVED, b.bossId)
}

// ── Portals ───────────────────────────────────────────────────────────────────

/** Hourly roll (08:00–21:59): 25% chance to open a timed portal, max two per day. */
fun Tx.rollPortal() {
    val hourKey = "${ctx.todayKey}T${ctx.hour}"
    if (s.portalRollHour == hourKey) return
    s = s.copy(portalRollHour = hourKey)
    if (s.portalDay != ctx.todayKey) s = s.copy(portalDay = ctx.todayKey, portalsToday = 0)
    expirePortal()
    if (s.portal != null || ctx.hour !in Rules.PORTAL_HOURS || s.portalsToday >= Rules.MAX_PORTALS_PER_DAY) return
    if (ctx.rng.nextDouble() >= Rules.PORTAL_CHANCE) return
    openPortal()
}

fun Tx.openPortal() {
    val quest = content.portalQuests
        .map { portalQuest(it) }
        .filter { it.estimatedMinutes(s.settings, content) <= Rules.PORTAL_MAX_TASK_MIN }
        .randomOrNull(ctx.rng) ?: return
    // Always leave room to finish: half again the expected effort plus a margin.
    val needed = (quest.estimatedMinutes(s.settings, content) * 1.5).toInt() + 30
    val minutes = maxOf(60 + ctx.rng.nextInt(121), needed)
    s = s.copy(
        portal = PortalState(quest, ctx.now, ctx.now + minutes * 60_000L),
        portalsToday = s.portalsToday + 1,
        nextId = s.nextId + 1,
    )
}

private fun Tx.portalQuest(def: QuestDef): Quest {
    val base = buildQuest(def, s.player.level, QuestOrigin.PORTAL, "portal_${s.nextId}")
    return base.copy(xp = base.xp * 2, gold = base.gold * 2)
}

/** Rough wall-clock minutes a quest takes; Pomodoro breaks included. */
fun Quest.estimatedMinutes(settings: Settings, content: Content): Double = when (unit) {
    "min" -> if (usesPomodoro(content)) target * (settings.pomodoroWork + settings.pomodoroBreak) / settings.pomodoroWork else target
    "h" -> target * 60
    "s" -> target / 60
    "km" -> target * Rules.MIN_PER_KM
    "steps" -> target / Rules.STEPS_PER_MIN
    "day" -> Double.MAX_VALUE
    else -> Rules.DEFAULT_TASK_MIN
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
    // Portal echoes add on top; their share counts as the squad's.
    val boost = s.passives(content, ctx.now).portal
    val extraXp = (q.xp * boost).roundToInt()
    val extraGold = (q.gold * boost).roundToInt()
    gainXp(q.xp + extraXp, q.family())
    gainGold(q.gold + extraGold)
    squadAdded(SquadGain(xp = extraXp, gold = extraGold))
    gainAttributes(groupOf(q))
    s = s.copy(portal = null)
    count(StatKey.PORTALS_CLEARED)
    count(StatKey.QUESTS_COMPLETED)
    toast(ToastKind.PORTAL_CLEARED)
    val luck = s.passives(content, ctx.now).luck
    if (ctx.rng.nextDouble() < Rules.PORTAL_ECHO_CHANCE * (1 + luck)) {
        val rank = Rules.extractionRank(s.player.level, ctx.rng.nextDouble() / (1 + luck))
        randomShadow(content.shadowPool(SourceType.EXTRACTION), rank)?.let { gainShadow(it.id, SourceType.EXTRACTION, EchoOrigin.PORTAL) }
    }
}
