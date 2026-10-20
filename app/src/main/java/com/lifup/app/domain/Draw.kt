package com.lifup.app.domain

import kotlin.math.pow
import kotlin.random.Random

// ── Balanced daily draw ───────────────────────────────────────────────────────
//
// Drawn missions are picked by family, not uniformly: a family's chance doesn't grow with how
// many missions it has, each pick makes the same family less likely for the rest of the day
// (repeats stay possible), and the attributes the player focuses on weigh double.

enum class Attr { STR, AGI, INT, VIT }

/** Families the daily draw balances; each one mainly grows [attr]. */
enum class DrawGroup(val attr: Attr, val weight: Double) {
    STRENGTH(Attr.STR, 3.0),
    MOVEMENT(Attr.AGI, 2.0),
    MIND(Attr.INT, 3.0),
    HEALTH(Attr.VIT, 2.0),
    SELF_CONTROL(Attr.VIT, 2.0),
}

fun QuestDef.drawGroup(): DrawGroup = group ?: when {
    auto == AutoKind.STEPS || auto == AutoKind.WALK_DISTANCE -> DrawGroup.MOVEMENT
    else -> groupOf(type)
}

fun groupOf(type: QuestType): DrawGroup = when (type) {
    QuestType.TRAINING -> DrawGroup.STRENGTH
    QuestType.GPS -> DrawGroup.MOVEMENT
    QuestType.KNOWLEDGE, QuestType.FOCUS -> DrawGroup.MIND
    QuestType.FORBIDDEN, QuestType.LIMIT -> DrawGroup.SELF_CONTROL
}

/**
 * Picks up to [count] distinct definitions, balancing families as described above. Missions drawn
 * yesterday ([recent]) are less likely within their family, without changing the family's share;
 * [taken] are today's missions already in play, which count as picks for the repeat decay.
 */
fun drawBalanced(
    defs: List<QuestDef>, count: Int, focus: Set<Attr>, rng: Random,
    recent: Set<String> = emptySet(), taken: List<QuestDef> = emptyList(),
): List<QuestDef> {
    val left = defs.toMutableList()
    val picked = taken.groupingBy { it.drawGroup() }.eachCount().toMutableMap()
    val out = mutableListOf<QuestDef>()
    fun freshness(d: QuestDef) = if (d.id in recent) Rules.RECENT_WEIGHT else 1.0
    repeat(count.coerceAtMost(defs.size)) {
        val totals = left.groupBy { it.drawGroup() }.mapValues { (_, ds) -> ds.sumOf(::freshness) }
        val weights = left.map { d ->
            val g = d.drawGroup()
            val focusMult = if (g.attr in focus) Rules.FOCUS_WEIGHT else 1.0
            g.weight * focusMult * Rules.REPEAT_DECAY.pow(picked[g] ?: 0) * freshness(d) / totals.getValue(g)
        }
        var roll = rng.nextDouble() * weights.sum()
        val i = weights.indexOfFirst { w -> roll -= w; roll < 0 }.takeIf { it >= 0 } ?: weights.lastIndex
        val def = left.removeAt(i)
        out += def
        picked[def.drawGroup()] = (picked[def.drawGroup()] ?: 0) + 1
    }
    return out
}

fun Attributes.of(a: Attr) = when (a) {
    Attr.STR -> str
    Attr.AGI -> agi
    Attr.INT -> int
    Attr.VIT -> vit
}

/** "Catch up": the (up to 2) lowest attributes that are below the average; none while all are even. */
fun Attributes.lagging(): Set<Attr> {
    val avg = Attr.entries.sumOf { of(it) } / Attr.entries.size.toDouble()
    return Attr.entries.filter { of(it) < avg }.sortedBy { of(it) }.take(Rules.MAX_FOCUS_ATTRS).toSet()
}

/** The attributes whose families weigh more in today's draw. */
fun GameState.drawFocus(): Set<Attr> = if (settings.catchUp) player.attrXp.lagging() else settings.focusAttrs

/** The family shown for a quest: the one stamped when it was built, else its type's. */
fun Quest.family(): DrawGroup = group ?: groupOf(type)

/** The family a quest belongs to, from its definition when there is one. */
fun Tx.groupOf(q: Quest): DrawGroup =
    s.defOf(q.defId, content)?.drawGroup() ?: groupOf(q.type)
