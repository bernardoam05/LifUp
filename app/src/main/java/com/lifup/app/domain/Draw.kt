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

/** Picks up to [count] distinct definitions, balancing families as described above. */
fun drawBalanced(defs: List<QuestDef>, count: Int, focus: Set<Attr>, rng: Random): List<QuestDef> {
    val left = defs.toMutableList()
    val picked = mutableMapOf<DrawGroup, Int>()
    val out = mutableListOf<QuestDef>()
    repeat(count.coerceAtMost(defs.size)) {
        val sizes = left.groupingBy { it.drawGroup() }.eachCount()
        val weights = left.map { d ->
            val g = d.drawGroup()
            val focusMult = if (g.attr in focus) Rules.FOCUS_WEIGHT else 1.0
            g.weight * focusMult * Rules.REPEAT_DECAY.pow(picked[g] ?: 0) / sizes.getValue(g)
        }
        var roll = rng.nextDouble() * weights.sum()
        val i = weights.indexOfFirst { w -> roll -= w; roll < 0 }.takeIf { it >= 0 } ?: weights.lastIndex
        val def = left.removeAt(i)
        out += def
        picked[def.drawGroup()] = (picked[def.drawGroup()] ?: 0) + 1
    }
    return out
}

/** The family a quest belongs to, from its definition when there is one. */
fun Tx.groupOf(q: Quest): DrawGroup =
    s.defOf(q.defId, content)?.drawGroup() ?: groupOf(q.type)
