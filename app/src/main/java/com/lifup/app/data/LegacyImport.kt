package com.lifup.app.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Base64
import com.lifup.app.domain.Attributes
import com.lifup.app.domain.Content
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.GameState
import com.lifup.app.domain.OwnedShadow
import com.lifup.app.domain.Player
import com.lifup.app.domain.QuestDef
import com.lifup.app.domain.QuestRank
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.Rigor
import com.lifup.app.domain.Rules
import com.lifup.app.domain.Settings
import com.lifup.app.domain.SideQuest
import com.lifup.app.domain.StatKey
import com.lifup.app.domain.plainText
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.longOrNull

/**
 * Reads progress saved by the old React Native app — either straight from its AsyncStorage database
 * (same package, installed over it) or from a pasted/exported backup — and maps it to the new state.
 */
object LegacyImport {
    private val ITEM_MAP = mapOf(
        "system_pass" to "system_pass",
        "relogio_ampulheta" to "relogio_ampulheta",
        "lagrima_purificacao" to "lagrima_purificacao",
        "shadow_essence" to "essencia_sombria",
        "loot_box" to "bau_cacador",
        "quebra_feiticos" to "quebra_feiticos",
        "xp_crystal" to "cristal_xp",
    )

    /** Raw JSON of the old persisted store, if the RN database is still on this device. */
    fun readAsyncStorage(context: Context): String? {
        val db = context.getDatabasePath("RKStorage")
        if (!db.exists()) return null
        return runCatching {
            SQLiteDatabase.openDatabase(db.path, null, SQLiteDatabase.OPEN_READONLY).use { sql ->
                sql.rawQuery("SELECT value FROM catalystLocalStorage WHERE key IN ('lifup-v3','solo-leveling-v3')", null).use { c ->
                    if (c.moveToFirst()) c.getString(0) else null
                }
            }
        }.getOrNull()
    }

    /** Accepts plain JSON or the old base64 backup string. */
    fun decodeBackup(text: String): JsonObject? {
        val trimmed = text.trim()
        parse(trimmed)?.let { return it }
        val bytes = runCatching { Base64.decode(trimmed, Base64.DEFAULT) }.getOrNull() ?: return null
        return parse(bytes.decodeToString()) ?: parse(String(bytes, Charsets.ISO_8859_1))
    }

    private fun parse(text: String): JsonObject? = runCatching {
        val obj = Json.parseToJsonElement(text).jsonObject
        (obj["state"] as? JsonObject) ?: obj
    }.getOrNull()?.takeIf { it.containsKey("player") }

    fun toState(old: JsonObject, content: Content): GameState {
        val p = old.obj("player")
        val stats = old.obj("statistics")
        val system = old.obj("system")
        val oldSettings = old.obj("settings")

        var goldBack = 0
        val shadows = p.arr("shadows").mapNotNull { el ->
            val id = (el as? JsonPrimitive)?.content ?: el.obj().str("id") ?: return@mapNotNull null
            val level = el.obj().int("level") ?: 1
            if (content.shadowById.containsKey(id)) OwnedShadow(id, level.coerceAtLeast(1), el.obj().int("copies") ?: 0)
            else { goldBack += 100 * level; null }
        }.distinctBy { it.id }
        val ownedIds = shadows.map { it.id }.toSet()

        val inventory = buildMap {
            p.arr("inventory").forEach { el ->
                val id = ITEM_MAP[el.obj().str("itemId")] ?: return@forEach
                val q = el.obj().int("quantity") ?: 0
                if (q > 0) put(id, (get(id) ?: 0) + q)
            }
        }

        val difficulty = oldSettings.str("missionDifficulty")
        val settings = Settings(
            rigor = when (difficulty) { "easy" -> Rigor.EASY; "hard" -> Rigor.HARD; else -> Rigor.NORMAL },
            dailyPoolOverride = if (difficulty == "custom") oldSettings.int("customDailyMissions") else null,
            blockOnPenalty = oldSettings.bool("autoBlockApps") ?: false,
            sidePenalize = oldSettings.bool("sideQuestPenalize") ?: false,
            sound = oldSettings.bool("sound") ?: true,
            notifications = oldSettings.bool("notifications") ?: true,
            pomodoroWork = oldSettings.int("pomodoroWorkMins") ?: 25,
            pomodoroBreak = oldSettings.int("pomodoroBreakMins") ?: 5,
            pomodoroRounds = (oldSettings.int("pomodoroRounds") ?: 4).coerceAtLeast(1),
            focusMinutes = oldSettings.obj("lastFocusDuration").let { (it.int("hours") ?: 0) * 60 + (it.int("minutes") ?: 25) }.coerceAtLeast(5),
            blockedApps = system.arr("blockedApps").mapNotNull { (it as? JsonPrimitive)?.content },
        )

        val builtIn = content.quests.map { it.id }.toSet()
        val customDefs = old.arr("questDictionary").mapNotNull { el -> customDef(el.obj(), builtIn) }

        val today = java.time.LocalDate.now().toString()
        val sideQuests = old.arr("sideQuests").mapNotNull { el ->
            val o = el.obj()
            if (o.bool("done") == true) return@mapNotNull null
            SideQuest(o.str("id") ?: return@mapNotNull null, o.str("title") ?: return@mapNotNull null, today, QuestRank.E, 20, 5)
        }

        val counters = buildMap<StatKey, Long> {
            fun put(key: StatKey, v: Long?) { if (v != null && v > 0) put(key, v) }
            put(StatKey.QUESTS_COMPLETED, stats.long("totalCompleted"))
            put(StatKey.PERFECT_DAYS, stats.long("perfectDays"))
            put(StatKey.FOCUS_MINUTES, stats.long("totalFocusMinutes"))
            put(StatKey.SIDE_COMPLETED, stats.long("totalSideCompleted"))
            put(StatKey.POMODORO_CYCLES, stats.long("totalPomodoroSessions"))
            put(StatKey.GOLD_SPENT, stats.long("totalGoldSpent"))
            put(StatKey.BOSSES_DEFEATED, system.long("bossesDefeated"))
        }

        val level = (p.int("level") ?: 1).coerceAtLeast(1)
        return GameState(
            onboarded = true,
            player = Player(
                name = p.str("name")?.takeIf { it != "Hunter" }.orEmpty(),
                level = level,
                xp = (p.int("xp") ?: 0).coerceIn(0, Rules.xpForLevel(level) - 1),
                gold = (p.int("gold") ?: 0) + goldBack,
                attrXp = Attributes(p.int("strXp") ?: 0, p.int("agiXp") ?: 0, p.int("intXp") ?: 0, p.int("vitXp") ?: 0),
                streak = p.int("currentStreak") ?: 0,
                bestStreak = maxOf(p.int("highestStreak") ?: 0, stats.int("maxStreakReached") ?: 0),
            ),
            shadows = shadows,
            squad = p.arr("activeShadowIds").mapNotNull { (it as? JsonPrimitive)?.content }.filter { it in ownedIds }.take(Rules.SQUAD_SIZE),
            inventory = inventory,
            settings = settings,
            customDefs = customDefs,
            sideQuests = sideQuests,
            counters = counters,
        )
    }

    private fun customDef(o: JsonObject, builtIn: Set<String>): QuestDef? {
        val id = o.str("id") ?: return null
        val kind = when (o.str("type")) { "core" -> DefKind.CORE; "pool" -> DefKind.POOL; else -> return null }
        if (id in builtIn) return null
        val pomodoro = o.str("questType") == "pomodoro"
        val type = when (o.str("questType")) {
            "training" -> QuestType.TRAINING; "knowledge" -> QuestType.KNOWLEDGE; "gps" -> QuestType.GPS
            "forbidden" -> QuestType.FORBIDDEN; "limit" -> QuestType.LIMIT; else -> QuestType.FOCUS
        }
        val base = o.double("baseTarget") ?: 1.0
        return QuestDef(
            id = "custom_$id",
            kind = kind,
            type = type,
            title = plainText(o.str("title") ?: id),
            description = plainText(o.str("description").orEmpty()),
            baseTarget = if (pomodoro) base * 25 else base,
            scalingAmount = o.double("scalingAmount") ?: o.double("scalingPerLevel") ?: 0.0,
            scalingInterval = (o.int("scalingInterval") ?: 1).coerceAtLeast(1),
            unit = if (pomodoro) "min" else o.str("unit").orEmpty(),
            baseXp = o.int("baseXP") ?: 50,
            baseGold = o.int("baseGold") ?: 10,
            descending = o.bool("isDescending") ?: false,
            daysOfWeek = o.arr("daysOfWeek").mapNotNull { (it as? JsonPrimitive)?.intOrNull?.let { d -> if (d == 0) 7 else d } }.ifEmpty { null },
        )
    }

    private fun JsonElement.obj(): JsonObject = this as? JsonObject ?: JsonObject(emptyMap())
    private fun JsonObject.obj(key: String) = (this[key] as? JsonObject) ?: JsonObject(emptyMap())
    private fun JsonObject.arr(key: String) = (this[key] as? JsonArray) ?: JsonArray(emptyList())
    private fun JsonObject.prim(key: String) = this[key] as? JsonPrimitive
    private fun JsonObject.str(key: String) = prim(key)?.takeIf { it.isString }?.content
    private fun JsonObject.int(key: String) = prim(key)?.doubleOrNull?.toInt()
    private fun JsonObject.long(key: String) = prim(key)?.longOrNull ?: prim(key)?.doubleOrNull?.toLong()
    private fun JsonObject.double(key: String) = prim(key)?.doubleOrNull
    private fun JsonObject.bool(key: String) = prim(key)?.booleanOrNull
}
