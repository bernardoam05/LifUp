package com.lifup.app.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Rigor { EASY, NORMAL, HARD }

@Serializable
enum class QuestOrigin { DAILY, EXTRA, PENALTY, BOSS, PORTAL }

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
data class PomodoroPlan(val workMin: Int, val breakMin: Int, val rounds: Int)

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
)

@Serializable
data class Settings(
    val rigor: Rigor = Rigor.NORMAL,
    /** null = automatic by rigor and level. */
    val dailyPoolOverride: Int? = null,
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
data class DayLog(val day: String, val done: Int, val total: Int, val perfect: Boolean, val penalty: Boolean, val rest: Boolean)

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
    PORTAL_CLEARED, SHADOW_UPGRADED, PASSIVE_FIRED, BUFF_ACTIVE, BOSS_HIT, BOSS_REVIVED,
}

@Serializable
data class StreakRecovery(val streak: Int, val day: String)

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

    /** Every open quest of any origin, so progress sources (focus, GPS) can credit them all. */
    val allQuests: List<Quest>
        get() = quests + penalty.quests + listOfNotNull(boss?.challenge?.takeIf { boss?.defeated == false }, portal?.quest)
}
