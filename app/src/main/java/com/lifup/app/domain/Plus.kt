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
    const val MAX_BLOCK_WINDOWS = 6
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

/**
 * LifUp+: hours when the apps picked for focus are blocked without a session (bedtime, work hours). [days] are ISO
 * days of week (1 = Monday) on which the window STARTS; [from] and [to] are minutes after midnight, and a window
 * whose end is not after its start runs past midnight into the next day.
 */
@kotlinx.serialization.Serializable
data class BlockWindow(val days: List<Int>, val from: Int, val to: Int)

private fun BlockWindow.span(day: java.time.LocalDate, zone: java.time.ZoneId): Pair<Long, Long>? {
    if (day.dayOfWeek.value !in days) return null
    val start = day.atTime(from / 60, from % 60).atZone(zone).toInstant().toEpochMilli()
    val endDay = if (to > from) day else day.plusDays(1)
    val end = endDay.atTime(to / 60, to % 60).atZone(zone).toInstant().toEpochMilli()
    return start to end
}

private fun GameState.windowSpans(now: Long, zone: java.time.ZoneId, daysAhead: Long): List<Pair<Long, Long>> {
    if (!plus || settings.blockedApps.isEmpty()) return emptyList()
    val today = java.time.Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    return (-1L..daysAhead).flatMap { d -> settings.blockWindows.mapNotNull { it.span(today.plusDays(d), zone) } }
}

/** When the scheduled block running now ends (windows that touch are joined), or null if none is running. */
fun GameState.scheduledBlockUntil(now: Long, zone: java.time.ZoneId = java.time.ZoneId.systemDefault()): Long? {
    val spans = windowSpans(now, zone, 8).sortedBy { it.first }
    var end: Long? = null
    for ((a, b) in spans) {
        if (end == null) { if (now in a until b) end = b }
        else if (a <= end) end = maxOf(end, b)
    }
    return end
}

/** The next moment a scheduled block starts or ends, for the alarm that starts or stops the blocker. */
fun GameState.nextBlockBoundary(now: Long, zone: java.time.ZoneId = java.time.ZoneId.systemDefault()): Long? =
    windowSpans(now, zone, 8).flatMap { listOf(it.first, it.second) }.filter { it > now }.minOrNull()

fun Tx.addBlockWindow(w: BlockWindow) {
    if (w.days.isEmpty() || w.from !in 0 until 1440 || w.to !in 0 until 1440 || w.from == w.to) return
    updateSettings { it.copy(blockWindows = (it.blockWindows + w.copy(days = w.days.distinct().sorted())).take(PlusRules.MAX_BLOCK_WINDOWS)) }
}

fun Tx.removeBlockWindow(index: Int) = updateSettings { it.copy(blockWindows = it.blockWindows.filterIndexed { i, _ -> i != index }) }

/** LifUp+ skins: the whole Core redrawn in another material, on every form and face. Looks only. */
@kotlinx.serialization.Serializable
enum class CorePaint { AURORA, SHADOW, CRYSTAL, GHOST, LAVA, GALAXY }

/** Puts on a LifUp+ skin, or back to the rank colours with null. */
fun Tx.wearPaint(paint: CorePaint?) {
    if (paint != null && !s.plus) return
    updateSettings { it.copy(corePaint = paint) }
}

/** The skin actually shown: none without LifUp+ (it comes back if LifUp+ does). */
val GameState.shownPaint: CorePaint? get() = settings.corePaint.takeIf { plus }
