package com.lifup.app.domain

import java.time.LocalDate
import kotlin.math.roundToInt
import kotlin.random.Random

fun roundTarget(value: Double, unit: String): Double =
    if (unit == "km") (value * 10).roundToInt() / 10.0 else value.roundToInt().toDouble()

/** [day] picks the day's prompt for missions that have them. */
fun buildQuest(def: QuestDef, level: Int, origin: QuestOrigin, id: String = def.id, adapt: Int = 0, day: LocalDate? = null): Quest {
    val step = if (def.adaptable()) adapt else 0
    val mult = Rules.tierMultiplier(level) * (1 + Rules.ADAPT_STEP / 2 * step)
    val steps = (level - 1) / def.scalingInterval.coerceAtLeast(1)
    val scaled = def.baseTarget + steps * (if (def.descending) -def.scalingAmount else def.scalingAmount)
    val raw = (def.maxTarget?.let { scaled.coerceAtMost(it) } ?: scaled) * adaptFactor(def.type, step)
    val min = if (def.type == QuestType.FORBIDDEN || def.type == QuestType.LIMIT) 0.0 else 1.0
    return Quest(
        id = id,
        defId = def.id,
        origin = origin,
        type = def.type,
        title = def.title,
        description = def.description,
        unit = def.unit,
        target = roundTarget(raw.coerceAtLeast(min), def.unit).coerceAtLeast(min),
        xp = (def.baseXp * mult).roundToInt(),
        gold = (def.baseGold * mult).roundToInt(),
        rank = Rules.questRank(def.baseXp),
        auto = def.auto,
        pomodoro = def.pomodoro,
        fromHour = def.fromHour,
        perWeek = def.perWeek.takeIf { def.isWeekly() },
        prompt = day?.let { def.promptOn(it) },
        adapt = step,
    )
}

/** A quest that will count as kept at the end of the day (done, or an avoid/limit quest not broken). */
fun Quest.isSuccessful(): Boolean = when {
    status == QuestStatus.DONE -> true
    status == QuestStatus.FAILED -> false
    type == QuestType.FORBIDDEN -> true
    type == QuestType.LIMIT -> progress <= target
    else -> false
}

/** A mission definition as the player has it: their edited copy of a built-in one wins. */
fun GameState.defOf(id: String, content: Content): QuestDef? = customDefs.firstOrNull { it.id == id } ?: content.questDefById[id]

fun GameState.isEditedBuiltIn(id: String, content: Content) = content.questDefById[id] != null && customDefs.any { it.id == id }

fun GameState.availableDefs(content: Content): List<QuestDef> {
    val edited = customDefs.associateBy { it.id }
    return (content.quests.map { edited[it.id] ?: it } + customDefs.filter { content.questDefById[it.id] == null }).filter {
        it.id !in disabledDefIds && (it.auto != AutoKind.DISTRACTION_TIME || settings.blockedApps.isNotEmpty())
    }
}

fun GameState.allDailyDone(): Boolean = dailyQuests.isNotEmpty() && dailyQuests.all { it.isSuccessful() }

fun generateDailyQuests(state: GameState, content: Content, date: LocalDate): List<Quest> {
    val defs = state.availableDefs(content)
    val dow = date.dayOfWeek.value
    val level = state.player.level
    val core = defs.filter { it.kind == DefKind.CORE && !it.isWeekly() && (it.daysOfWeek == null || dow in it.daysOfWeek) }
    val weekly = defs.filter { it.isWeekly() }
    // A weekly mission that is due takes a drawn mission's place.
    val due = weekly.count { state.weekly[it.id]?.dueOn(date) == true }
    val seed = date.year * 10_000 + date.monthValue * 100 + date.dayOfMonth
    val pool = drawBalanced(
        defs.filter { it.kind == DefKind.POOL && (it.daysOfWeek == null || dow in it.daysOfWeek) },
        (Rules.dailyPoolCount(level, state.settings) - due).coerceAtLeast(0),
        state.settings.focusAttrs,
        Random(seed.toLong() xor state.seed),
    )
    return (core + pool).map { buildQuest(it, level, QuestOrigin.DAILY, adapt = state.adapt[it.id]?.level ?: 0, day = date) } +
        weekly.map { weeklyQuest(it, state.weekly[it.id], date, level, state.adapt[it.id]?.level ?: 0) }
}

/** The same prompt all day, a different one most days. */
fun QuestDef.promptOn(day: LocalDate): L10n? = prompts?.takeIf { it.isNotEmpty() }?.let { it[Math.floorMod(day.toEpochDay() + id.hashCode(), it.size.toLong()).toInt()] }

internal fun Tx.updateQuestProgress(id: String, value: Double) = updateQuest(id) { it.copy(progress = value) }

private fun Tx.updateQuest(id: String, f: (Quest) -> Quest) {
    s = when {
        s.quests.any { it.id == id } -> s.copy(quests = s.quests.map { if (it.id == id) f(it) else it })
        s.penalty.quests.any { it.id == id } -> s.copy(penalty = s.penalty.copy(quests = s.penalty.quests.map { if (it.id == id) f(it) else it }))
        s.boss?.challenge?.id == id -> s.copy(boss = s.boss!!.copy(challenge = f(s.boss!!.challenge)))
        s.portal?.quest?.id == id -> s.copy(portal = s.portal!!.copy(quest = f(s.portal!!.quest)))
        else -> s
    }
}

fun Quest.availableAt(hour: Int) = fromHour == null || hour >= fromHour

fun Tx.completeQuest(id: String) {
    val q = s.allQuests.firstOrNull { it.id == id } ?: return
    if (q.status != QuestStatus.OPEN || !q.availableAt(ctx.hour)) return
    when (q.origin) {
        QuestOrigin.PENALTY -> {
            updateQuest(id) { it.copy(status = QuestStatus.DONE, progress = it.target) }
            if (s.penalty.quests.all { it.status == QuestStatus.DONE }) clearPenalty(cleared = true)
        }
        QuestOrigin.BOSS -> {
            updateQuest(id) { it.copy(status = QuestStatus.DONE, progress = it.target) }
            count(StatKey.BOSS_CHALLENGES)
            s.boss?.let { b -> damageBoss((b.maxHp * Rules.BOSS_CHALLENGE_DAMAGE).roundToInt()) }
        }
        QuestOrigin.PORTAL -> completePortal()
        QuestOrigin.DAILY, QuestOrigin.EXTRA, QuestOrigin.WEEKLY -> completeMission(q)
    }
    stopTimer(id, record = true)
}

private fun Tx.completeMission(q: Quest) {
    val doubled = s.doubleXpNext
    if (doubled) s = s.copy(doubleXpNext = false)
    val (xp, dealt) = gainXpTracked(if (doubled) q.xp * 2 else q.xp, q.type)
    val gold = gainGold(q.gold)
    gainAttributes(groupOf(q))
    updateQuest(q.id) { it.copy(status = QuestStatus.DONE, progress = maxOf(it.progress, it.target), xpGained = xp, goldGained = gold, bossDamage = dealt) }
    count(StatKey.QUESTS_COMPLETED)
    if (q.origin == QuestOrigin.EXTRA) count(StatKey.EXTRA_COMPLETED)
    when (ctx.hour) {
        in 0..3 -> count(StatKey.NIGHT_QUESTS)
        in 4..6 -> count(StatKey.EARLY_QUESTS)
    }
    val rec = s.records[q.defId] ?: QuestRecord()
    s = s.copy(records = s.records + (q.defId to rec.copy(count = rec.count + 1)))
    tallyWeekly(q, +1)
    rollMissionDrop()
    if (q.origin == QuestOrigin.DAILY && s.allDailyDone()) rollExtraction()
}

private fun Tx.rollMissionDrop() {
    val luck = 1 + s.passives(content, ctx.now).luck
    val roll = ctx.rng.nextDouble()
    val item = when {
        roll < 0.03 * luck -> "essencia_sombria"
        roll < 0.09 * luck -> "bau_cacador"
        else -> null
    } ?: return
    addItem(item)
    toast(ToastKind.ITEM_FOUND, item)
}

/** Undo a completed daily/extra mission. XP is removed without dropping levels. */
fun Tx.undoQuest(id: String) {
    val q = s.quests.firstOrNull { it.id == id } ?: return
    if (q.status != QuestStatus.DONE) return
    loseXp(q.xpGained)
    refundGold(q.goldGained)
    healBoss(q.bossDamage)
    count(StatKey.QUESTS_COMPLETED, -1)
    if (q.origin == QuestOrigin.EXTRA) count(StatKey.EXTRA_COMPLETED, -1)
    tallyWeekly(q, -1)
    updateQuest(id) {
        // Tracked minutes/km stay (they were really done); automatic missions restart and stop auto-filling.
        val tracked = it.auto == null && (it.type == QuestType.FOCUS || it.type == QuestType.GPS)
        val progress = if (tracked) it.progress.coerceAtMost(it.target * 0.99) else 0.0
        it.copy(status = QuestStatus.OPEN, xpGained = 0, goldGained = 0, bossDamage = 0, progress = progress, autoOff = it.auto != null)
    }
}

/** Avoid-type quests are kept by default; this marks (or un-marks) them as broken. */
fun Tx.toggleFailed(id: String) {
    updateQuest(id) {
        when (it.status) {
            QuestStatus.OPEN -> it.copy(status = QuestStatus.FAILED)
            QuestStatus.FAILED -> it.copy(status = QuestStatus.OPEN)
            QuestStatus.DONE -> it
        }
    }
}

/** Counter progress for limit and manual quests; reaching the target auto-completes manual ones. */
fun Tx.setProgress(id: String, value: Double) {
    val q = s.allQuests.firstOrNull { it.id == id } ?: return
    if (q.status != QuestStatus.OPEN) return
    updateQuest(id) { it.copy(progress = value.coerceAtLeast(0.0)) }
    if (q.type != QuestType.LIMIT && q.type != QuestType.FORBIDDEN && value >= q.target) completeQuest(id)
}

/** Older saves don't carry the flag on today's quests, so the definition decides too. */
fun Quest.usesPomodoro(content: Content) = pomodoro || content.questDefById[defId]?.pomodoro == true

/** Counts focus minutes, and credits them to the session's mission only when done in that mission's mode. */
fun Tx.creditFocus(minutes: Double, questId: String?, pomodoro: Boolean) {
    if (minutes <= 0) return
    count(StatKey.FOCUS_MINUTES, minutes.roundToInt().toLong())
    val q = s.allQuests.firstOrNull { it.id == questId } ?: return
    if (q.type != QuestType.FOCUS || q.status != QuestStatus.OPEN || q.usesPomodoro(content) != pomodoro) return
    val next = q.progress + minutes * (1 + s.passives(content, ctx.now).focusMastery)
    updateQuest(q.id) { it.copy(progress = minOf(next, it.target)) }
    if (next >= q.target) completeQuest(q.id)
}

fun Tx.creditGps(questId: String, km: Double) {
    val q = s.allQuests.firstOrNull { it.id == questId } ?: return
    if (q.type != QuestType.GPS || q.status != QuestStatus.OPEN || km <= 0) return
    count(StatKey.GPS_METERS, (km * 1000).roundToInt().toLong())
    val next = q.progress + km
    updateQuest(questId) { it.copy(progress = minOf(next, it.target)) }
    if (next >= q.target) completeQuest(questId)
}

/** Swap an open daily pool mission. One free swap per day, then a Swap Scroll. */
fun Tx.swapQuest(id: String): Boolean {
    val q = s.dailyQuests.firstOrNull { it.id == id } ?: return false
    val def = s.defOf(q.defId, content) ?: return false
    if (q.status != QuestStatus.OPEN || def.kind != DefKind.POOL) return false
    val free = s.daily.swapsUsed < Rules.FREE_SWAPS_PER_DAY
    if (!free && s.items("pergaminho_troca") == 0) return false
    val used = s.quests.map { it.defId }.toSet()
    val replacement = s.availableDefs(content)
        .filter { it.kind == DefKind.POOL && it.id !in used }
        .randomOrNull(ctx.rng) ?: return false
    if (free) s = s.copy(daily = s.daily.copy(swapsUsed = s.daily.swapsUsed + 1))
    else { addItem("pergaminho_troca", -1); count(StatKey.ITEMS_USED) }
    s = s.copy(quests = s.quests.map { if (it.id == id) buildQuest(replacement, s.player.level, QuestOrigin.DAILY, day = ctx.today) else it })
    s = s.copy(timers = s.timers - id)
    return true
}

fun GameState.canAddExtra() = allDailyDone() && daily.extrasAdded < Rules.MAX_EXTRAS_PER_DAY

fun Tx.addExtraQuest(): Boolean {
    if (!s.canAddExtra()) return false
    val used = s.quests.map { it.defId }.toSet()
    val def = s.availableDefs(content)
        .filter { it.kind == DefKind.POOL && it.id !in used && it.type != QuestType.FORBIDDEN && it.type != QuestType.LIMIT }
        .randomOrNull(ctx.rng) ?: return false
    val n = s.daily.extrasAdded + 1
    s = s.copy(
        quests = s.quests + buildQuest(def, s.player.level, QuestOrigin.EXTRA, "extra_${n}_${def.id}", day = ctx.today),
        daily = s.daily.copy(extrasAdded = n),
    )
    return true
}

// ── Side quests ───────────────────────────────────────────────────────────────

fun Tx.addSideQuest(title: String) {
    if (title.isBlank()) return
    val roll = ctx.rng.nextDouble()
    val (rank, xp, gold) = when {
        roll < 0.60 -> Triple(QuestRank.E, 10 + ctx.rng.nextInt(21), 3 + ctx.rng.nextInt(6))
        roll < 0.90 -> Triple(QuestRank.D, 30 + ctx.rng.nextInt(31), 8 + ctx.rng.nextInt(8))
        else -> Triple(QuestRank.C, 60 + ctx.rng.nextInt(41), 15 + ctx.rng.nextInt(11))
    }
    s = s.copy(sideQuests = s.sideQuests + SideQuest("side_${s.nextId}", title.trim(), ctx.todayKey, rank, xp, gold))
    s = s.copy(nextId = s.nextId + 1)
}

private fun Tx.updateSide(id: String, f: (SideQuest) -> SideQuest) {
    s = s.copy(sideQuests = s.sideQuests.map { if (it.id == id) f(it) else it })
}

fun GameState.sideRewardsLeft() = (Rules.SIDE_REWARDS_PER_DAY - daily.sideRewarded).coerceAtLeast(0)

fun Tx.completeSideQuest(id: String) {
    val sq = s.sideQuests.firstOrNull { it.id == id && !it.done } ?: return
    if (s.sideRewardsLeft() == 0) {
        updateSide(id) { it.copy(done = true) }
        return
    }
    val (xp, dealt) = gainXpTracked(sq.xp, null)
    val gold = gainGold(sq.gold)
    gainAttributes(null)
    count(StatKey.SIDE_COMPLETED)
    s = s.copy(daily = s.daily.copy(sideRewarded = s.daily.sideRewarded + 1))
    updateSide(id) { it.copy(done = true, xpGained = xp, goldGained = gold, bossDamage = dealt) }
}

/** Unticks a side quest and takes back exactly what it paid. */
fun Tx.undoSideQuest(id: String) {
    val sq = s.sideQuests.firstOrNull { it.id == id && it.done } ?: return
    if (sq.xpGained > 0 || sq.goldGained > 0) {
        loseXp(sq.xpGained)
        refundGold(sq.goldGained)
        healBoss(sq.bossDamage)
        count(StatKey.SIDE_COMPLETED, -1)
        s = s.copy(daily = s.daily.copy(sideRewarded = (s.daily.sideRewarded - 1).coerceAtLeast(0)))
    }
    updateSide(id) { it.copy(done = false, xpGained = 0, goldGained = 0, bossDamage = 0) }
}

/** Deleting a finished side quest also removes its rewards, so create-tick-delete can't farm XP. */
fun Tx.removeSideQuest(id: String) {
    undoSideQuest(id)
    s = s.copy(sideQuests = s.sideQuests.filterNot { it.id == id })
}

// ── Custom definitions (Quest Forge) ──────────────────────────────────────────

fun Tx.saveCustomDef(def: QuestDef) {
    val exists = s.customDefs.any { it.id == def.id }
    s = s.copy(customDefs = if (exists) s.customDefs.map { if (it.id == def.id) def else it } else s.customDefs + def)
    if (!exists && content.questDefById[def.id] == null) count(StatKey.CUSTOM_QUESTS)
    syncWeekly()
}

fun Tx.deleteCustomDef(id: String) {
    s = s.copy(customDefs = s.customDefs.filterNot { it.id == id })
}

fun Tx.setDefEnabled(id: String, enabled: Boolean) {
    s = s.copy(disabledDefIds = if (enabled) s.disabledDefIds - id else s.disabledDefIds + id)
    syncWeekly() // switching a weekly mission back on starts a new trial week
}

// ── Mission stopwatch ─────────────────────────────────────────────────────────

fun Tx.startTimer(id: String) {
    val t = s.timers[id] ?: MissionTimer()
    if (!t.running) s = s.copy(timers = s.timers + (id to t.copy(runningSince = ctx.now)))
}

fun Tx.pauseTimer(id: String) {
    val t = s.timers[id] ?: return
    if (t.running) s = s.copy(timers = s.timers + (id to MissionTimer(0, t.elapsed(ctx.now))))
}

fun Tx.resetTimer(id: String) {
    s = s.copy(timers = s.timers - id)
}

private fun Tx.stopTimer(id: String, record: Boolean) {
    val t = s.timers[id] ?: return
    val q = s.allQuests.firstOrNull { it.id == id }
    val elapsed = t.elapsed(ctx.now)
    if (record && q != null && elapsed > 1000) {
        val rec = s.records[q.defId] ?: QuestRecord()
        val best = if (rec.bestMs == 0L) elapsed else minOf(rec.bestMs, elapsed)
        s = s.copy(records = s.records + (q.defId to rec.copy(bestMs = best)))
    }
    s = s.copy(timers = s.timers - id)
}

fun Tx.saveNote(defId: String, note: String) {
    val rec = s.records[defId] ?: QuestRecord()
    s = s.copy(records = s.records + (defId to rec.copy(note = note.take(500))))
}
