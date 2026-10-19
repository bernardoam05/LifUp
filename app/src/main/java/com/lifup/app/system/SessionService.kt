package com.lifup.app.system

import android.app.ActivityManager
import android.app.Notification
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.FocusSession
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Pomodoro
import com.lifup.app.domain.text
import com.lifup.app.domain.elapsedMinutes
import com.lifup.app.domain.endsAt
import com.lifup.app.domain.penaltyBlockActive
import com.lifup.app.domain.recordBlockedAttempt

/** What the blocker must enforce right now, derived from the game state. */
data class BlockPlan(val packages: Set<String>, val until: Long, val penalty: Boolean)

fun GameState.blockPlan(now: Long): BlockPlan? {
    val apps = settings.blockedApps.toSet()
    if (apps.isEmpty()) return null
    if (penaltyBlockActive(now)) return BlockPlan(apps, penalty.blockEnd, penalty = true)
    val f = focus ?: return null
    if (!f.blockApps || f.endsAt() <= now) return null
    // Pomodoro breaks are real breaks: apps are free until the next work block.
    val phase = f.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(now)) }
    if (phase?.work == false) return null
    val until = phase?.let { f.startedAt + (it.endsAtMin * 60_000).toLong() } ?: f.endsAt()
    return BlockPlan(apps, until, penalty = false)
}

/**
 * Foreground service alive during a focus session or a penalty block. It shows the countdown,
 * plays the ambient sound, announces Pomodoro phases and blocks the chosen apps with an overlay.
 * It never owns state: everything is read from [LifUpApp.store].
 */
class SessionService : Service() {

    companion object {
        const val OWN_PACKAGE = "com.lifup.app"
        @Volatile var instance: SessionService? = null
        @Volatile var lastForegroundPkg: String? = null
        @Volatile private var lastForegroundMs = 0L

        fun needed(s: GameState, now: Long) = s.focus != null || s.penaltyBlockActive(now)

        fun sync(context: Context, s: GameState) {
            val now = System.currentTimeMillis()
            val running = instance
            when {
                needed(s, now) && running == null -> runCatching {
                    ContextCompat.startForegroundService(context, Intent(context, SessionService::class.java))
                }
                needed(s, now) -> running?.handler?.post { running.refresh() }
                running != null -> running.handler.post { running.stopSelf() }
                else -> FocusDnd.set(context, false) // a session that ended while the app was gone
            }
        }

        /** Called by the accessibility service with the app that just came to the front. */
        fun onForegroundApp(pkg: String) {
            val now = System.currentTimeMillis()
            val inst = instance
            val plan = inst?.plan
            // Launchers fire a window event right after the blocked app; ignore that bounce.
            val prev = lastForegroundPkg
            if (plan != null && prev != null && prev in plan.packages && now - lastForegroundMs < 1_500 && pkg !in plan.packages && pkg != OWN_PACKAGE) return
            lastForegroundPkg = pkg
            lastForegroundMs = now
            inst?.onDetected(pkg, fromAccessibility = true)
        }
    }

    val handler = Handler(Looper.getMainLooper())
    private val pollThread = HandlerThread("BlockerPoll", android.os.Process.THREAD_PRIORITY_AUDIO)
    private lateinit var pollHandler: Handler
    private lateinit var windowManager: WindowManager
    private lateinit var usage: UsageStatsManager
    private var wakeLock: PowerManager.WakeLock? = null
    private var overlay: LinearLayout? = null
    private var overlayShownAt = 0L
    private var killedAt = 0L
    private var player: MediaPlayer? = null
    private var playingAmbient: String? = null
    private var lastPhase: Pomodoro.Phase? = null
    /** What the ongoing notification currently shows; it's only re-posted when this changes. */
    private var postedKey: String? = null
    private val launchable = HashMap<String, Boolean>()

    @Volatile var plan: BlockPlan? = null
        private set

    private val store get() = LifUpApp.store

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        usage = getSystemService(USAGE_STATS_SERVICE) as UsageStatsManager
        pollThread.start()
        pollHandler = Handler(pollThread.looper)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, Notifications.ID_SESSION, buildNotification(), type)
        refresh()
        return START_STICKY
    }

    override fun onBind(intent: Intent?) = null

    override fun onDestroy() {
        instance = null
        handler.removeCallbacksAndMessages(null)
        pollHandler.removeCallbacksAndMessages(null)
        pollThread.quitSafely()
        removeOverlay()
        stopAmbient()
        releaseWakeLock()
        FocusDnd.set(this, false)
        super.onDestroy()
    }

    /** Re-reads the state; stops itself when nothing is left to do. */
    fun refresh() {
        val s = store.current
        val now = System.currentTimeMillis()
        if (!needed(s, now)) {
            // Let the engine settle a finished session, then stop.
            store.fire()
            stopSelf()
            return
        }
        val newPlan = s.blockPlan(now)
        plan = newPlan
        if (newPlan != null) { acquireWakeLock(); schedulePoll() } else { releaseWakeLock(); removeOverlay() }
        syncAmbient(s.focus)
        handler.removeCallbacks(tick)
        handler.post(tick)
    }

    private val tick = object : Runnable {
        override fun run() {
            val s = store.current
            val now = System.currentTimeMillis()
            val f = s.focus
            if (f != null && now >= f.endsAt()) {
                // The engine settles the session; the state change then stops this service.
                store.fire()
                handler.postDelayed(this, 2_000)
                return
            }
            if (!needed(s, now)) { stopSelf(); return }
            if (s.blockPlan(now) != plan) refresh()
            // Silence during focus phases only: Pomodoro breaks let notifications through.
            val working = f != null && f.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(now)).work } != false
            FocusDnd.set(this@SessionService, s.settings.dndFocus && working)
            f?.pomodoro?.let { p ->
                val phase = Pomodoro.phaseAt(p, f.elapsedMinutes(now))
                val prev = lastPhase
                if (prev != null && (prev.work != phase.work || prev.cycle != phase.cycle)) {
                    Notifications.pomodoroPhase(this@SessionService, phase.work, phase.cycle)
                }
                lastPhase = phase
            }
            val key = notificationKey()
            if (key != postedKey) {
                postedKey = key
                val nm = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
                nm.notify(Notifications.ID_SESSION, buildNotification())
                com.lifup.app.widget.Widgets.refreshSoon(this@SessionService)
            }
            handler.postDelayed(this, 15_000)
        }
    }

    // ── Ambient sound ─────────────────────────────────────────────────────────

    private fun syncAmbient(f: FocusSession?) {
        val wanted = f?.ambient?.takeIf { store.current.settings.sound }
        if (wanted == playingAmbient) return
        stopAmbient()
        if (wanted != null) playAmbient(wanted)
    }

    private fun playAmbient(kind: String) {
        val tracks = Ambient.tracks(kind)
        if (tracks.isEmpty()) return
        playingAmbient = kind
        fun next() {
            player?.release()
            player = MediaPlayer.create(this, tracks.random())?.apply {
                setOnCompletionListener { if (playingAmbient == kind) next() }
                start()
            }
        }
        next()
    }

    private fun stopAmbient() {
        playingAmbient = null
        player?.run { runCatching { stop() }; release() }
        player = null
    }

    // ── App blocking ──────────────────────────────────────────────────────────

    private val poll = object : Runnable {
        override fun run() {
            if (plan == null) return
            val now = System.currentTimeMillis()
            val top = runCatching { foregroundPackage(now) }.getOrNull()
            if (top != null) handler.post { onDetected(top, fromAccessibility = false) }
            pollHandler.postDelayed(this, 500)
        }
    }

    private fun schedulePoll() {
        pollHandler.removeCallbacks(poll)
        pollHandler.post(poll)
    }

    private fun isLaunchable(pkg: String) = launchable.getOrPut(pkg) { packageManager.getLaunchIntentForPackage(pkg) != null }

    fun onDetected(pkg: String, fromAccessibility: Boolean) {
        val p = plan ?: return removeOverlay()
        val now = System.currentTimeMillis()
        if (overlay != null && !Settings.canDrawOverlays(this)) overlay = null
        if (pkg == OWN_PACKAGE) {
            // The overlay's own addView fires an event for our package; don't remove it for that echo.
            if (!(fromAccessibility && overlay != null && now - overlayShownAt < 500)) removeOverlay()
            return
        }
        if (overlay == null && now - killedAt < 3_000) return
        val blocked = now < p.until && pkg in p.packages
        when {
            blocked -> showOverlay(pkg, p)
            !fromAccessibility && overlay != null && isLaunchable(pkg) -> removeOverlay()
        }
    }

    fun checkNow() {
        val top = runCatching { foregroundPackage(System.currentTimeMillis()) }.getOrNull() ?: return
        onDetected(top, fromAccessibility = false)
    }

    private fun foregroundPackage(now: Long): String? {
        val events = usage.queryEvents(now - 300_000, now)
        val resumed = HashMap<String, Long>()
        val paused = HashMap<String, Long>()
        val ev = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(ev)
            when (ev.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> if ((resumed[ev.packageName] ?: 0) < ev.timeStamp) resumed[ev.packageName] = ev.timeStamp
                UsageEvents.Event.ACTIVITY_PAUSED -> if ((paused[ev.packageName] ?: 0) < ev.timeStamp) paused[ev.packageName] = ev.timeStamp
            }
        }
        resumed.entries.filter { (pkg, at) -> at > (paused[pkg] ?: 0) }.maxByOrNull { it.value }?.let { return it.key }
        return usage.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 3_000, now)
            ?.filter { it.lastTimeUsed > now - 3_000 }?.maxByOrNull { it.lastTimeUsed }?.packageName
    }

    private fun showOverlay(blockedPkg: String, p: BlockPlan) {
        if (overlay != null || !Settings.canDrawOverlays(this)) return
        store.fire { recordBlockedAttempt() }
        val accent = Color.parseColor(if (p.penalty) "#EF4444" else "#00D4FF")
        val dp = resources.displayMetrics.density
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#F00B0D14"))
            isClickable = true
            setOnTouchListener { _, _ -> true }
        }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            background = GradientDrawable().apply { cornerRadius = 20 * dp; setColor(Color.parseColor("#141824")); setStroke((2 * dp).toInt(), accent) }
            setPadding((24 * dp).toInt(), (32 * dp).toInt(), (24 * dp).toInt(), (24 * dp).toInt())
            layoutParams = LinearLayout.LayoutParams((resources.displayMetrics.widthPixels * 0.85).toInt(), LinearLayout.LayoutParams.WRAP_CONTENT)
        }
        fun text(value: String, size: Float, color: Int, top: Int = 0) = TextView(this).apply {
            text = value; textSize = size; setTextColor(color); gravity = Gravity.CENTER
            setPadding(0, (top * dp).toInt(), 0, 0)
        }
        val minLeft = ((p.until - System.currentTimeMillis()) / 60_000).coerceAtLeast(0)
        val left = if (minLeft >= 60) "${minLeft / 60}h ${minLeft % 60}m" else "${minLeft}m"
        val quotes = resources.getStringArray(R.array.block_quotes)
        card.addView(text(getString(if (p.penalty) R.string.block_penalty_title else R.string.block_focus_title), 22f, accent))
        card.addView(text(if (p.penalty) getString(R.string.block_penalty_text) else quotes.random(), 15f, Color.parseColor("#C8CAD4"), 12))
        card.addView(text(getString(R.string.block_time_left, left), 13f, Color.parseColor("#8E8E9F"), 16))
        card.addView(text(getString(R.string.block_close), 15f, Color.parseColor("#E0E0E6"), 28).apply {
            setPadding(0, (28 * dp).toInt(), 0, (8 * dp).toInt())
            setOnClickListener {
                killedAt = System.currentTimeMillis()
                // Open our app before removing the overlay: a service may only start activities while it has a window.
                packageManager.getLaunchIntentForPackage(OWN_PACKAGE)?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    runCatching { startActivity(it) }
                }
                removeOverlay()
                runCatching { (getSystemService(ACTIVITY_SERVICE) as ActivityManager).killBackgroundProcesses(blockedPkg) }
            }
        })
        root.addView(card)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        )
        overlay = root
        runCatching { windowManager.addView(root, params); overlayShownAt = System.currentTimeMillis() }.onFailure { overlay = null }
    }

    private fun removeOverlay() {
        val v = overlay ?: return
        overlay = null
        runCatching { windowManager.removeViewImmediate(v) }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        wakeLock = (getSystemService(POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LifUp:Blocker").also { it.acquire(26 * 3_600_000L) }
    }

    private fun releaseWakeLock() {
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    // ── Notification ──────────────────────────────────────────────────────────

    private fun notificationKey(): String {
        val s = store.current
        val f = s.focus ?: return "penalty:${s.penalty.blockEnd}"
        val phase = f.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(System.currentTimeMillis())) }
        return "focus:${f.startedAt}:${phase?.work}:${phase?.cycle}"
    }

    /** Counts down on its own (chronometer), so it never needs re-posting just to tick. */
    private fun buildNotification(): Notification {
        val s = store.current
        val now = System.currentTimeMillis()
        val f = s.focus
        val phase = f?.pomodoro?.let { Pomodoro.phaseAt(it, f.elapsedMinutes(now)) }
        val title = when {
            f == null -> getString(R.string.session_penalty_title)
            phase == null -> getString(R.string.session_focus_title)
            phase.work -> getString(R.string.pomodoro_work_open, phase.cycle)
            else -> getString(R.string.pomodoro_break_open, phase.cycle)
        }
        val end = when {
            f == null -> s.penalty.blockEnd
            phase != null -> f.startedAt + (phase.endsAtMin * 60_000).toLong()
            else -> f.endsAt()
        }
        val countUp = f?.open == true && phase == null
        val mission = f?.questId?.let { id -> s.allQuests.firstOrNull { it.id == id } }
        val b = NotificationCompat.Builder(this, Notifications.CH_SESSION)
            .setSmallIcon(R.drawable.ic_stat_lifup)
            .setContentTitle(title)
            .setContentText(mission?.title?.text(java.util.Locale.getDefault().language))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(!countUp)
            .setWhen(if (countUp) f!!.startedAt else end)
            .setContentIntent(Notifications.openApp(this, "focus"))
        // A "no quitting" session can't be stopped from here: that choice costs minutes and stays in the app.
        if (f != null && !f.strict) b.addAction(0, getString(R.string.stop), NotificationActionReceiver.intent(this, NotificationActionReceiver.STOP_FOCUS))
        return b.build()
    }
}

object Ambient {
    val kinds = listOf("rain", "fire", "lofi")

    fun tracks(kind: String): List<Int> = when (kind) {
        "rain" -> listOf(R.raw.ambient_rain_1, R.raw.ambient_rain_2, R.raw.ambient_rain_3, R.raw.ambient_rain_4)
        "fire" -> listOf(R.raw.ambient_fire_1, R.raw.ambient_fire_2, R.raw.ambient_fire_3, R.raw.ambient_fire_4)
        "lofi" -> listOf(R.raw.ambient_lofi_1, R.raw.ambient_lofi_2, R.raw.ambient_lofi_3, R.raw.ambient_lofi_4, R.raw.ambient_lofi_5, R.raw.ambient_lofi_6)
        else -> emptyList()
    }
}
