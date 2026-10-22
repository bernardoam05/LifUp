package com.lifup.app.domain

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Localized text keyed by language code ("pt", "en", ...). Custom user content uses a single "_" key. */
typealias L10n = Map<String, String>

fun L10n.text(lang: String): String =
    this[lang] ?: this["en"] ?: this["pt"] ?: this["_"] ?: values.firstOrNull().orEmpty()

fun plainText(text: String): L10n = mapOf("_" to text)

@Serializable
enum class QuestType { TRAINING, KNOWLEDGE, FOCUS, GPS, FORBIDDEN, LIMIT }

@Serializable
enum class DefKind { CORE, POOL, PENALTY, PORTAL }

/** Sources that fill a quest's progress on their own. */
@Serializable
enum class AutoKind { STEPS, WALK_DISTANCE, SCREEN_TIME, DISTRACTION_TIME }

@Serializable
data class QuestDef(
    val id: String,
    val kind: DefKind,
    val type: QuestType,
    val title: L10n,
    val description: L10n,
    val baseTarget: Double,
    /** What one progression step adds to the target (or takes off a limit); 0 = a fixed target. */
    val scalingAmount: Double = 0.0,
    /** Keeps needed for a step (weeks met, for weekly missions). */
    val scalingInterval: Int = 1,
    val unit: String = "",
    val baseXp: Int,
    val baseGold: Int,
    val descending: Boolean = false,
    /** ISO days of week (1 = Monday … 7 = Sunday); null = every day. */
    val daysOfWeek: List<Int>? = null,
    val auto: AutoKind? = null,
    /** Focus missions done in Pomodoro cycles instead of one straight timer. */
    val pomodoro: Boolean = false,
    /** Can only be completed from this hour until midnight (e.g. bedtime check-ins). */
    val fromHour: Int? = null,
    /** Too late to start from this hour on (morning or all-day missions): not handed out as an extra or a swap. */
    val untilHour: Int? = null,
    /** Fixed missions only: done this many times a week on any days, instead of every day. */
    val perWeek: Int? = null,
    /** Family for the daily draw and attribute growth; null = from the type. */
    val group: DrawGroup? = null,
    /** The comfortable top: a ceiling, or the floor for limits. Past it, steps come at half pace up to [peakTarget]. */
    val maxTarget: Double? = null,
    /** The hardest the target gets, for people who outgrow [maxTarget]; null = stop at [maxTarget]. */
    val peakTarget: Double? = null,
    /** Rotating suggestions for open-ended missions; one is picked per day. */
    val prompts: List<L10n>? = null,
    /** How to go about it, for missions where that isn't obvious. */
    val tip: L10n? = null,
)

@Serializable
data class Season(val from: String, val to: String)

@Serializable
data class BossDef(
    val id: String,
    val rank: String,
    val minLevel: Int,
    val type: QuestType,
    val target: Double,
    val unit: String,
    val baseXp: Int,
    val baseGold: Int,
    val title: L10n,
    val description: L10n,
    val shadowId: String,
    val season: Season? = null,
    /** How to go about the challenge. */
    val tip: L10n? = null,
)

@Serializable
enum class ShadowRank { NORMAL, ELITE, KNIGHT, COMMANDER, MARSHAL }

@Serializable
enum class ShadowClass { BEAST, UNDEAD, MAGE, WARRIOR, TANK, ASSASSIN, ELEMENTAL, ANCIENT, CONSTRUCT, SPIRIT, ARTISAN, EXPLORER }

@Serializable
enum class Passive {
    XP_BOOST, GOLD_BOOST, TRAINING_XP, MIND_XP, EXPLORER_XP, BOSS_DAMAGE, PENALTY_REDUCE,
    PENALTY_IMMUNITY, STREAK_PROTECT, SHOP_DISCOUNT, FOCUS_MASTERY, DAILY_BONUS, SHADOW_LUCK, ALL_BOOST,
    /** XP that grows with the streak, full at [Rules.STREAK_XP_FULL_DAYS]. */
    STREAK_XP,
    /** More XP and gold from portals. */
    PORTAL_BOOST,
    /** One more free swap a day. */
    EXTRA_SWAP,
}

/** What an echo's passive is about: growth, wealth, combat, protection, or focus and fortune. */
enum class PowerKind { GROWTH, WEALTH, COMBAT, PROTECTION, FORTUNE }

fun Passive.kind(): PowerKind = when (this) {
    Passive.XP_BOOST, Passive.TRAINING_XP, Passive.MIND_XP, Passive.EXPLORER_XP, Passive.DAILY_BONUS, Passive.STREAK_XP -> PowerKind.GROWTH
    Passive.GOLD_BOOST, Passive.SHOP_DISCOUNT, Passive.ALL_BOOST -> PowerKind.WEALTH
    Passive.BOSS_DAMAGE -> PowerKind.COMBAT
    Passive.PENALTY_REDUCE, Passive.PENALTY_IMMUNITY, Passive.STREAK_PROTECT -> PowerKind.PROTECTION
    Passive.FOCUS_MASTERY, Passive.SHADOW_LUCK, Passive.PORTAL_BOOST, Passive.EXTRA_SWAP -> PowerKind.FORTUNE
}

/** The amplifier boosts every other passive, so it belongs to every kind. */
fun Passive.isKind(k: PowerKind) = this == Passive.ALL_BOOST || kind() == k

@Serializable
enum class SourceType { EXTRACTION, SHOP, ACHIEVEMENT, STREAK, BOSS, LEVEL }

@Serializable
data class ShadowSource(val type: SourceType, val bossId: String? = null, val level: Int? = null)

@Serializable
data class ShadowDef(
    val id: String,
    val rank: ShadowRank,
    val shadowClass: ShadowClass,
    val passive: Passive,
    val source: ShadowSource,
    val name: L10n,
    /** Its own figure (an icon name); without one it shows its class's. */
    val icon: String? = null,
    /** How a mythic echo's emblem moves: each has its own. */
    val aura: EchoAura? = null,
)

@Serializable
enum class EchoAura { SPIN, RAYS, ORBIT, PULSE, FLAME, RUNES, STAR, ECLIPSE, GEAR, VOID, SHARDS, CLOCK, WINGS, CROWN, SPARKS, LIGHTNING, COMET, SMOKE, SEASONS, FROST, THORNS }

@Serializable
enum class ItemEffect {
    COMPLETE_QUEST, DOUBLE_NEXT_XP, REMOVE_PENALTY, STREAK_SHIELD, BUFF_XP, BUFF_GOLD,
    SHADOW_ESSENCE, SPELL_BREAKER, SWAP_QUEST, CHEST, ADD_XP,
}

@Serializable
data class ItemDef(
    val id: String,
    val cost: Int,
    val weeklyStock: Int? = null,
    val effect: ItemEffect,
    val value: Double = 0.0,
    val hours: Int = 0,
    val name: L10n,
    val description: L10n,
)

@Serializable
enum class StatKey {
    QUESTS_COMPLETED, PERFECT_DAYS, BEST_STREAK, FOCUS_MINUTES, FOCUS_SESSIONS, STRICT_SESSIONS,
    POMODORO_CYCLES, BOSSES_DEFEATED, BOSS_CHALLENGES, PORTALS_CLEARED, SHADOWS_OWNED, MAX_SHADOW_LEVEL,
    SQUAD_FULL, LEVEL, GOLD_EARNED, GOLD_SPENT, ITEMS_USED, SIDE_COMPLETED, EXTRA_COMPLETED, GPS_KM,
    GPS_METERS, PENALTIES_TAKEN, PENALTIES_CLEARED, COMEBACKS, NIGHT_QUESTS, EARLY_QUESTS,
    BLOCKED_ATTEMPTS, CUSTOM_QUESTS, STEPS, BEDTIMES_KEPT,
}

@Serializable
data class ShadowReward(val tier: Int, val shadowId: String)

@Serializable
data class AchievementDef(
    val id: String,
    val stat: StatKey,
    val tiers: List<Long>,
    val shadowReward: ShadowReward? = null,
    val title: L10n,
    val description: L10n,
    /** Singular wording for a target of 1. */
    val descriptionOne: L10n? = null,
)

@Serializable
private data class QuestCatalog(val quests: List<QuestDef>, val penalty: List<QuestDef>, val portal: List<QuestDef> = emptyList())

class Content(
    val quests: List<QuestDef>,
    val penaltyQuests: List<QuestDef>,
    /** Hand-picked short missions that can be done on the spot when a portal opens. */
    val portalQuests: List<QuestDef> = emptyList(),
    val bosses: List<BossDef>,
    val shadows: List<ShadowDef>,
    val items: List<ItemDef>,
    val achievements: List<AchievementDef>,
) {
    val shadowById = shadows.associateBy { it.id }
    val itemById = items.associateBy { it.id }
    val bossById = bosses.associateBy { it.id }
    val questDefById = (quests + penaltyQuests + portalQuests).associateBy { it.id }
    val achievementById = achievements.associateBy { it.id }

    fun shadowPool(vararg types: SourceType): List<ShadowDef> = shadows.filter { it.source.type in types }

    companion object {
        val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

        /** [read] returns the raw text of a catalog file (e.g. "quests.json"). */
        fun load(read: (String) -> String): Content {
            val q = json.decodeFromString<QuestCatalog>(read("quests.json"))
            return Content(
                quests = q.quests,
                penaltyQuests = q.penalty,
                portalQuests = q.portal,
                bosses = json.decodeFromString(read("bosses.json")),
                shadows = json.decodeFromString(read("shadows.json")),
                items = json.decodeFromString(read("items.json")),
                achievements = json.decodeFromString(read("achievements.json")),
            )
        }
    }
}
