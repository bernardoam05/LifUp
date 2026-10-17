package com.lifup.app.data

import java.io.File
import java.time.LocalDate

/**
 * Rolling daily copies of the save file: one per day (the latest of that day), the newest [keep] kept.
 * They guard against a corrupted save and are what Android's auto backup uploads.
 */
class Snapshots(private val dir: File, private val keep: Int = 7) {

    data class Entry(val day: String, val file: File)

    private var lastSavedAt = 0L

    fun list(): List<Entry> = dir.listFiles { f -> f.name.startsWith(PREFIX) && f.name.endsWith(".json") }
        .orEmpty()
        .map { Entry(it.name.removePrefix(PREFIX).removeSuffix(".json"), it) }
        .sortedByDescending { it.day }

    /** Saves today's copy at most every [minGapMs], then trims old days. */
    fun maybeSave(text: String, now: Long, day: LocalDate, minGapMs: Long = 10 * 60_000L) {
        if (now - lastSavedAt < minGapMs && File(dir, name(day)).exists()) return
        dir.mkdirs()
        val tmp = File(dir, name(day) + ".tmp")
        tmp.writeText(text)
        tmp.renameTo(File(dir, name(day)))
        lastSavedAt = now
        list().drop(keep).forEach { it.file.delete() }
    }

    private fun name(day: LocalDate) = "$PREFIX$day.json"

    companion object {
        private const val PREFIX = "state-"
    }
}
