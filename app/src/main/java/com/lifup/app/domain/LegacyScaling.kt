package com.lifup.app.domain

import kotlin.math.roundToInt

// Until save version 7 targets grew with the player's level (plus ±10% adjustments); now each mission has its own steps.

/** Built-in missions that grew every 10 levels; the rest grew every 5. */
private val EVERY_10_LEVELS = setOf(
    "core_reading", "pool_meditate", "pool_pullups", "pool_stretching", "pool_deepwork", "pool_screen_limit", "pool_distraction_limit",
    "pool_mobility", "pool_stairs", "pool_hike", "pool_skill", "pool_stroll", "pool_bike", "pool_dance",
)

/** Built-in increases that changed along with it. */
private val OLD_AMOUNT = mapOf("core_pushups" to 2.0, "pool_plank" to 5.0, "pool_distraction_limit" to 0.1)

private fun oldAmount(def: QuestDef) = OLD_AMOUNT[def.id] ?: def.scalingAmount
private fun oldInterval(id: String) = if (id in EVERY_10_LEVELS) 10 else 5

/** The target [def] had at [level] with [adapt] old adjustment steps, from its old increase and cadence. */
private fun oldTarget(def: QuestDef, amount: Double, interval: Int, level: Int, adapt: Int): Double {
    val scaled = def.baseTarget + (level - 1) / interval.coerceAtLeast(1) * (if (def.descending) -amount else amount)
    val capped = if (def.descending) scaled else def.maxTarget?.let { scaled.coerceAtMost(it) } ?: scaled
    val adjustable = def.type != QuestType.FORBIDDEN && def.fromHour == null && def.baseTarget >= 2
    return if (!adjustable) capped else capped * (1 + (if (def.type == QuestType.LIMIT) -0.1 else 0.1) * adapt)
}

/** The step of [def] that lands closest to [target], without passing the cap. */
private fun nearestStep(def: QuestDef, target: Double): Int {
    var step = ((target - def.baseTarget) / def.scalingAmount * (if (def.descending) -1 else 1)).roundToInt().coerceAtLeast(Rules.PROG_MIN_STEP)
    while (step > 0 && def.targetAt(step - 1) == def.targetAt(step)) step--
    return step
}

/** Every mission starts at the step nearest the target it already had, so nobody gets a jump. */
internal fun Tx.migrateToMissionSteps() {
    val level = s.player.level
    val old = s.adapt
    // Edited built-ins still on their old level cadence take the new one; the player's own numbers stay.
    val customs = s.customDefs.map { d ->
        val built = content.questDefById[d.id]
        if (built != null && d.scalingAmount == oldAmount(built) && d.scalingInterval == oldInterval(d.id)) d.copy(scalingAmount = built.scalingAmount, scalingInterval = built.scalingInterval) else d
    }
    val steps = mutableMapOf<String, Adapt>()
    s.customDefs.zip(customs).forEach { (was, now) ->
        if (now.progresses()) steps[now.id] = Adapt(nearestStep(now, oldTarget(was, was.scalingAmount, was.scalingInterval, level, old[was.id]?.level ?: 0)))
    }
    content.quests.filter { it.id !in steps && customs.none { c -> c.id == it.id } && it.progresses() }.forEach { def ->
        steps[def.id] = Adapt(nearestStep(def, oldTarget(def, oldAmount(def), oldInterval(def.id), level, old[def.id]?.level ?: 0)))
    }
    val adapt = steps.filterValues { it.level != 0 }
    s = s.copy(customDefs = customs, adapt = adapt, quests = s.quests.map { it.copy(adapt = adapt[it.defId]?.level ?: 0) }, version = 7)
}
