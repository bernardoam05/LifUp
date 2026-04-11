package com.lifup.app.focusblocker

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.*
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.lifup.app.R
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.app.AlarmManager
import android.app.PendingIntent

class FocusBlockerService : Service() {

    companion object {
        const val ACTION_START       = "com.lifup.app.FOCUS_START"
        const val ACTION_STOP        = "com.lifup.app.FOCUS_STOP"
        const val ACTION_UPDATE_APPS = "com.lifup.app.FOCUS_UPDATE_APPS"
        const val ACTION_KEEPALIVE   = "com.lifup.app.FOCUS_KEEPALIVE"
        const val EXTRA_BLOCKED_PACKAGES = "blocked_packages"
        const val EXTRA_START_TIME_MS    = "start_time_ms"
        const val EXTRA_END_TIME_MS      = "end_time_ms"
        const val CHANNEL_ID = "focus_blocker_channel"
        const val NOTIF_ID   = 1337
        const val KEEPALIVE_REQUEST_CODE = 4242

        // The own app package — overlay must NEVER block this
        const val OWN_PACKAGE = "com.lifup.app"

        @Volatile var isRunning = false

        // ── Accessibility Service integration ─────────────────────────────────
        // Real-time foreground package, updated by FocusAccessibilityService.
        // Takes priority over UsageStats polling (no delay, works after kill+relaunch).
        @Volatile var lastKnownForegroundPkg: String? = null
        // Timestamp (ms) when lastKnownForegroundPkg was last updated.
        // Used to expire stale values when AccService is disconnected.
        @Volatile var lastKnownForegroundPkgMs: Long = 0L
        @Volatile var serviceInstance: FocusBlockerService? = null

        // Mirror of blockedPackages exposed for AccService race-condition guard.
        @Volatile var runningBlockedPackages: Set<String> = emptySet()

        fun notifyForegroundPackage(pkg: String) {
            val now = System.currentTimeMillis()
            val prev = lastKnownForegroundPkg

            // Suppress launcher transition events: launchers (Samsung, MIUI, Pixel) fire
            // TYPE_WINDOW_STATE_CHANGED a few ms AFTER the blocked app's event.
            // They have launchable activities so they pass the isLaunchableApp filter.
            // If we let them through, the ACC path would be called with the launcher pkg
            // and skip showing the overlay (launcher is not blocked).
            if (prev != null
                && runningBlockedPackages.contains(prev)
                && now - lastKnownForegroundPkgMs < 1_500L
                && !runningBlockedPackages.contains(pkg)
                && pkg != OWN_PACKAGE) {
                return // launcher transition — ignore
            }

            lastKnownForegroundPkg = pkg
            lastKnownForegroundPkgMs = now
            // Direct call — accessibility callbacks already run on the main thread,
            // so there is no need for handler.post(). On MIUI/HyperOS, handler.post()
            // from a background service is throttled (delayed seconds) unless the user
            // interacts with the device. Calling directly bypasses that throttle.
            // We pass `now` so onAccForeground can detect MIUI batch-delivery staleness.
            serviceInstance?.onAccForeground(pkg, now)
        }
    }

    private var blockedPackages: List<String> = emptyList()
    private val launchableCache = HashMap<String, Boolean>()

    private fun isLaunchableApp(pkg: String): Boolean {
        return launchableCache.getOrPut(pkg) {
            packageManager.getLaunchIntentForPackage(pkg) != null
        }
    }
    private var startTimeMs: Long = 0L
    private var endTimeMs: Long = 0L
    private var isPenaltyMode: Boolean = false
    private var isHardcoreMode: Boolean = false
    private var wakeLock: PowerManager.WakeLock? = null

    // Dedicated background thread for UsageStats polling.
    // MIUI/HyperOS puts background processes in a throttled cgroup; the main looper
    // can be delayed by 5-10 s, making handler.postDelayed(500ms) fire ~every 5-10 s.
    // Running detection in a separate HandlerThread with elevated priority ensures the
    // 500 ms poll cycle fires on time. Only the tiny overlay add/remove ops are posted
    // back to the main thread via `handler.post()` (non-delayed → processed promptly).
    private val pollThread = HandlerThread("FocusBlockerPoll", android.os.Process.THREAD_PRIORITY_AUDIO)
    private lateinit var pollHandler: Handler

    private var overlayView: LinearLayout? = null
    private var overlayShownAtMs: Long = 0L
    // Set when the user taps FECHAR and we call killBackgroundProcesses.
    // killBackgroundProcesses does NOT emit ACTIVITY_PAUSED in UsageStats for 2-3 s,
    // so the killed app would appear foreground and re-show the overlay inside our own app.
    // The guard is ONLY activated here — never refreshed by normal navigation — so the
    // polling path (UsageStats) runs freely at all other times.
    private var blockedAppKilledAt: Long = 0L
    internal val handler = Handler(Looper.getMainLooper())
    private lateinit var windowManager: WindowManager
    private lateinit var usageStatsManager: UsageStatsManager

    // ── WakeLock ───────────────────────────────────────────────────────────────
    // PARTIAL_WAKE_LOCK keeps the CPU alive and prevents MIUI/HyperOS from
    // deprioritizing (throttling) our process when the screen is on but the user
    // is in a different app. Without it, handler.post() calls can be delayed by
    // several seconds, which is why pulling the notification bar (user interaction)
    // was the only thing that "woke up" the blocker.

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SoloLeveling:FocusBlocker"
        ).also { it.acquire() }
    }

    private fun releaseWakeLock() {
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    // ── Persistence ────────────────────────────────────────────────────────────
    private fun saveState() {
        val prefs = getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putLong("startTimeMs", startTimeMs)
            .putLong("endTimeMs", endTimeMs)
            .putBoolean("isPenaltyMode", isPenaltyMode)
            .putBoolean("isHardcoreMode", isHardcoreMode)
            .putString("blockedPackages", JSONArray(blockedPackages).toString())
            .apply()
    }

    private fun restoreState() {
        val prefs = getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        startTimeMs = prefs.getLong("startTimeMs", 0L)
        endTimeMs = prefs.getLong("endTimeMs", 0L)
        isPenaltyMode = prefs.getBoolean("isPenaltyMode", false)
        isHardcoreMode = prefs.getBoolean("isHardcoreMode", false)
        val pkgsStr = prefs.getString("blockedPackages", "[]") ?: "[]"
        try {
            val arr = JSONArray(pkgsStr)
            val list = mutableListOf<String>()
            for (i in 0 until arr.length()) list.add(arr.getString(i))
            blockedPackages = list
        } catch (e: Exception) {
            blockedPackages = emptyList()
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        serviceInstance   = this
        windowManager     = getSystemService(WINDOW_SERVICE) as WindowManager
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        pollThread.start()
        pollHandler = Handler(pollThread.looper)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                blockedPackages = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES) ?: emptyList()
                runningBlockedPackages = blockedPackages.toHashSet()
                startTimeMs     = intent.getLongExtra(EXTRA_START_TIME_MS, 0L)
                endTimeMs       = intent.getLongExtra(EXTRA_END_TIME_MS, 0L)
                isPenaltyMode   = intent.getBooleanExtra("extra_is_penalty", false)

                // Keep default start time logic if startTimeMs wasn't provided (backwards compat)
                if (startTimeMs == 0L && endTimeMs > 0L) {
                    startTimeMs = System.currentTimeMillis()
                }

                // Hardcore: session duration >= 100 days (effectively infinite)
                isHardcoreMode = (endTimeMs - startTimeMs) >= 100L * 24 * 3_600_000

                saveState()
                isRunning       = true
                acquireWakeLock()
                startForeground(NOTIF_ID, buildNotification())
                schedulePoll()
                scheduleNotifUpdates()
                scheduleKeepaliveAlarm()
            }
            ACTION_STOP -> {
                cancelKeepaliveAlarm()
                releaseWakeLock()
                getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE).edit().clear().apply()
                stopSelf()
            }
            ACTION_UPDATE_APPS -> {
                val newPkgs = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES)
                if (newPkgs != null) {
                    blockedPackages = newPkgs
                    runningBlockedPackages = blockedPackages.toHashSet()
                    saveState()
                }
                checkForegroundApp()
            }
            null, ACTION_KEEPALIVE -> {
                // START_STICKY restart or AlarmManager keepalive
                restoreState()
                runningBlockedPackages = blockedPackages.toHashSet()
                if (System.currentTimeMillis() >= endTimeMs) {
                    cancelKeepaliveAlarm()
                    stopSelf()
                } else {
                    isRunning = true
                    acquireWakeLock()
                    startForeground(NOTIF_ID, buildNotification())
                    schedulePoll()
                    scheduleNotifUpdates()
                    scheduleKeepaliveAlarm() // reschedule for next cycle
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        serviceInstance = null
        runningBlockedPackages = emptySet()
        handler.removeCallbacksAndMessages(null)
        pollHandler.removeCallbacksAndMessages(null)
        pollThread.quitSafely()
        removeOverlay()
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null

    // ── Polling ────────────────────────────────────────────────────────────────
    // Detection (UsageStats query) runs on pollThread (THREAD_PRIORITY_AUDIO) so the
    // 500 ms cadence is immune to MIUI main-looper throttling.
    // Overlay show/remove are posted back to the main thread via handler.post()
    // (non-delayed, so they execute on the next looper spin — much faster than a 500 ms
    // postDelayed which MIUI would defer to whenever it decides to wake up the main thread).

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            val now = System.currentTimeMillis()
            val topPkg = try { getForegroundPackage(now) } catch (_: Exception) { null }
            if (topPkg != null) {
                val capturedNow = now
                handler.post { onPollDetect(topPkg, capturedNow) }
            }
            pollHandler.postDelayed(this, 500)
        }
    }

    private fun schedulePoll() {
        pollHandler.removeCallbacks(pollRunnable)
        pollHandler.post(pollRunnable)
    }

    // Called on the main thread after the poll thread detects a foreground package.
    private fun onPollDetect(topPkg: String, detectedAtMs: Long) {
        if (!isRunning) return
        val now = System.currentTimeMillis()
        if (overlayView != null && !android.provider.Settings.canDrawOverlays(this)) {
            overlayView = null
        }
        if (overlayView == null && now - blockedAppKilledAt < 3_000L) return
        if (topPkg == OWN_PACKAGE) { removeOverlay(); return }
        val isExpired = now >= endTimeMs || now < startTimeMs
        val isBlocked = !isExpired && blockedPackages.contains(topPkg)
        if (isBlocked) {
            showOverlay(topPkg)
        } else if (overlayView != null && isLaunchableApp(topPkg)) {
            removeOverlay()
        }
    }

    // ── Notification timer update ──────────────────────────────────────────────

    private val notifRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(NOTIF_ID, buildNotification())
            handler.postDelayed(this, 60_000)
        }
    }

    private fun scheduleNotifUpdates() {
        handler.removeCallbacks(notifRunnable)
        handler.postDelayed(notifRunnable, 60_000)
    }

    private fun getForegroundPackage(now: Long): String? {
        // Method 1: UsageEvents — 5-minute window (fixes the 30s expiry bug)
        val events = usageStatsManager.queryEvents(now - 300_000, now)
        val lastResumed = HashMap<String, Long>()
        val lastPaused  = HashMap<String, Long>()
        val ev = UsageEvents.Event()

        while (events.hasNextEvent()) {
            events.getNextEvent(ev)
            when (ev.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED ->
                    if ((lastResumed[ev.packageName] ?: 0L) < ev.timeStamp)
                        lastResumed[ev.packageName] = ev.timeStamp
                UsageEvents.Event.ACTIVITY_PAUSED  ->
                    if ((lastPaused[ev.packageName] ?: 0L) < ev.timeStamp)
                        lastPaused[ev.packageName] = ev.timeStamp
            }
        }

        val topFromEvents = lastResumed.entries
            .filter { (pkg, resumedAt) -> resumedAt > (lastPaused[pkg] ?: 0L) }
            .maxByOrNull { it.value }
            ?.key

        if (topFromEvents != null) return topFromEvents

        // Method 2: queryUsageStats fallback — catches long-running sessions where
        // ACTIVITY_RESUMED left the 5-minute event window but the app is still open.
        return try {
            usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 3_000, now)
                ?.filter { it.lastTimeUsed > now - 3_000 }
                ?.maxByOrNull { it.lastTimeUsed }
                ?.packageName
        } catch (_: Exception) { null }
    }

    // ── ACC fast path ─────────────────────────────────────────────────────────
    // Called directly from notifyForegroundPackage (accessibility callback = main thread).
    // eventTimeMs = wall-clock time when the ACC event actually fired.

    internal fun onAccForeground(pkg: String, eventTimeMs: Long) {
        val now = System.currentTimeMillis()
        val eventAge = now - eventTimeMs   // how stale this event is

        if (overlayView != null && !android.provider.Settings.canDrawOverlays(this)) {
            overlayView = null
        }

        if (pkg == OWN_PACKAGE) {
            // The overlay's own windowManager.addView() fires TYPE_WINDOW_STATE_CHANGED
            // with OWN_PACKAGE within a few ms. We must NOT remove the overlay for that
            // reflexive event, or it would vanish the instant it's shown.
            // We distinguish it by checking that both the event AND the overlay are fresh
            // (< 500 ms old). Any genuine "user navigated to our app" event — including
            // MIUI batch-delivered stale ones — falls outside this window and removes the overlay.
            val isAddViewReflexive = overlayView != null
                && eventAge < 500L
                && (now - overlayShownAtMs) < 500L
            if (!isAddViewReflexive) {
                removeOverlay()
            }
            return
        }

        val isExpired = now >= endTimeMs || now < startTimeMs
        if (!isExpired && blockedPackages.contains(pkg)) {
            if (eventAge > 2_000L) {
                // Stale event: MIUI held this in the queue while our process was throttled,
                // then delivered it in batch when our process woke up (e.g. user returned
                // to our app). By now the user may have already left the blocked app.
                // Verify with UsageStats before showing, to avoid a false-positive overlay
                // appearing inside our own app.
                val currentFg = getForegroundPackage(now)
                if (currentFg != pkg) return
            }
            showOverlay(pkg)
        }
        // Do NOT remove overlay here based on ACC events: launcher-transition events
        // would prematurely remove it. Removal is handled by onPollDetect (UsageStats).
    }

    // ── On-demand check (main thread) ─────────────────────────────────────────
    // Called from ACC TYPE_WINDOWS_CHANGED handler (and ACTION_UPDATE_APPS) when we need
    // an immediate UsageStats check outside the normal poll cadence.
    // Runs on the main thread since the callers are already there.

    internal fun checkForegroundApp() {
        val now = System.currentTimeMillis()
        val topPkg = try { getForegroundPackage(now) } catch (_: Exception) { return }
            ?: return
        onPollDetect(topPkg, now)
    }

    // ── AlarmManager keepalive (survives MIUI process death) ──────────────────

    private fun scheduleKeepaliveAlarm() {
        val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, FocusBlockerBootReceiver::class.java).apply {
            action = ACTION_KEEPALIVE
        }
        val pi = PendingIntent.getBroadcast(
            this, KEEPALIVE_REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val triggerAt = System.currentTimeMillis() + 90_000 // 90 seconds
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            }
        } catch (_: SecurityException) {
            // Fallback if SCHEDULE_EXACT_ALARM not granted (Android 12+)
            am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        }
    }

    private fun cancelKeepaliveAlarm() {
        val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, FocusBlockerBootReceiver::class.java).apply {
            action = ACTION_KEEPALIVE
        }
        val pi = PendingIntent.getBroadcast(
            this, KEEPALIVE_REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.cancel(pi)
    }

    // ── Overlay ────────────────────────────────────────────────────────────────

    private fun showOverlay(blockedPkg: String) {
        // Overlay already showing — nothing to do.
        if (overlayView != null) return
        if (!android.provider.Settings.canDrawOverlays(this)) return

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        val layout = LinearLayout(this).apply {
            orientation  = LinearLayout.VERTICAL
            gravity      = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#E6000000")) // 90% black overlay
            isClickable  = true
            isFocusable  = true
            setOnTouchListener { _, _ -> true } // Swallow all touches
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val shape = android.graphics.drawable.GradientDrawable().apply {
                cornerRadius = 32f
                setColor(Color.parseColor("#0a0014"))
                setStroke(3, Color.parseColor("#38bdf8"))
            }
            background = shape
            setPadding(32, 64, 32, 64)
            layoutParams = LinearLayout.LayoutParams(
                (resources.displayMetrics.widthPixels * 0.85).toInt(),
                (resources.displayMetrics.heightPixels * 0.40).toInt()
            )
        }

        // Split emoji and text into separate lines to prevent overlap on all devices
        val title = TextView(this).apply {
            text      = if (isPenaltyMode) "⚠\nPENALIZAÇÃO ATIVA" else "🛡️\nO MONARCA DESCANSA"
            textSize  = 22f
            setTextColor(Color.parseColor(if (isPenaltyMode) "#ef4444" else "#38bdf8"))
            gravity   = Gravity.CENTER
            setPadding(32, 0, 32, 16)
        }

        val sub = TextView(this).apply {
            if (isPenaltyMode) {
                text = "Este app está bloqueado.\nCompleta as tuas missões primeiro."
            } else {
                val pool = listOf(
                    "O sucesso exige sacrifício. O teu agora é o foco.",
                    "Vais desistir agora? O teu futuro eu agradece se continuares.",
                    "A disciplina é a ponte entre os teus objetivos e as tuas conquistas.",
                    "O Sistema não aceita desculpas. Aceita resultados.",
                    "Foca-te no processo. A distração é o inimigo do progresso.",
                    "Ergue-te! Prova ao Sistema que tens a vontade de um Monarca.",
                    "Cada segundo de foco é um passo para superar os teus limites.",
                    "A diferença entre o impossível e o possível é a tua determinação.",
                    "Não precises de motivação. Precisas de disciplina.",
                    "Um verdadeiro Hunter nunca abandona o campo de batalha antes do fim."
                )
                text = pool.random()
            }
            textSize  = 14f
            setTextColor(Color.parseColor("#94a3b8"))
            gravity   = Gravity.CENTER
            setPadding(32, 0, 32, 0)
        }

        val remaining = TextView(this).apply {
            val minLeft = ((endTimeMs - System.currentTimeMillis()) / 60_000).coerceAtLeast(0)
            val h = minLeft / 60
            val m = minLeft % 60
            val timeStr = if (h > 0) "${h}h ${m}m" else "${m}m"
            text      = "Tempo restante: $timeStr"
            textSize  = 12f
            setTextColor(Color.parseColor("#475569"))
            gravity   = Gravity.CENTER
            setPadding(32, 24, 32, 0)
        }

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 48
            }
        }

        val closeBtn = TextView(this).apply {
            text     = "[ FECHAR ]"
            textSize = 14f
            setTextColor(Color.parseColor("#94a3b8"))
            gravity  = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setPadding(0, 24, 0, 24)
            setOnClickListener {
                // Activate the killBackgroundProcesses guard immediately.
                // UsageStats takes 2-3 s to log ACTIVITY_PAUSED after process kill;
                // without this, the polling would re-show the overlay inside our own app.
                blockedAppKilledAt = System.currentTimeMillis()
                // Launch OWN app BEFORE removing the overlay: on Android 10+ a Service can only
                // start activities while it has a visible window. Removing the overlay first
                // revokes that permission and startActivity silently fails.
                val ownIntent = packageManager.getLaunchIntentForPackage(OWN_PACKAGE)?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                if (ownIntent != null) {
                    try { startActivity(ownIntent) } catch (_: Exception) {}
                }
                removeOverlay()
                try {
                    val am = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
                    am.killBackgroundProcesses(blockedPkg)
                } catch (_: Exception) {}
            }
        }

        btnRow.addView(closeBtn)

        card.addView(title)
        card.addView(sub)
        card.addView(remaining)
        card.addView(btnRow)

        layout.addView(card)

        overlayView = layout
        try {
            windowManager.addView(layout, params)
            overlayShownAtMs = System.currentTimeMillis()
        } catch (_: Exception) {
            overlayView = null
        }

    }

    private fun removeOverlay() {
        val view = overlayView ?: return
        overlayView = null
        try {
            windowManager.removeViewImmediate(view)
        } catch (_: Exception) {
            // View was already detached — safe to ignore
        }
    }

    // ── Notification ───────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                CHANNEL_ID,
                "Focus Blocker",
                NotificationManager.IMPORTANCE_DEFAULT  // LOW is killed by Samsung/MIUI battery savers
            ).apply {
                description = "Solo Leveling — Focus Mode ativo"
                setSound(null, null)    // no sound — just visible enough to survive OEM killers
                enableVibration(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(chan)
        }
    }

    private fun buildNotification(): Notification {
        val now = System.currentTimeMillis()
        val text: String

        when {
            isHardcoreMode -> {
                // Hardcore has no end — show elapsed time as count-up from 0
                val elapsedMs = (now - startTimeMs).coerceAtLeast(0)
                val h = elapsedMs / 3_600_000
                val m = (elapsedMs % 3_600_000) / 60_000
                text = "HARDCORE — ${h}h ${m}m em foco"
            }
            now < startTimeMs -> {
                val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
                text = "Bloqueio automático agendado para as ${sdf.format(Date(startTimeMs))}"
            }
            else -> {
                val minLeft = ((endTimeMs - now) / 60_000).coerceAtLeast(0)
                val h = minLeft / 60
                val m = minLeft % 60
                val timeStr = if (h > 0) "${h}h ${m}m" else "${m}m"
                text = "O Sistema está a vigiar — $timeStr restantes"
            }
        }
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⚡ Modo de Foco Ativo")
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
