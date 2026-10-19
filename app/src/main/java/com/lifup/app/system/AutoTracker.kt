package com.lifup.app.system

import android.Manifest
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.lifup.app.LifUpApp
import com.lifup.app.domain.AutoReading
import com.lifup.app.domain.GameState
import com.lifup.app.domain.applyAuto
import com.lifup.app.domain.runCheckpoint
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

/** Reads steps (hardware step counter and Play services history) and screen time (usage stats) for automatic quests. */
object AutoTracker {
    private const val PREFS = "auto_tracker"

    fun hasStepSensor(c: Context) =
        (c.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null

    fun stepsAvailable(c: Context) = hasStepSensor(c) &&
        (Build.VERSION.SDK_INT < 29 || ContextCompat.checkSelfPermission(c, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED)

    /** Measurements for [day]. Today's reading also advances the step baseline. */
    suspend fun read(c: Context, day: LocalDate, s: GameState): AutoReading {
        val zone = ZoneId.systemDefault()
        val start = day.atStartOfDay(zone).toInstant().toEpochMilli()
        val end = minOf(day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), System.currentTimeMillis())
        val usage = if (Permissions.usageAccess(c)) runCatching { screenMinutes(c, start, end, s.settings.blockedApps.toSet()) }.getOrNull() else null
        return AutoReading(
            day = day.toString(),
            steps = listOfNotNull(stepCounter(c)?.let { stepsFor(c, day.toString(), it) }, StepHistory.steps(c, day)).maxOrNull(),
            screenMinutes = usage?.first,
            distractionMinutes = usage?.second?.takeIf { s.settings.blockedApps.isNotEmpty() },
        )
    }

    // ── Steps ─────────────────────────────────────────────────────────────────

    /**
     * Steps since boot, or null without the sensor or the permission. Some sensors (Xiaomi) only
     * report when a step happens, so a quiet read falls back to the last value seen this boot.
     */
    suspend fun stepCounter(c: Context): Long? {
        if (!stepsAvailable(c)) return null
        val sm = c.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return null
        return withTimeoutOrNull(4_000) {
            suspendCancellableCoroutine { cont ->
                val listener = object : SensorEventListener {
                    override fun onSensorChanged(e: SensorEvent) {
                        sm.unregisterListener(this)
                        if (cont.isActive) cont.resume(e.values[0].toLong())
                    }
                    override fun onAccuracyChanged(s: Sensor?, a: Int) = Unit
                }
                sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL, Handler(Looper.getMainLooper()))
                sm.flush(listener) // nudges batching sensors into reporting their current value
                cont.invokeOnCancellation { sm.unregisterListener(listener) }
            }
        } ?: lastSeen(c)
    }

    private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun bootAt() = System.currentTimeMillis() - SystemClock.elapsedRealtime()

    private fun lastSeen(c: Context): Long? = prefs(c).takeIf { it.getLong("lastAt", 0) > bootAt() }?.getLong("last", 0)

    /**
     * The hardware counter only knows "steps since boot", so every value seen goes through here to
     * keep a per-day baseline: steps today = carried (before a reboot) + counter − baseline. A new day
     * starts from the last value seen the day before, so steps walked before the first reading of
     * the day still count. Returns (today's steps, yesterday's final steps or null).
     */
    @Synchronized
    private fun observe(c: Context, counter: Long): Pair<Int, Pair<String, Int>?> {
        val p = prefs(c)
        val today = LocalDate.now()
        var day = p.getString("day", null)
        var base = p.getLong("base", counter)
        var carry = p.getLong("carry", 0)
        var last = p.getLong("last", counter)
        val edit = p.edit()
        if (day != null && p.getLong("lastAt", 0) <= bootAt()) { // rebooted: the counter restarted from zero
            carry += (last - base).coerceAtLeast(0)
            base = 0; last = 0
        }
        if (day != today.toString()) {
            if (day != null) edit.putString("prevDay", day).putInt("prevSteps", (carry + last - base).coerceAtLeast(0).toInt())
            base = if (day == today.minusDays(1).toString() && counter >= last) last else counter
            carry = 0
            day = today.toString()
        }
        val steps = (carry + counter - base).coerceAtLeast(0).toInt()
        edit.putString("day", day).putLong("base", base).putLong("carry", carry)
            .putLong("last", counter).putLong("lastAt", System.currentTimeMillis()).apply()
        val prev = p.getString("prevDay", null)?.let { it to p.getInt("prevSteps", 0) }
        return steps to prev
    }

    /** Steps for [day] from a fresh counter value: today's count, or the final count of the day before. */
    private fun stepsFor(c: Context, day: String, counter: Long): Int? {
        val (today, prev) = observe(c, counter)
        return when (day) {
            LocalDate.now().toString() -> today
            prev?.first -> prev.second
            else -> null
        }
    }

    // ── Screen time ───────────────────────────────────────────────────────────

    /** Foreground minutes between [start] and [end]: (all apps, only [distraction] apps). */
    private fun screenMinutes(c: Context, start: Long, end: Long, distraction: Set<String>): Pair<Double, Double> {
        val usm = c.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val ignored = homeApps(c) + setOf(c.packageName, "com.android.systemui")
        val events = usm.queryEvents(start - 3 * 3_600_000L, end)
        val ev = UsageEvents.Event()
        var open: String? = null
        var openSince = 0L
        var total = 0L
        var distracted = 0L
        fun close(at: Long) {
            val pkg = open ?: return
            val from = maxOf(openSince, start)
            val to = minOf(at, end)
            if (to > from && pkg !in ignored) {
                total += to - from
                if (pkg in distraction) distracted += to - from
            }
            open = null
        }
        while (events.hasNextEvent()) {
            events.getNextEvent(ev)
            when (ev.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> { close(ev.timeStamp); open = ev.packageName; openSince = ev.timeStamp }
                UsageEvents.Event.ACTIVITY_PAUSED -> if (ev.packageName == open) close(ev.timeStamp)
                UsageEvents.Event.SCREEN_NON_INTERACTIVE -> close(ev.timeStamp)
            }
        }
        close(end)
        return total / 60_000.0 to distracted / 60_000.0
    }

    private fun homeApps(c: Context): Set<String> =
        c.packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)
            .map { it.activityInfo.packageName }.toSet()

    /** Reads today's values and applies them; also credits steps of a run in progress. */
    suspend fun sync(c: Context) {
        val store = LifUpApp.store
        val s = store.current
        if (s.run?.running == true) stepCounter(c)?.let { n -> store.dispatch { runCheckpoint(n) } }
        val reading = read(c, LocalDate.now(), s)
        Alarms.maybeWarnLimits(c, store.dispatch { applyAuto(reading) })
    }

    /** Dispatches [action] after recording the final values of a day that is about to close. */
    suspend fun dispatchCatchingUp(c: Context, action: com.lifup.app.domain.Tx.() -> Unit = {}): GameState {
        val store = LifUpApp.store
        val final = readBeforeClose(c, store.current)
        return store.dispatch(before = { final?.let { applyAuto(it) } }, action = action)
    }

    /** Before a day closes, record its final values so the close-out judges them correctly. */
    suspend fun readBeforeClose(c: Context, s: GameState): AutoReading? {
        if (s.day.isEmpty() || s.day >= LocalDate.now().toString()) return null
        return read(c, LocalDate.parse(s.day), s)
    }
}

/** Refreshes automatic quests every 15 minutes, even with the app closed. */
class AutoWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        AutoTracker.sync(applicationContext)
        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "auto-sync", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<AutoWorker>(15, TimeUnit.MINUTES).build(),
            )
        }
    }
}
