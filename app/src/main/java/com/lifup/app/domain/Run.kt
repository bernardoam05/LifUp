package com.lifup.app.domain

import kotlinx.serialization.Serializable

/**
 * A run tracked with the hardware step counter (no GPS). Distance is credited at each checkpoint;
 * between checkpoints the counter keeps counting on its own, so nothing needs to stay awake.
 */
@Serializable
data class RunSession(
    val questId: String,
    val startedAt: Long,
    /** Active time of finished segments. */
    val activeMs: Long = 0,
    /** Start of the current segment; null while paused. */
    val segmentAt: Long? = null,
    val checkAt: Long = 0,
    /** Step counter value at the last checkpoint. */
    val counterAt: Long = 0,
    val steps: Long = 0,
    val km: Double = 0.0,
) {
    val running get() = segmentAt != null
    fun elapsed(now: Long) = activeMs + (segmentAt?.let { now - it } ?: 0)
}

/** Stride estimates from body height (walking ≈ 0.415 × height, running ≈ 0.65 × height). */
object Stride {
    /** Steps per minute from which a stretch counts as running. */
    const val RUN_CADENCE = 130.0
    /** Faster than this is a shaken phone, not a runner. */
    const val MAX_CADENCE = 230.0

    fun walkM(heightCm: Int) = heightCm * 0.415 / 100
    fun runM(heightCm: Int) = heightCm * 0.65 / 100

    fun walkKm(steps: Long, heightCm: Int) = steps * walkM(heightCm) / 1000

    fun km(steps: Long, minutes: Double, heightCm: Int): Double {
        if (steps <= 0) return 0.0
        val counted = if (minutes >= 1) minOf(steps.toDouble(), MAX_CADENCE * minutes) else steps.toDouble()
        val cadence = if (minutes > 0) counted / minutes else 0.0
        return counted * (if (cadence >= RUN_CADENCE) runM(heightCm) else walkM(heightCm)) / 1000
    }
}

fun Tx.startRun(questId: String, counter: Long) {
    val q = s.allQuests.firstOrNull { it.id == questId } ?: return
    if (q.type != QuestType.GPS || q.status != QuestStatus.OPEN) return
    s.run?.let { if (it.questId == questId) return else finishRun(counter) }
    s = s.copy(run = RunSession(questId, ctx.now, segmentAt = ctx.now, checkAt = ctx.now, counterAt = counter))
}

/** Turns steps since the last checkpoint into distance. Short windows wait unless [force]d (batched counters). */
fun Tx.runCheckpoint(counter: Long, force: Boolean = false) {
    val r = s.run ?: return
    if (!r.running) return
    val minutes = (ctx.now - r.checkAt) / 60_000.0
    if (!force && minutes < 1) return
    val steps = if (counter >= r.counterAt) counter - r.counterAt else counter // counter restarts after a reboot
    val km = Stride.km(steps, minutes, s.settings.heightCm)
    s = s.copy(run = r.copy(checkAt = ctx.now, counterAt = counter, steps = r.steps + steps, km = r.km + km))
    creditGps(r.questId, km)
    if (s.allQuests.none { it.id == r.questId && it.status == QuestStatus.OPEN }) s = s.copy(run = null)
}

fun Tx.pauseRun(counter: Long) {
    runCheckpoint(counter, force = true)
    val r = s.run ?: return
    if (r.running) s = s.copy(run = r.copy(activeMs = r.elapsed(ctx.now), segmentAt = null))
}

fun Tx.resumeRun(counter: Long) {
    val r = s.run ?: return
    if (!r.running) s = s.copy(run = r.copy(segmentAt = ctx.now, checkAt = ctx.now, counterAt = counter))
}

fun Tx.finishRun(counter: Long?) {
    if (counter != null) runCheckpoint(counter, force = true)
    s = s.copy(run = null)
}

/** For distance done without tracking (forgot to start, treadmill, phone left at home). */
fun Tx.logDistance(questId: String, km: Double) {
    if (km <= 0 || km > 100) return
    creditGps(questId, km)
}
