package com.lifup.app.data

import com.lifup.app.domain.Content
import com.lifup.app.domain.GameState
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.jsonObject

@Serializable
private data class BackupFile(val lifup: Int = 2, val exportedAt: Long, val state: GameState)

/** JSON backup files. Import also understands the old app's backup string. */
object Backup {
    fun export(state: GameState, now: Long = System.currentTimeMillis()): String =
        Content.json.encodeToString(BackupFile.serializer(), BackupFile(exportedAt = now, state = state))

    fun import(text: String, content: Content): GameState? {
        runCatching {
            val obj = Content.json.parseToJsonElement(text.trim()).jsonObject
            if (obj.containsKey("lifup")) return Content.json.decodeFromString(BackupFile.serializer(), text.trim()).state
        }
        return LegacyImport.decodeBackup(text)?.let { LegacyImport.toState(it, content) }
    }
}
