package com.lifup.app.system

import android.content.Context
import com.lifup.app.domain.PatchNotes
import com.lifup.app.domain.VersionNotes

/** The release notes bundled in the APK (assets/release-notes/<version>/<lang>.md, copied there by the build). */
object ReleaseNotes {
    private const val DIR = "release-notes"

    /** Every bundled version, newest first. */
    fun versions(context: Context): List<String> =
        PatchNotes.sorted(runCatching { context.assets.list(DIR)?.toList() }.getOrNull().orEmpty())

    /** One version's notes in [lang], else English; null when the version has neither. */
    fun read(context: Context, version: String, lang: String): VersionNotes? {
        val text = listOf(lang, "en").distinct().firstNotNullOfOrNull { l ->
            runCatching { context.assets.open("$DIR/$version/$l.md").use { it.readBytes().decodeToString() } }.getOrNull()
        } ?: return null
        return VersionNotes(version, PatchNotes.parse(text)).takeIf { it.lines.isNotEmpty() }
    }

    fun all(context: Context, lang: String): List<VersionNotes> = versions(context).mapNotNull { read(context, it, lang) }

    fun since(context: Context, seen: String?, current: String, lang: String): List<VersionNotes> =
        PatchNotes.sinceSeen(versions(context), seen, current).mapNotNull { read(context, it, lang) }
}
