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
import kotlin.math.pow
import kotlin.random.Random

/** Hunter rank, derived only from level. */
@Serializable
enum class HunterRank(val minLevel: Int, val color: Long) {
    E(1, 0xFF94A3B8), D(5, 0xFF10B981), C(15, 0xFF3B82F6), B(30, 0xFF8B5CF6),
    A(50, 0xFFEC4899), S(70, 0xFFFBBF24), N(90, 0xFFEF4444);

    val next get() = entries.getOrNull(ordinal + 1)

    /** What the player sees: the top rank reads "SS" (the enum keeps N so saves stay compatible). */
    val label get() = if (this == N) "SS" else name

    companion object {
        fun of(level: Int) = entries.last { level >= it.minLevel }
    }
}

object Rules {
    const val SQUAD_SIZE = 3
    const val MAX_EXTRAS_PER_DAY = 3
    /** Bonus for reaching a weekly mission's goal, in multiples of the mission's gold. */
    const val WEEK_GOAL_GOLD_MULT = 2
    /** Side quests that pay XP/gold per day; more can be ticked, as a plain to-do list. */
    const val SIDE_REWARDS_PER_DAY = 5
    /** What a side quest pays before level scaling: a token, since nothing checks it was done. */
    const val SIDE_XP = 12
    const val SIDE_GOLD = 3
    const val FREE_SWAPS_PER_DAY = 1
    const val MAX_PORTALS_PER_DAY = 2
    /** Hours a portal can open in (rolled once an hour). */
    val PORTAL_HOURS = 8..21
    const val PORTAL_CHANCE = 0.25
    /** Portals never ask for more than this much effort, so they fit in an evening. */
    const val PORTAL_MAX_TASK_MIN = 150.0
    const val MIN_PER_KM = 10.0
    const val STEPS_PER_MIN = 100.0
    const val DEFAULT_TASK_MIN = 15.0
    /** Each of the week's two boss challenges takes this share of its health. */
    const val BOSS_CHALLENGE_DAMAGE = 0.15
    const val BOSS_CHALLENGES = 2
    /** The second challenge arrives on this day, and its notification at this hour. */
    val BOSS_SECOND_DAY: DayOfWeek = DayOfWeek.THURSDAY
    const val BOSS_SECOND_HOUR = 9
    /** Days of full daily missions that, with both challenges, bring the boss down. */
    const val BOSS_HP_DAYS = 4.5
    /** Extra missions hit the boss for this share of their XP. */
    const val EXTRA_BOSS_SHARE = 0.5
    const val DAY_MS = 24L * 3_600_000

    const val MAX_LEVEL = 1000

    /** XP to go from [level] to the next: grows by 100 a level up to 100, then by 50 (about 4 days a level for good). */
    fun xpForLevel(level: Int) = level.coerceIn(1, MAX_LEVEL).let { if (it <= 100) 100 * it else 10_000 + 50 * (it - 100) }

    /** Mission XP keeps growing past the top tier (+1 every 25 levels) so late levels still move; gold doesn't. */
    fun xpMultiplier(level: Int) = if (level <= 90) tierMultiplier(level) else 5.0 + (level - 90) / 25.0

    /** Gold for every 5th level: grows by 25 a level up to 100, then by 10. */
    fun levelGold(level: Int) = if (level <= 100) level * 25 else 2_500 + 10 * (level - 100)

    /** From level 150, every 50th level brings an echo, of a higher rank the further you go. */
    const val LEVEL_ECHO_EVERY = 50
    const val LEVEL_ECHO_FROM = 150
    fun levelEchoRank(level: Int) = when {
        level >= 600 -> ShadowRank.MARSHAL
        level >= 300 -> ShadowRank.COMMANDER
        else -> ShadowRank.KNIGHT
    }

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
    /** A failed day costs this many times the undone share of what its missions would have paid. */
    fun lossMultiplier(rigor: Rigor) = when (rigor) { Rigor.EASY -> 0.3; Rigor.NORMAL -> 1.0; Rigor.HARD -> 2.0 }

    /** Losses over a run of failed days: the first in full, the second half, then a quarter. */
    fun failRunFactor(previousFails: Int) = when (previousFails) { 0 -> 1.0; 1 -> 0.5; else -> 0.25 }

    /** A mission's difficulty from its base XP: the Forge's three reward presets, split halfway between them. */
    fun difficulty(baseXp: Int) = when {
        baseXp < 45 -> Difficulty.EASY
        baseXp < 80 -> Difficulty.MEDIUM
        else -> Difficulty.HARD
    }

    fun questRank(baseXp: Int) = when {
        baseXp >= 1000 -> QuestRank.S
        baseXp >= 600 -> QuestRank.A
        baseXp >= 300 -> QuestRank.B
        baseXp >= 150 -> QuestRank.C
        baseXp >= 50 -> QuestRank.D
        else -> QuestRank.E
    }

    // Drawn missions per day (see MissionLoad); rigor only changes the consequences, not the workload.
    const val BASE_DRAWN = 3
    const val MAX_LOAD = 4
    /** Kept days in a row for one more drawn mission. */
    const val LOAD_STEP_DAYS = 7
    /** Ceiling on the day's missions (fixed, drawn and due weekly) unless set by hand. */
    const val MAX_DAY_MISSIONS = 7

    /** Share of the day's missions that keeps the streak and avoids the penalty. */
    fun passRatio(rigor: Rigor) = when (rigor) { Rigor.EASY -> 0.6; Rigor.NORMAL -> 0.75; Rigor.HARD -> 1.0 }

    /**
     * Below this share a failed day also brings a penalty: two thirds of the streak minimum, on every
     * difficulty. Between it and [passRatio] a day only costs XP, gold and the streak, so a near miss is
     * never punished twice.
     */
    fun severeRatio(rigor: Rigor) = when (rigor) { Rigor.EASY -> 0.4; Rigor.NORMAL -> 0.5; Rigor.HARD -> 2.0 / 3 }

    private fun penaltyMissions(rigor: Rigor) = when (rigor) { Rigor.EASY -> 1..1; Rigor.NORMAL -> 1..3; Rigor.HARD -> 2..4 }

    /** Penalty missions for a day that kept [ratio] of its missions: more the emptier it was below the line. */
    fun penaltyMissionCount(rigor: Rigor, ratio: Double): Int {
        val range = penaltyMissions(rigor)
        val depth = (1 - ratio / severeRatio(rigor)).coerceIn(0.0, 1.0)
        return range.first + ((range.last - range.first) * depth).roundToInt()
    }

    /**
     * Mission progression: a step up after the mission's N keeps since the last change, with at least this many
     * keeps per miss (80%); a step down after 3+ misses that outnumber the keeps; never more than 3 steps below the base.
     */
    const val PROG_KEEPS_PER_MISS = 4
    const val PROG_DOWN_MISSES = 3
    const val PROG_MIN_STEP = -3
    /** Past a mission's comfortable top, each step needs this many times the keeps. */
    const val PROG_PAST_TOP_PACE = 2
    /** The reward follows the target: half its relative change, within these bounds. */
    const val PROG_REWARD_MIN = -0.15
    const val PROG_REWARD_MAX = 0.5

    /** A mission needs this many days in a week to be called best or worst. */
    const val WEEK_MIN_SAMPLES = 3
    /** Days of history kept per mission (enough for two months of a daily one). */
    const val HABIT_DAYS_KEPT = 90
    const val HABIT_STRIP_DAYS = 30
    /** Past weeks kept per weekly mission, and how many its chart shows (the current week included). */
    const val WEEKLY_HISTORY_WEEKS = 26
    const val WEEKLY_CHART_WEEKS = 8

    /** "Later" on a reminder puts it off this long. */
    const val SNOOZE_MIN = 30
    /** A reminder missed by more than this (phone off, app not run) is dropped rather than rung late. */
    const val REMINDER_STALE_MIN = 90

    /** Sunday hour for the "boss escapes tonight" nudge. */
    const val BOSS_NUDGE_HOUR = 18

    /** Nudge for an open bedtime check-in, in minutes after midnight (22:30). */
    const val BEDTIME_NUDGE_MIN = 22 * 60 + 30
    /** When open avoid missions get their evening check-in. */
    const val AVOID_CHECK_MIN = 21 * 60 + 30

    /** A finished "no quitting" session credits its minutes ×1.25 and 1 gold per 5 minutes. */
    const val STRICT_BONUS = 1.25
    const val STRICT_GOLD_EVERY_MIN = 5.0
    /** Focus sessions pay this XP per minute (times the level tier), for up to this many minutes a day. */
    const val FOCUS_XP_PER_MIN = 1.0
    const val FOCUS_PAID_MAX_MIN = 120.0
    /** A measured limit warns once a day when this share of it, or this many minutes, is left. */
    const val LIMIT_WARN_SHARE = 0.25
    const val LIMIT_WARN_MIN = 20

    /** Sessions without a set end still stop by themselves after this long. */
    const val OPEN_SESSION_MAX_MIN = 480

    /** A penalty, and its app block, lasts this long for every rigor. */
    /** How long a penalty (and its app block) lasts. */
    const val PENALTY_MS = 24 * 3_600_000L
    /** What missions pay during a penalty that doesn't block apps, so it always costs something. */
    const val PENALTY_REWARD_CUT = 0.5

    fun restDaysPerWeek(rigor: Rigor) = when (rigor) { Rigor.EASY -> 2; Rigor.NORMAL -> 1; Rigor.HARD -> 0 }

    /** Rest days must be called before this hour, not as a last-minute escape. */
    const val REST_DEADLINE_HOUR = 12

    fun attrGain(group: DrawGroup?): Attributes = when (group) {
        DrawGroup.STRENGTH -> Attributes(str = 12, vit = 6)
        DrawGroup.MOVEMENT -> Attributes(agi = 12, vit = 6)
        DrawGroup.MIND -> Attributes(int = 12)
        DrawGroup.HEALTH -> Attributes(vit = 15)
        DrawGroup.SELF_CONTROL -> Attributes(int = 4, vit = 11)
        null -> Attributes(3, 3, 3, 3)
    }

    /** Draw weight multiplier for the families of the player's focus attributes. */
    const val FOCUS_WEIGHT = 2.5
    /** Each mission drawn from a family multiplies that family's weight by this for the rest of the day. */
    const val REPEAT_DECAY = 0.2
    /** Within its family, a mission drawn yesterday weighs this much against the others. */
    const val RECENT_WEIGHT = 0.3
    const val MAX_FOCUS_ATTRS = 2

    // ── Shadows ───────────────────────────────────────────────────────────────

    /**
     * Base strength by rank. A family's XP (strength, movement, mind: about a fifth of the missions each) is
     * worth 2.5× the all-round XP, so it pays off for players who lean on that family; the amplifier only
     * works through the other two members, so it starts high.
     */
    private val PASSIVE_TABLE: Map<Passive, DoubleArray> = mapOf(
        Passive.XP_BOOST to doubleArrayOf(.02, .04, .06, .10, .15),
        Passive.GOLD_BOOST to doubleArrayOf(.03, .05, .08, .12, .18),
        Passive.TRAINING_XP to doubleArrayOf(.05, .10, .15, .25, .38),
        Passive.MIND_XP to doubleArrayOf(.05, .10, .15, .25, .38),
        Passive.EXPLORER_XP to doubleArrayOf(.05, .10, .15, .25, .38),
        Passive.BOSS_DAMAGE to doubleArrayOf(.05, .10, .15, .22, .30),
        Passive.PENALTY_REDUCE to doubleArrayOf(.04, .07, .10, .15, .22),
        Passive.SHOP_DISCOUNT to doubleArrayOf(.03, .05, .08, .12, .18),
        Passive.FOCUS_MASTERY to doubleArrayOf(.05, .10, .15, .22, .30),
        Passive.DAILY_BONUS to doubleArrayOf(5.0, 10.0, 15.0, 25.0, 40.0),
        Passive.SHADOW_LUCK to doubleArrayOf(.05, .10, .15, .22, .30),
        Passive.ALL_BOOST to doubleArrayOf(.10, .15, .20, .30, .40),
        // At a full streak it beats the all-round XP, but a broken streak takes it back to nothing.
        Passive.STREAK_XP to doubleArrayOf(.03, .06, .10, .16, .25),
        // Portals are about a third of a day's XP, so this is worth about the all-round XP.
        Passive.PORTAL_BOOST to doubleArrayOf(.10, .20, .30, .45, .60),
        // Mornings hold about a family's share of the missions, so it pays like the family XP.
        Passive.EARLY_XP to doubleArrayOf(.05, .10, .15, .25, .38),
        // Only the day after a failed one, so it can be strong; a failed day still costs far more than it gives back.
        Passive.COMEBACK to doubleArrayOf(.15, .25, .40, .60, .80),
        Passive.REDEMPTION to doubleArrayOf(.20, .30, .45, .65, .85),
    )
    /** Missions finished before this hour count as early. */
    const val EARLY_HOUR = 10
    const val STREAK_XP_FULL_DAYS = 30

    /**
     * Days between the once-in-a-while passives (penalty immunity, streak protection) by rank, before levels.
     * Never more than once a week: levels bring the lower ranks there, nothing goes past it.
     */
    private val FLAG_DAYS = intArrayOf(14, 14, 14, 10, 7)
    const val FLAG_MIN_DAYS = 7
    const val MAX_BOSS_DAMAGE = 1.5
    const val MAX_PENALTY_REDUCE = 0.5
    const val MAX_SHOP_DISCOUNT = 0.3
    const val MAX_FOCUS_MASTERY = 0.5
    /** Redemption gives back at most everything the failed day cost. */
    const val MAX_REDEMPTION = 1.0

    fun isFlag(p: Passive) = p == Passive.PENALTY_IMMUNITY || p == Passive.STREAK_PROTECT

    /** An echo's level multiplies its base: fast at first, then flattening, never past ×3, so it can't outgrow the game. */
    fun levelFactor(level: Int) = 1 + 2 * (1 - 0.9.pow(level - 1))

    /** A flag passive fires once every this many days: sooner with rank, and a day sooner every 3 levels. */
    fun flagDays(def: ShadowDef, level: Int) = (FLAG_DAYS[def.rank.ordinal] - (level - 1) / 3).coerceAtLeast(FLAG_MIN_DAYS)

    /**
     * Passive strength for an echo at a level; for flags, its days between triggers. The perfect-day bonus
     * also follows mission XP, through the player's level.
     */
    fun passiveValue(def: ShadowDef, level: Int, playerLevel: Int = 1): Double {
        if (isFlag(def.passive)) return flagDays(def, level).toDouble()
        if (def.passive == Passive.EXTRA_SWAP) return 1.0
        val base = (PASSIVE_TABLE[def.passive]?.get(def.rank.ordinal) ?: return 0.0) * levelFactor(level)
        return if (def.passive == Passive.DAILY_BONUS) base * xpMultiplier(playerLevel) else base
    }

    fun upgradeGold(rank: ShadowRank, level: Int): Int {
        val base = intArrayOf(100, 220, 500, 1000, 2000)[rank.ordinal]
        return (base * (1 + (level - 1) * 0.3)).roundToInt()
    }

    fun upgradeCopies(rank: ShadowRank) = intArrayOf(3, 3, 2, 2, 1)[rank.ordinal]

    fun shopShadowPrice(rank: ShadowRank) = intArrayOf(800, 1500, 3000, 6000, 12000)[rank.ordinal]

    /** Chances that luck multiplies: an item after a mission (essence part of it) and an echo from a portal. */
    const val MISSION_DROP_CHANCE = 0.09
    const val MISSION_ESSENCE_CHANCE = 0.03
    const val PORTAL_ECHO_CHANCE = 0.2

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
    /** From this tier on, an achievement also gives a chest. */
    const val ACHIEVEMENT_CHEST_TIER = 3
    const val ACHIEVEMENT_CHEST = "bau_cacador"

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
    data class Phase(val work: Boolean, val cycle: Int, val startMin: Double, val endsAtMin: Double)

    /** Breaks can't outweigh the work: a short one is at most half a block, a long one at most a block. */
    fun sane(p: PomodoroPlan): PomodoroPlan {
        val work = p.workMin.coerceIn(5, 120)
        return p.copy(
            workMin = work,
            breakMin = p.breakMin.coerceIn(1, maxBreak(work)),
            rounds = p.rounds.coerceAtLeast(1),
            longBreakMin = p.longBreakMin.coerceIn(0, maxLongBreak(work)),
            longEvery = p.longEvery.coerceIn(2, 8),
        )
    }

    fun maxBreak(work: Int) = (work / 2).coerceAtLeast(1)
    fun maxLongBreak(work: Int) = work

    private fun breakAfter(p: PomodoroPlan, cycle: Int) =
        if (p.longBreakMin > 0 && cycle % p.longEvery == 0) p.longBreakMin else p.breakMin

    /** Work blocks with the breaks between them (none after the last). */
    fun phases(p: PomodoroPlan): List<Phase> {
        val out = ArrayList<Phase>(p.rounds * 2)
        var t = 0.0
        for (c in 1..p.rounds) {
            out += Phase(true, c, t, t + p.workMin); t += p.workMin
            if (c < p.rounds) { val b = breakAfter(p, c); out += Phase(false, c, t, t + b); t += b }
        }
        return out
    }

    fun totalMinutes(p: PomodoroPlan) = phases(p).last().endsAtMin.toInt()

    /** Rounds that fit in [minutes], for sessions without a set end. */
    fun roundsWithin(p: PomodoroPlan, minutes: Int): Int {
        var rounds = 1
        while (rounds < 200 && totalMinutes(p.copy(rounds = rounds + 1)) <= minutes) rounds++
        return rounds
    }

    /** Work minutes accumulated after [elapsedMin] minutes. */
    fun workMinutes(p: PomodoroPlan, elapsedMin: Double): Double =
        phases(p).filter { it.work }.sumOf { (elapsedMin - it.startMin).coerceIn(0.0, it.endsAtMin - it.startMin) }

    fun phaseAt(p: PomodoroPlan, elapsedMin: Double): Phase {
        val all = phases(p)
        return all.firstOrNull { elapsedMin < it.endsAtMin } ?: all.last()
    }

    fun completedCycles(p: PomodoroPlan, elapsedMin: Double) =
        phases(p).count { it.work && elapsedMin >= it.endsAtMin }
}

fun FocusSession.totalMinutes() = pomodoro?.let { Pomodoro.totalMinutes(it) } ?: if (open) Rules.OPEN_SESSION_MAX_MIN else minutes
fun FocusSession.endsAt() = startedAt + totalMinutes() * 60_000L
fun FocusSession.elapsedMinutes(now: Long) = ((minOf(now, endsAt()) - startedAt) / 60_000.0).coerceAtLeast(0.0)
fun FocusSession.creditableMinutes(now: Long): Double {
    val e = elapsedMinutes(now)
    return pomodoro?.let { Pomodoro.workMinutes(it, e) } ?: e
}

/** Random source fixed for the week and this player: stable across reruns, different between players. */
fun GameState.weekRandom(ctx: Ctx, salt: Int): Random = Random(ctx.weekKey.hashCode().toLong() * 31 + salt xor seed)

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
    /** Wall-clock time on [date], right on the days the clocks change (adding minutes to midnight would be an hour off). */
    fun atMinute(date: LocalDate, minute: Int): Long = date.atTime(minute / 60, minute % 60).atZone(zone).toInstant().toEpochMilli()
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
        s = s.copy(
            inventory = if (n == 0) s.inventory - id else s.inventory + (id to n),
            // Gains are flagged as new until the inventory is looked at; used-up items drop the flag.
            newItems = if (qty > 0) s.newItems + id else if (n == 0) s.newItems - id else s.newItems,
        )
    }

    fun toast(kind: ToastKind, arg: String = "") = reward { Reward.Toast(it, kind, arg) }
}
