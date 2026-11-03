package com.lifup.app.domain

/**
 * Release notes as the app shows them. The files live in release-notes/<version>/<lang>.md, one change per
 * line starting with "- ", optionally tagged "- [new]", "- [fix]" or "- [tweak]" for the icon it gets.
 */
enum class NoteKind { NEW, FIX, TWEAK, OTHER }

/** One change: [lead] is its first sentence (shown bold) and [rest] what follows, if anything. */
data class NoteLine(val kind: NoteKind, val lead: String, val rest: String)

data class VersionNotes(val version: String, val lines: List<NoteLine>)

object PatchNotes {
    private val TAG = Regex("""^\[(new|fix|tweak)]\s*""", RegexOption.IGNORE_CASE)
    private val VERSION = Regex("""^\d+\.\d+\.\d+$""")

    fun isVersion(name: String) = VERSION.matches(name)

    fun parse(text: String): List<NoteLine> = text.lines().map { it.trim() }.filter { it.isNotEmpty() }.map { raw ->
        val body = raw.removePrefix("- ").removePrefix("* ").trim()
        val tag = TAG.find(body)
        val kind = when (tag?.groupValues?.get(1)?.lowercase()) {
            "new" -> NoteKind.NEW
            "fix" -> NoteKind.FIX
            "tweak" -> NoteKind.TWEAK
            else -> NoteKind.OTHER
        }
        val text = if (tag != null) body.substring(tag.range.last + 1) else body
        val (lead, rest) = split(text)
        NoteLine(kind, lead, rest)
    }

    /** The first sentence, when it is short enough to read as a headline; otherwise the whole line stays plain. */
    private fun split(text: String): Pair<String, String> {
        val end = Regex("""[.:!?](\s|$)""").find(text)?.range?.first ?: return text to ""
        if (end > 90 || end == text.length - 1) return text to ""
        return text.substring(0, end + 1) to text.substring(end + 1).trim()
    }

    /** Newest first. */
    fun sorted(versions: Collection<String>): List<String> = versions.filter(::isVersion).sortedWith { a, b -> compare(b, a) }

    fun compare(a: String, b: String): Int {
        val x = a.split('.').map { it.toIntOrNull() ?: 0 }
        val y = b.split('.').map { it.toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(x.size, y.size)) {
            val d = x.getOrElse(i) { 0 }.compareTo(y.getOrElse(i) { 0 })
            if (d != 0) return d
        }
        return 0
    }

    /**
     * The versions to show after an update to [current]: every one newer than [seen] up to [current], so a skipped
     * release isn't missed; only [current] when nothing was seen before. Newest first.
     */
    fun sinceSeen(all: Collection<String>, seen: String?, current: String): List<String> =
        sorted(all).filter { compare(it, current) <= 0 && (if (seen == null) it == current else compare(it, seen) > 0) }
}
