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
