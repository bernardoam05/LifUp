package com.lifup.app.domain

import kotlinx.serialization.Serializable
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.TemporalAdjusters
import kotlin.math.floor
import kotlin.math.roundToInt
import kotlin.math.sqrt
import kotlin.random.Random

/** Hunter rank, derived only from level. */
@Serializable
enum class HunterRank(val minLevel: Int, val color: Long) {
    E(1, 0xFF94A3B8), D(5, 0xFF10B981), C(15, 0xFF3B82F6), B(30, 0xFF8B5CF6),
    A(50, 0xFFEC4899), S(70, 0xFFFBBF24), N(90, 0xFFEF4444);

    val next get() = entries.getOrNull(ordinal + 1)

    companion object {
        fun of(level: Int) = entries.last { level >= it.minLevel }
    }
}

object Rules {
    const val SQUAD_SIZE = 3
    const val MAX_EXTRAS_PER_DAY = 3
    /** Side quests that pay XP/gold per day; more can be ticked, as a plain to-do list. */
    const val SIDE_REWARDS_PER_DAY = 5
    const val FREE_SWAPS_PER_DAY = 1
    const val MAX_PORTALS_PER_DAY = 2
    const val PORTAL_CHANCE = 0.25
    /** Portals never ask for more than this much effort, so they fit in an evening. */
    const val PORTAL_MAX_TASK_MIN = 150.0
    const val MIN_PER_KM = 10.0
    const val STEPS_PER_MIN = 100.0
    const val DEFAULT_TASK_MIN = 15.0
    const val BOSS_CHALLENGE_DAMAGE = 0.35
    const val WEEK_MS = 7L * 24 * 3_600_000

    fun xpForLevel(level: Int) = 100 * level.coerceAtLeast(1)

    fun attrLevel(xp: Int) = 10 + floor(sqrt(xp.coerceAtLeast(0) / 5.0)).toInt()

    /** Quest-scaling tier by level: E, D, C, B, A, S, National. */
    fun tierMultiplier(level: Int) = when {
        level >= 90 -> 5.0
        level >= 70 -> 3.5
        level >= 50 -> 2.5
        level >= 30 -> 2.0
        level >= 15 -> 1.5
        level >= 5 -> 1.2
        else -> 1.0
    }

    /** XP lost on a failed day before multipliers (≈60% of a typical day at that tier). */
    fun penaltyBase(level: Int) = when {
        level >= 90 -> 600
        level >= 70 -> 420
        level >= 50 -> 300
        level >= 30 -> 240
        level >= 15 -> 180
        level >= 5 -> 144
        else -> 120
    }

    fun questRank(baseXp: Int) = when {
        baseXp >= 1000 -> QuestRank.S
        baseXp >= 600 -> QuestRank.A
        baseXp >= 300 -> QuestRank.B
        baseXp >= 150 -> QuestRank.C
        baseXp >= 50 -> QuestRank.D
        else -> QuestRank.E
    }

    fun dailyPoolCount(level: Int, settings: Settings): Int = settings.dailyPoolOverride?.coerceIn(1, 10)
        ?: when (settings.rigor) {
            Rigor.EASY -> 2
            Rigor.NORMAL -> minOf(3 + level / 12, 5)
            Rigor.HARD -> minOf(4 + level / 8, 7)
        }

    fun attrGain(type: QuestType?): Attributes = when (type) {
        QuestType.TRAINING -> Attributes(str = 12, vit = 6)
        QuestType.GPS -> Attributes(agi = 12, vit = 6)
        QuestType.KNOWLEDGE, QuestType.FOCUS -> Attributes(int = 12)
        else -> Attributes(3, 3, 3, 3)
    }

    // ── Shadows ───────────────────────────────────────────────────────────────

    private val PASSIVE_TABLE: Map<Passive, DoubleArray> = mapOf(
        Passive.XP_BOOST to doubleArrayOf(.02, .04, .06, .10, .15),
        Passive.GOLD_BOOST to doubleArrayOf(.03, .05, .08, .12, .18),
        Passive.TRAINING_XP to doubleArrayOf(.05, .08, .12, .18, .25),
        Passive.MIND_XP to doubleArrayOf(.05, .08, .12, .18, .25),
        Passive.EXPLORER_XP to doubleArrayOf(.05, .08, .12, .18, .25),
        Passive.BOSS_DAMAGE to doubleArrayOf(.05, .10, .15, .22, .30),
        Passive.PENALTY_REDUCE to doubleArrayOf(.04, .07, .10, .15, .22),
        Passive.SHOP_DISCOUNT to doubleArrayOf(.02, .04, .06, .09, .12),
        Passive.FOCUS_MASTERY to doubleArrayOf(.03, .05, .08, .12, .18),
        Passive.DAILY_BONUS to doubleArrayOf(5.0, 10.0, 15.0, 25.0, 40.0),
        Passive.SHADOW_LUCK to doubleArrayOf(.05, .10, .15, .22, .30),
        Passive.ALL_BOOST to doubleArrayOf(.03, .04, .05, .08, .12),
    )

    /** Passive strength for a shadow at a level (0 for flag passives). */
    fun passiveValue(def: ShadowDef, level: Int): Double {
        val base = PASSIVE_TABLE[def.passive]?.get(def.rank.ordinal) ?: return 0.0
        return base * (1 + (level - 1) * 0.12)
    }

    fun upgradeGold(rank: ShadowRank, level: Int): Int {
        val base = intArrayOf(100, 220, 500, 1000, 2000)[rank.ordinal]
        return (base * (1 + (level - 1) * 0.3)).roundToInt()
    }

    fun upgradeCopies(rank: ShadowRank) = intArrayOf(3, 3, 2, 2, 1)[rank.ordinal]

    fun shopShadowPrice(rank: ShadowRank) = intArrayOf(800, 1500, 3000, 6000, 12000)[rank.ordinal]

    fun extractionRank(level: Int, roll: Double): ShadowRank = when {
        level >= 26 -> when {
            roll < 0.02 -> ShadowRank.MARSHAL
            roll < 0.15 -> ShadowRank.COMMANDER
            roll < 0.45 -> ShadowRank.KNIGHT
            roll < 0.82 -> ShadowRank.ELITE
            else -> ShadowRank.NORMAL
        }
        level >= 21 -> when {
            roll < 0.10 -> ShadowRank.COMMANDER
            roll < 0.40 -> ShadowRank.KNIGHT
            roll < 0.78 -> ShadowRank.ELITE
            else -> ShadowRank.NORMAL
        }
        level >= 11 -> when {
            roll < 0.15 -> ShadowRank.KNIGHT
            roll < 0.55 -> ShadowRank.ELITE
            else -> ShadowRank.NORMAL
        }
        level >= 6 -> if (roll < 0.30) ShadowRank.ELITE else ShadowRank.NORMAL
        else -> ShadowRank.NORMAL
    }

    fun essenceRank(roll: Double): ShadowRank = when {
        roll < 0.01 -> ShadowRank.MARSHAL
        roll < 0.05 -> ShadowRank.COMMANDER
        roll < 0.20 -> ShadowRank.KNIGHT
        roll < 0.55 -> ShadowRank.ELITE
        else -> ShadowRank.NORMAL
    }

    val ACHIEVEMENT_GOLD = intArrayOf(50, 150, 400, 1000, 2500)

    /** Days of history kept for the activity calendar (a bit over a year). */
    const val DAY_LOG_DAYS = 371

    /** Streak milestones replace the old login calendar. */
    data class Milestone(val days: Int, val gold: Int = 0, val items: List<String> = emptyList(), val shadowId: String? = null)

    val STREAK_MILESTONES = listOf(
        Milestone(3, gold = 100),
        Milestone(7, items = listOf("essencia_sombria")),
        Milestone(14, shadowId = "calendar_knight"),
        Milestone(30, gold = 500, items = listOf("bau_cacador")),
        Milestone(60, items = listOf("essencia_sombria", "essencia_sombria")),
        Milestone(100, shadowId = "calendar_marshal"),
    )

    val CHEST_ITEMS = listOf("relogio_ampulheta", "elixir_sabedoria", "elixir_fortuna", "essencia_sombria", "pergaminho_troca")
    val LEVEL_ITEMS = listOf("relogio_ampulheta", "lagrima_purificacao", "bau_cacador", "essencia_sombria")
}

/** Pomodoro timeline maths: everything derives from the start time, so no ticking state is stored. */
object Pomodoro {
    fun totalMinutes(p: PomodoroPlan) = p.rounds * p.workMin + (p.rounds - 1).coerceAtLeast(0) * p.breakMin

    /** Work minutes accumulated after [elapsedMin] minutes. */
    fun workMinutes(p: PomodoroPlan, elapsedMin: Double): Double {
        val cycle = (p.workMin + p.breakMin).toDouble()
        val e = elapsedMin.coerceIn(0.0, totalMinutes(p).toDouble())
        val full = floor(e / cycle).toInt()
        val rem = e - full * cycle
        return minOf(full, p.rounds) * p.workMin + if (full < p.rounds) minOf(rem, p.workMin.toDouble()) else 0.0
    }

    data class Phase(val work: Boolean, val cycle: Int, val endsAtMin: Double)

    fun phaseAt(p: PomodoroPlan, elapsedMin: Double): Phase {
        val cycle = (p.workMin + p.breakMin).toDouble()
        val idx = floor(elapsedMin / cycle).toInt().coerceAtMost(p.rounds - 1)
        val rem = elapsedMin - idx * cycle
        return if (rem < p.workMin) Phase(true, idx + 1, idx * cycle + p.workMin)
        else Phase(false, idx + 1, (idx + 1) * cycle)
    }

    fun completedCycles(p: PomodoroPlan, elapsedMin: Double) =
        (workMinutes(p, elapsedMin) / p.workMin).toInt()
}

fun FocusSession.totalMinutes() = pomodoro?.let { Pomodoro.totalMinutes(it) } ?: minutes
fun FocusSession.endsAt() = startedAt + totalMinutes() * 60_000L
fun FocusSession.elapsedMinutes(now: Long) = ((minOf(now, endsAt()) - startedAt) / 60_000.0).coerceAtLeast(0.0)
fun FocusSession.creditableMinutes(now: Long): Double {
    val e = elapsedMinutes(now)
    return pomodoro?.let { Pomodoro.workMinutes(it, e) } ?: e
}

/** Everything an action needs from the outside world. */
class Ctx(val content: Content, val now: Long, val zone: ZoneId = ZoneId.systemDefault(), val rng: Random = Random.Default) {
    val dateTime: ZonedDateTime = Instant.ofEpochMilli(now).atZone(zone)
    val today: LocalDate = dateTime.toLocalDate()
    val todayKey: String = today.toString()
    val hour: Int = dateTime.hour

    val weekStart: LocalDate = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    val weekKey: String = weekStart.toString()
    val nextWeekStartMs: Long = weekStart.plusWeeks(1).atStartOfDay(zone).toInstant().toEpochMilli()

    fun atHour(date: LocalDate, hour: Int): Long = date.atTime(hour, 0).atZone(zone).toInstant().toEpochMilli()
    fun nextMidnight(): Long = today.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
}

/** Mutable wrapper used inside a single action so rules read as a sequence of steps. */
class Tx(var s: GameState, val ctx: Ctx) {
    val content get() = ctx.content

    fun reward(make: (Long) -> Reward) {
        s = s.copy(rewards = s.rewards + make(s.nextId), nextId = s.nextId + 1)
    }

    fun count(key: StatKey, by: Long = 1) {
        s = s.copy(counters = s.counters + (key to s.count(key) + by))
    }

    fun addItem(id: String, qty: Int = 1) {
        val n = (s.items(id) + qty).coerceAtLeast(0)
        s = s.copy(inventory = if (n == 0) s.inventory - id else s.inventory + (id to n))
    }

    fun toast(kind: ToastKind, arg: String = "") = reward { Reward.Toast(it, kind, arg) }
}
