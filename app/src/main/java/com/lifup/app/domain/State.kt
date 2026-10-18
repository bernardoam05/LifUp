package com.lifup.app.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Rigor { EASY, NORMAL, HARD }

@Serializable
/** [WEEKLY]: an "N times a week" mission on a day it doesn't count yet (doing it still counts). */
enum class QuestOrigin { DAILY, EXTRA, PENALTY, BOSS, PORTAL, WEEKLY }

@Serializable
enum class QuestStatus { OPEN, DONE, FAILED }

/** Difficulty letter shown on a quest card, derived from its base XP. */
@Serializable
enum class QuestRank { E, D, C, B, A, S }

@Serializable
data class Attributes(val str: Int = 0, val agi: Int = 0, val int: Int = 0, val vit: Int = 0)

@Serializable
data class Player(
    val name: String = "",
    val level: Int = 1,
    val xp: Int = 0,
    val gold: Int = 0,
    val attrXp: Attributes = Attributes(),
    val streak: Int = 0,
    val bestStreak: Int = 0,
)

@Serializable
data class Quest(
    val id: String,
    val defId: String,
    val origin: QuestOrigin,
    val type: QuestType,
    val title: L10n,
    val description: L10n,
    val unit: String,
    val target: Double,
    val progress: Double = 0.0,
    val xp: Int,
    val gold: Int,
    val rank: QuestRank,
    val status: QuestStatus = QuestStatus.OPEN,
    val xpGained: Int = 0,
    val goldGained: Int = 0,
    val auto: AutoKind? = null,
    /** Set when an automatic mission is undone: the phone stops filling it for the rest of the day. */
    val autoOff: Boolean = false,
    val pomodoro: Boolean = false,
    /** Boss HP this quest removed, given back if it is undone. */
    val bossDamage: Int = 0,
    val fromHour: Int? = null,
    /** Target adjustment applied when the quest was built (see [Adapt]). */
    val adapt: Int = 0,
    /** Weekly goal of an "N times a week" mission; null for everyday ones. */
    val perWeek: Int? = null,
)

@Serializable
data class SideQuest(
    val id: String,
    val title: String,
    val createdDay: String,
    val rank: QuestRank,
    val xp: Int,
    val gold: Int,
    val done: Boolean = false,
    val xpGained: Int = 0,
    val goldGained: Int = 0,
    val bossDamage: Int = 0,
)

@Serializable
data class Penalty(
    val active: Boolean = false,
    val quests: List<Quest> = emptyList(),
    val blockStart: Long = 0,
    val blockEnd: Long = 0,
)

@Serializable
data class BossState(
    val weekKey: String,
    val bossId: String,
    val maxHp: Int,
    val hp: Int,
    val challenge: Quest,
    val endsAt: Long,
    val defeated: Boolean = false,
    /** XP and gold the kill paid, taken back if an undo revives the boss. */
    val spoils: BossSpoils? = null,
    /** Chest and shadow were already given; a revived boss only pays XP and gold again. */
    val lootGiven: Boolean = false,
)

@Serializable
data class BossSpoils(val xp: Int, val gold: Int)

@Serializable
data class PortalState(val quest: Quest, val opensAt: Long, val expiresAt: Long)

@Serializable
data class OwnedShadow(val id: String, val level: Int = 1, val copies: Int = 0)

@Serializable
data class Buff(val itemId: String, val stat: String, val value: Double, val expiresAt: Long)

@Serializable
data class ShopState(
    val weekKey: String = "",
    val stock: Map<String, Int> = emptyMap(),
    val shadowOffers: List<String> = emptyList(),
)

@Serializable
data class PomodoroPlan(
    val workMin: Int,
    val breakMin: Int,
    val rounds: Int,
    /** Longer break after every [longEvery] work blocks; 0 = off. */
    val longBreakMin: Int = 0,
    val longEvery: Int = 4,
)

@Serializable
data class FocusSession(
    val startedAt: Long,
    /** Planned length in minutes for a plain timer; ignored when [pomodoro] is set. */
    val minutes: Int,
    val pomodoro: PomodoroPlan? = null,
    val strict: Boolean = false,
    val blockApps: Boolean = true,
    val ambient: String? = null,
    /** The one focus mission this session counts for; null = free session. */
    val questId: String? = null,
    /** No set length: counts until the user stops (capped at [Rules.OPEN_SESSION_MAX_MIN]). */
    val open: Boolean = false,
)

@Serializable
data class Settings(
    val rigor: Rigor = Rigor.NORMAL,
    /** null = automatic by rigor and level. */
    val dailyPoolOverride: Int? = null,
    /** Attributes the player wants to grow most: their missions come up twice as often. */
    val focusAttrs: Set<Attr> = emptySet(),
    val blockOnPenalty: Boolean = false,
    val sidePenalize: Boolean = false,
    val sound: Boolean = true,
    val vibration: Boolean = true,
    val notifications: Boolean = true,
    val reminderHour: Int = 21,
    val focusMinutes: Int = 25,
    val pomodoroWork: Int = 25,
    val pomodoroBreak: Int = 5,
    val pomodoroRounds: Int = 4,
    val pomodoroLongBreak: Int = 15,
    val pomodoroLongEvery: Int = 4,
    val blockedApps: List<String> = emptyList(),
    /** Used to turn steps into distance. */
    val heightCm: Int = 170,
    /** null = follows the hunter rank. */
    val themeRank: HunterRank? = null,
)

@Serializable
data class DailyFlags(
    val day: String = "",
    val swapsUsed: Int = 0,
    val extrasAdded: Int = 0,
    val extractionDone: Boolean = false,
    val sideRewarded: Int = 0,
    val rest: Boolean = false,
)

@Serializable
data class QuestRecord(val bestMs: Long = 0, val note: String = "", val count: Int = 0)

@Serializable
data class MissionTimer(val runningSince: Long = 0, val accumulatedMs: Long = 0) {
    val running get() = runningSince > 0
    fun elapsed(now: Long) = accumulatedMs + if (running) now - runningSince else 0
}

@Serializable
data class DayLog(val day: String, val done: Int, val total: Int, val perfect: Boolean, val penalty: Boolean, val rest: Boolean, val passed: Boolean = false)

@Serializable
data class PenaltyInfo(val failed: Int, val total: Int, val xpLost: Int, val goldLost: Int, val quests: Int, val absorbedBy: String? = null)

@Serializable
sealed interface Reward {
    val id: Long

    @Serializable @SerialName("level")
    data class LevelUp(override val id: Long, val level: Int, val gold: Int, val items: List<String>) : Reward

    @Serializable @SerialName("rank")
    data class RankUp(override val id: Long, val rank: HunterRank) : Reward

    @Serializable @SerialName("shadow")
    data class ShadowGained(override val id: Long, val shadowId: String, val isNew: Boolean, val copies: Int, val source: SourceType) : Reward

    @Serializable @SerialName("boss")
    data class BossDefeated(override val id: Long, val bossId: String, val xp: Int, val gold: Int, val items: List<String>) : Reward

    @Serializable @SerialName("achievement")
    data class AchievementUnlocked(override val id: Long, val achievementId: String, val tier: Int, val gold: Int) : Reward

    @Serializable @SerialName("day")
    data class DayReport(
        override val id: Long,
        val day: String,
        val done: Int,
        val total: Int,
        val perfect: Boolean,
        val rest: Boolean,
        val streak: Int,
        val bonusXp: Int,
        val penalty: PenaltyInfo? = null,
        val streakSavedBy: String? = null,
        /** Enough missions for the streak, but not all of them. */
        val passed: Boolean = false,
        val streakRestored: Boolean = false,
    ) : Reward

    @Serializable @SerialName("week")
    data class WeekReport(
        override val id: Long,
        val weekStart: String,
        val daysKept: Int,
        val perfectDays: Int,
        val restDays: Int,
        val days: Int,
        val previousKept: Int? = null,
        val best: String? = null,
        val bestRate: Double = 0.0,
        val worst: String? = null,
        val worstRate: Double = 0.0,
        val bossId: String? = null,
        val bossDefeated: Boolean = false,
        val weekly: List<WeekLine> = emptyList(),
    ) : Reward

    @Serializable @SerialName("streak")
    data class StreakMilestone(override val id: Long, val days: Int, val gold: Int, val items: List<String>) : Reward

    @Serializable @SerialName("chest")
    data class ChestOpened(override val id: Long, val gold: Int, val xp: Int, val itemId: String?) : Reward

    /** Small, non-blocking notice shown as a snackbar. */
    @Serializable @SerialName("toast")
    data class Toast(override val id: Long, val kind: ToastKind, val arg: String = "") : Reward
}

@Serializable
enum class ToastKind {
    LEVEL_UP, ITEM_FOUND, PENALTY_CLEARED, FOCUS_DONE, FOCUS_LOST, BOSS_ESCAPED, PORTAL_ESCAPED,
    PORTAL_CLEARED, SHADOW_UPGRADED, PASSIVE_FIRED, BUFF_ACTIVE, BOSS_HIT, BOSS_REVIVED, WEEK_GOAL,
}

@Serializable
data class StreakRecovery(val streak: Int, val day: String)

/** How often a mission was kept: lifetime and for the running week. */
@Serializable
data class MissionStat(val done: Int = 0, val total: Int = 0) {
    val rate: Double get() = if (total == 0) 0.0 else done.toDouble() / total
    fun add(success: Boolean) = MissionStat(done + if (success) 1 else 0, total + 1)
}

/** Target adjustment for one mission: [level] steps of 10%, moved by runs of wins or losses. */
@Serializable
data class Adapt(val level: Int = 0, val wins: Int = 0, val losses: Int = 0)

@Serializable
data class GameState(
    val version: Int = 1,
    val onboarded: Boolean = false,
    val player: Player = Player(),
    val day: String = "",
    val quests: List<Quest> = emptyList(),
    val sideQuests: List<SideQuest> = emptyList(),
    val customDefs: List<QuestDef> = emptyList(),
    val disabledDefIds: Set<String> = emptySet(),
    val penalty: Penalty = Penalty(),
    val boss: BossState? = null,
    val bossHistory: List<String> = emptyList(),
    /** Per-install random seed, so weekly bosses, shop offers and drawn missions differ between players. */
    val seed: Long = 0,
    val portal: PortalState? = null,
    val portalDay: String = "",
    val portalsToday: Int = 0,
    val portalRollHour: String = "",
    val shadows: List<OwnedShadow> = emptyList(),
    val squad: List<String> = emptyList(),
    val inventory: Map<String, Int> = emptyMap(),
    val buffs: List<Buff> = emptyList(),
    val shop: ShopState = ShopState(),
    val focus: FocusSession? = null,
    val run: RunSession? = null,
    val settings: Settings = Settings(),
    val counters: Map<StatKey, Long> = emptyMap(),
    val achievements: Map<String, Int> = emptyMap(),
    val records: Map<String, QuestRecord> = emptyMap(),
    val timers: Map<String, MissionTimer> = emptyMap(),
    val dayLog: List<DayLog> = emptyList(),
    val daily: DailyFlags = DailyFlags(),
    /** Rest days used in [restWeek]. */
    val restWeek: String = "",
    val restUsed: Int = 0,
    /** A streak lost yesterday that a perfect [StreakRecovery.day] brings back. */
    val recovery: StreakRecovery? = null,
    val recoveryWeek: String = "",
    val missionStats: Map<String, MissionStat> = emptyMap(),
    val weekStats: Map<String, MissionStat> = emptyMap(),
    /** Week [weekStats] and the weekly report refer to. */
    val statsWeek: String = "",
    val lastWeekKept: Int? = null,
    val adapt: Map<String, Adapt> = emptyMap(),
    /** This week's tally of each "N times a week" mission, by definition id. */
    val weekly: Map<String, WeekTally> = emptyMap(),
    /** A fixed mission done on only some days last week, offered as "N times a week". */
    val weeklyHint: WeeklyHint? = null,
    val weeklyHintsDismissed: Set<String> = emptySet(),
    /** Echoes gained since the Echoes tab was last seen: true = first copy, false = an extra copy. */
    val newEchoes: Map<String, Boolean> = emptyMap(),
    /** Items gained since the inventory was last seen. */
    val newItems: Set<String> = emptySet(),
    /** Guides already shown automatically. */
    val seenGuides: Set<String> = emptySet(),
    val passiveCooldowns: Map<Passive, Long> = emptyMap(),
    val doubleXpNext: Boolean = false,
    val rewards: List<Reward> = emptyList(),
    val nextId: Long = 1,
) {
    fun owned(id: String) = shadows.firstOrNull { it.id == id }
    fun count(key: StatKey) = counters[key] ?: 0L
    fun items(id: String) = inventory[id] ?: 0
    val dailyQuests get() = quests.filter { it.origin == QuestOrigin.DAILY }
    val extraQuests get() = quests.filter { it.origin == QuestOrigin.EXTRA }
    val weeklyQuests get() = quests.filter { it.origin == QuestOrigin.WEEKLY }

    /** Every open quest of any origin, so progress sources (focus, GPS) can credit them all. */
    val allQuests: List<Quest>
        get() = quests + penalty.quests + listOfNotNull(boss?.challenge?.takeIf { boss?.defeated == false }, portal?.quest)
}
