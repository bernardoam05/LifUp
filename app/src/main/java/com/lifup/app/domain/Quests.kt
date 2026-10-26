package com.lifup.app.domain

import java.time.LocalDate
import kotlin.math.roundToInt
import kotlin.random.Random

fun roundTarget(value: Double, unit: String): Double = when (unit) {
    "km" -> (value * 10).roundToInt() / 10.0
    "h" -> (value * 4).roundToInt() / 4.0
    else -> value.roundToInt().toDouble()
}

/** [level] sets the reward; the target follows the mission's own progression [step]. [day] picks the day's prompt. */
fun buildQuest(def: QuestDef, level: Int, origin: QuestOrigin, id: String = def.id, step: Int = 0, day: LocalDate? = null): Quest {
    val at = if (def.progresses()) step else 0
    val reward = def.rewardAt(at)
    val min = if (def.type == QuestType.FORBIDDEN || def.type == QuestType.LIMIT) 0.0 else 1.0
    return Quest(
        id = id,
        defId = def.id,
        origin = origin,
        type = def.type,
        title = def.title,
        description = def.description,
        unit = def.unit,
        target = roundTarget(def.targetAt(at).coerceAtLeast(min), def.unit).coerceAtLeast(min),
        xp = (def.baseXp * Rules.xpMultiplier(level) * reward).roundToInt(),
        gold = (def.baseGold * Rules.tierMultiplier(level) * reward).roundToInt(),
        rank = Rules.questRank(def.baseXp),
        auto = def.auto,
        pomodoro = def.pomodoro,
        fromHour = def.fromHour,
        perWeek = def.perWeek.takeIf { def.isWeekly() },
        prompt = day?.let { def.promptOn(it) },
        group = def.drawGroup(),
        adapt = at,
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

/** The "how to" for a mission or a boss challenge, looked up live so content updates reach old saves. */
fun GameState.tipFor(q: Quest, content: Content): L10n? = defOf(q.defId, content)?.tip ?: content.bossById[q.defId]?.let { def ->
    if (q.id == boss?.second?.id) def.second?.tip else def.tip
}

fun GameState.isEditedBuiltIn(id: String, content: Content) = content.questDefById[id] != null && customDefs.any { it.id == id }

/** A mission measured by the phone only counts when the phone can measure it; otherwise it would pass by itself. */
private fun QuestDef.measurable(s: GameState) = when (auto) {
    AutoKind.SCREEN_TIME -> s.screenMeasurable
    AutoKind.DISTRACTION_TIME -> s.screenMeasurable && s.settings.blockedApps.isNotEmpty()
    else -> true
}

/** Whether the player has this mission on: optional built-in ones start off, every other one starts on. */
fun GameState.isOn(def: QuestDef, content: Content): Boolean =
    if (content.questDefById[def.id]?.optional ?: def.optional) def.id in enabledDefIds else def.id !in disabledDefIds

fun GameState.availableDefs(content: Content): List<QuestDef> {
    val edited = customDefs.associateBy { it.id }
    // Flags come from the content, so an edited copy saved before a mission was retired or made optional follows it too.
    return (content.quests.filterNot { it.retired }.map { edited[it.id] ?: it } + customDefs.filter { content.questDefById[it.id] == null }).filter {
        isOn(it, content) && it.measurable(this)
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
        // Automatic counts stop at the day's ceiling; a count set by hand is the player's call.
        ((if (state.settings.dailyPoolOverride != null) state.drawnCount() else minOf(state.drawnCount(), Rules.MAX_DAY_MISSIONS - core.size)) - due).coerceAtLeast(0),
        state.drawFocus(),
        Random(seed.toLong() xor state.seed),
        recent = if (state.day == date.minusDays(1).toString()) state.dailyQuests.map { it.defId }.toSet() else emptySet(),
        // The fixed missions are part of the day too: a fixed strength mission makes another one less likely.
        taken = core,
        balanced = !state.settings.randomDraw,
    )
    return (core + pool).map { buildQuest(it, level, QuestOrigin.DAILY, step = state.stepOf(it.id), day = date) } +
        weekly.map { weeklyQuest(it, state.weekly[it.id], date, level, state.stepOf(it.id)) }
}

/** The same prompt all day, a different one most days. */
fun QuestDef.promptOn(day: LocalDate): L10n? = prompts?.takeIf { it.isNotEmpty() }?.let { it[Math.floorMod(day.toEpochDay() + id.hashCode(), it.size.toLong()).toInt()] }

internal fun Tx.updateQuestProgress(id: String, value: Double) = updateQuest(id) { it.copy(progress = value) }

private fun Tx.updateQuest(id: String, f: (Quest) -> Quest) {
    s = when {
        s.quests.any { it.id == id } -> s.copy(quests = s.quests.map { if (it.id == id) f(it) else it })
        s.penalty.quests.any { it.id == id } -> s.copy(penalty = s.penalty.copy(quests = s.penalty.quests.map { if (it.id == id) f(it) else it }))
        s.boss?.challenge?.id == id -> s.copy(boss = s.boss!!.copy(challenge = f(s.boss!!.challenge)))
        s.boss?.second?.id == id -> s.copy(boss = s.boss!!.copy(second = f(s.boss!!.second!!)))
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
    s = s.copy(timers = s.timers - id)
}

private fun Tx.completeMission(q: Quest) {
    val doubled = s.doubleXpNext
    if (doubled) s = s.copy(doubleXpNext = false)
    var xp = 0
    var dealt = 0
    var gold = 0
    val passives = s.passives(content, ctx.now)
    val squad = squadDuring {
        val share = if (q.origin == QuestOrigin.EXTRA) Rules.EXTRA_BOSS_SHARE else 1.0
        gainXpTracked(if (doubled) q.xp * 2 else q.xp, q.family(), share, passives.missionXpBonus(s, q, ctx.hour)).let { (x, d) -> xp = x; dealt = d }
        gold = gainGold(q.gold, extra = passives.missionGoldBonus(s, q))
    }
    gainAttributes(groupOf(q))
    updateQuest(q.id) { it.copy(status = QuestStatus.DONE, progress = maxOf(it.progress, it.target), xpGained = xp, goldGained = gold, bossDamage = dealt, squad = squad) }
    count(StatKey.QUESTS_COMPLETED)
    if (q.origin == QuestOrigin.EXTRA) count(StatKey.EXTRA_COMPLETED)
    if (q.fromHour != null) count(StatKey.BEDTIMES_KEPT)
    when (ctx.hour) {
        in 0..3 -> count(StatKey.NIGHT_QUESTS)
        // An early riser's morning, not a night owl's 4 a.m.
        in 5..7 -> count(StatKey.EARLY_QUESTS)
    }
    val rec = s.records[q.defId] ?: QuestRecord()
    s = s.copy(records = s.records + (q.defId to rec.copy(count = rec.count + 1)))
    tallyWeekly(q, +1)
    rollMissionDrop()
}

private fun Tx.rollMissionDrop() {
    val luck = 1 + s.passives(content, ctx.now).luck
    val roll = ctx.rng.nextDouble()
    val item = when {
        roll < Rules.MISSION_ESSENCE_CHANCE * luck -> "essencia_sombria"
        roll < Rules.MISSION_DROP_CHANCE * luck -> "bau_cacador"
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
    squadAdded(SquadGain() - q.squad)
    count(StatKey.QUESTS_COMPLETED, -1)
    if (q.origin == QuestOrigin.EXTRA) count(StatKey.EXTRA_COMPLETED, -1)
    if (q.fromHour != null) count(StatKey.BEDTIMES_KEPT, -1)
    tallyWeekly(q, -1)
    updateQuest(id) {
        // Tracked minutes/km stay (they were really done); automatic missions restart and stop auto-filling.
        val tracked = it.auto == null && (it.type == QuestType.FOCUS || it.type == QuestType.GPS)
        val progress = if (tracked) it.progress.coerceAtMost(it.target * 0.99) else 0.0
        it.copy(status = QuestStatus.OPEN, xpGained = 0, goldGained = 0, bossDamage = 0, squad = SquadGain(), progress = progress, autoOff = it.auto != null)
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

/**
 * Counter progress for limit and manual quests. Manual ones stop at the target; with [autoComplete]
 * reaching it finishes the quest, otherwise the player confirms with "Complete".
 */
fun Tx.setProgress(id: String, value: Double, autoComplete: Boolean = true) {
    val q = s.allQuests.firstOrNull { it.id == id } ?: return
    if (q.status != QuestStatus.OPEN) return
    val counted = q.type != QuestType.LIMIT && q.type != QuestType.FORBIDDEN
    updateQuest(id) { it.copy(progress = if (counted) value.coerceIn(0.0, q.target) else value.coerceAtLeast(0.0)) }
    if (counted && autoComplete && value >= q.target) completeQuest(id)
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

/** Whether it still makes sense to hand this mission out mid-day at [hour]. */
fun QuestDef.offeredAt(hour: Int) = untilHour == null || hour < untilHour

/** Free swaps a day: one, plus one with a swapping echo in the squad. */
fun GameState.freeSwaps(content: Content, now: Long) = Rules.FREE_SWAPS_PER_DAY + passives(content, now).extraSwaps

/** Swap an open daily pool mission. The free swaps first, then a Swap Scroll. */
fun Tx.swapQuest(id: String): Boolean {
    val q = s.dailyQuests.firstOrNull { it.id == id } ?: return false
    val def = s.defOf(q.defId, content) ?: return false
    if (q.status != QuestStatus.OPEN || def.kind != DefKind.POOL) return false
    val free = s.daily.swapsUsed < s.freeSwaps(content, ctx.now)
    if (!free && s.items("pergaminho_troca") == 0) return false
    val used = s.quests.map { it.defId }.toSet()
    val replacement = drawOne(s.availableDefs(content).filter { it.kind == DefKind.POOL && it.id !in used && it.offeredAt(ctx.hour) }) ?: return false
    if (free) s = s.copy(daily = s.daily.copy(swapsUsed = s.daily.swapsUsed + 1))
    else { addItem("pergaminho_troca", -1); count(StatKey.ITEMS_USED) }
    s = s.copy(quests = s.quests.map { if (it.id == id) buildQuest(replacement, s.player.level, QuestOrigin.DAILY, step = s.stepOf(replacement.id), day = ctx.today) else it })
    s = s.copy(timers = s.timers - id)
    return true
}

/** One more mission for today, balanced against the families already in today's list. */
private fun Tx.drawOne(defs: List<QuestDef>): QuestDef? =
    drawBalanced(defs, 1, s.drawFocus(), ctx.rng, taken = s.quests.mapNotNull { s.defOf(it.defId, content) }, balanced = !s.settings.randomDraw).firstOrNull()

/** Extras come one at a time: the next one only once the last is done, so they can't be cherry-picked. */
fun GameState.canAddExtra() = allDailyDone() && daily.extrasAdded < Rules.MAX_EXTRAS_PER_DAY && !extraOpen()

fun GameState.extraOpen() = extraQuests.any { it.status == QuestStatus.OPEN }

fun Tx.addExtraQuest(): Boolean {
    if (!s.canAddExtra()) return false
    val used = s.quests.map { it.defId }.toSet()
    val def = drawOne(s.availableDefs(content).filter { it.kind == DefKind.POOL && it.id !in used && it.type != QuestType.FORBIDDEN && it.type != QuestType.LIMIT && it.offeredAt(ctx.hour) })
        ?: return false
    val n = s.daily.extrasAdded + 1
    s = s.copy(
        quests = s.quests + buildQuest(def, s.player.level, QuestOrigin.EXTRA, "extra_${n}_${def.id}", s.stepOf(def.id), ctx.today),
        daily = s.daily.copy(extrasAdded = n),
    )
    return true
}

// ── Side quests ───────────────────────────────────────────────────────────────

/** Every side quest pays the same, growing with level like missions, so re-adding one can't fish for more. */
fun Tx.addSideQuest(title: String) {
    if (title.isBlank()) return
    val level = s.player.level
    val xp = (Rules.SIDE_XP * Rules.xpMultiplier(level)).roundToInt()
    val gold = (Rules.SIDE_GOLD * Rules.tierMultiplier(level)).roundToInt()
    s = s.copy(sideQuests = s.sideQuests + SideQuest("side_${s.nextId}", title.trim(), ctx.todayKey, QuestRank.E, xp, gold))
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
    var xp = 0
    var gold = 0
    // Side quests don't hurt the boss: it falls to the game's own missions.
    val squad = squadDuring {
        xp = gainXp(sq.xp, hitsBoss = false)
        gold = gainGold(sq.gold)
    }
    gainAttributes(null)
    count(StatKey.SIDE_COMPLETED)
    s = s.copy(daily = s.daily.copy(sideRewarded = s.daily.sideRewarded + 1))
    updateSide(id) { it.copy(done = true, xpGained = xp, goldGained = gold, squad = squad) }
}

/** Unticks a side quest and takes back exactly what it paid. */
fun Tx.undoSideQuest(id: String) {
    val sq = s.sideQuests.firstOrNull { it.id == id && it.done } ?: return
    if (sq.xpGained > 0 || sq.goldGained > 0) {
        loseXp(sq.xpGained)
        refundGold(sq.goldGained)
        healBoss(sq.bossDamage)
        squadAdded(SquadGain() - sq.squad)
        count(StatKey.SIDE_COMPLETED, -1)
        s = s.copy(daily = s.daily.copy(sideRewarded = (s.daily.sideRewarded - 1).coerceAtLeast(0)))
    }
    updateSide(id) { it.copy(done = false, xpGained = 0, goldGained = 0, bossDamage = 0, squad = SquadGain()) }
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
    s = if (content.questDefById[id]?.optional == true) {
        s.copy(enabledDefIds = if (enabled) s.enabledDefIds + id else s.enabledDefIds - id)
    } else {
        s.copy(disabledDefIds = if (enabled) s.disabledDefIds - id else s.disabledDefIds + id)
    }
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

fun Tx.saveNote(defId: String, note: String) {
    val rec = s.records[defId] ?: QuestRecord()
    s = s.copy(records = s.records + (defId to rec.copy(note = note.take(500))))
}
