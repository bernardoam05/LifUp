package com.lifup.app.domain

/**
 * LifUp+: a one-time purchase with extras (looks, tools, comfort). It never sells progress: gold, XP, essences or
 * streaks are not for sale, and everything the game needs stays free.
 */
object PlusProducts {
    const val PLUS = "lifup_plus"
    /** Tips: consumable, change nothing in the game. */
    val TIPS = listOf("tip_2", "tip_5", "tip_10")
}

object PlusRules {
    const val SQUAD_SLOTS = 3
}

/** LifUp+: keeps the current squad in [slot]. */
fun Tx.saveSquad(slot: Int) {
    if (!s.plus || slot !in 0 until PlusRules.SQUAD_SLOTS || s.squad.isEmpty()) return
    val slots = (s.savedSquads + List(PlusRules.SQUAD_SLOTS) { emptyList<String>() }).take(PlusRules.SQUAD_SLOTS).toMutableList()
    slots[slot] = s.squad
    s = s.copy(savedSquads = slots)
}

/**
 * LifUp+: puts the squad in [slot] on. The usual rule still holds: an echo that joined today stays until tomorrow,
 * and those coming in now are locked until tomorrow too, so a saved squad can't be swapped in for one action.
 */
fun Tx.loadSquad(slot: Int) {
    val saved = s.savedSquads.getOrNull(slot)?.filter { s.owned(it) != null } ?: return
    if (!s.plus || saved.isEmpty()) return
    val stay = s.squad.filter { s.squadLocked(it) }
    val next = (stay + saved.filterNot { it in stay }).take(Rules.SQUAD_SIZE)
    s = s.copy(
        squad = next,
        // Those already in keep their date (or none); only newcomers are locked until tomorrow.
        squadSince = next.mapNotNull { id -> if (id in s.squad) s.squadSince[id]?.let { id to it } else id to s.day }.toMap(),
    )
}

/** What Google Play says the player owns. */
fun Tx.setPlus(owned: Boolean) {
    if (s.plus != owned) s = s.copy(plus = owned)
}

/** The day history as CSV (one row per closed day, newest last). */
fun GameState.daysCsv(): String = buildString {
    appendLine("day,done,total,perfect,passed,rest,penalty")
    dayLog.forEach { d -> appendLine("${d.day},${d.done},${d.total},${d.perfect},${d.passed},${d.rest},${d.penalty}") }
}

/** Each mission's lifetime record as CSV, by its title in [lang]. */
fun GameState.missionsCsv(content: Content, lang: String): String = buildString {
    appendLine("mission,done,total,rate")
    missionStats.entries.sortedByDescending { it.value.total }.forEach { (id, st) ->
        val title = (defOf(id, content)?.title?.text(lang) ?: id).replace("\"", "\"\"")
        appendLine("\"$title\",${st.done},${st.total},${"%.2f".format(java.util.Locale.ROOT, st.rate)}")
    }
}
