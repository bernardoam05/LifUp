package com.sololevelingrn.focusblocker

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
import com.sololevelingrn.R

class FocusBlockerService : Service() {

    companion object {
        const val ACTION_START       = "com.sololevelingrn.FOCUS_START"
        const val ACTION_STOP        = "com.sololevelingrn.FOCUS_STOP"
        const val ACTION_UPDATE_APPS = "com.sololevelingrn.FOCUS_UPDATE_APPS"
        const val EXTRA_BLOCKED_PACKAGES = "blocked_packages"
        const val EXTRA_DURATION_MS      = "duration_ms"
        const val CHANNEL_ID = "focus_blocker_channel"
        const val NOTIF_ID   = 1337

        // The own app package — overlay must NEVER block this
        const val OWN_PACKAGE = "com.sololevelingrn"

        @Volatile var isRunning = false
    }

    private var blockedPackages: List<String> = emptyList()
    private var endTimeMs: Long = 0L
    private var isPenaltyMode: Boolean = false
    private var overlayMessage: String = ""
    private var overlayView: LinearLayout? = null
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var windowManager: WindowManager
    private lateinit var usageStatsManager: UsageStatsManager

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        windowManager     = getSystemService(WINDOW_SERVICE) as WindowManager
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                blockedPackages = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES) ?: emptyList()
                val durationMs  = intent.getLongExtra(EXTRA_DURATION_MS, 0L)
                isPenaltyMode   = intent.getBooleanExtra("extra_is_penalty", false)
                
                if (!isPenaltyMode) {
                    val pool = listOf(
                        "Os fracos procuram conforto, os guerreiros buscam evolução.",
                        "Um momento de distração pode custar-te a vitória. Foca-te.",
                        "Ergue-te! O teu verdadeiro desafio não está nesta app.",
                        "A grandeza não se alcança a olhar para ecrãs vazios."
                    )
                    overlayMessage = pool.random()
                }
                
                endTimeMs       = System.currentTimeMillis() + durationMs
                isRunning       = true
                startForeground(NOTIF_ID, buildNotification())
                schedulePoll()
                scheduleNotifUpdates()
            }
            ACTION_STOP -> stopSelf()
            ACTION_UPDATE_APPS -> {
                val newPkgs = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES)
                if (newPkgs != null) blockedPackages = newPkgs
                // Immediate re-check so overlay appears/disappears without 500ms delay
                checkForegroundApp()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        handler.removeCallbacksAndMessages(null)
        removeOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null

    // ── Polling ────────────────────────────────────────────────────────────────

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (System.currentTimeMillis() >= endTimeMs) {
                stopSelf()
                return
            }
            checkForegroundApp()
            handler.postDelayed(this, 500)
        }
    }

    private fun schedulePoll() {
        handler.post(pollRunnable)
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
        handler.postDelayed(notifRunnable, 60_000)
    }

    private fun checkForegroundApp() {
        val now    = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - 30_000, now)

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

        val topPkg = lastResumed.entries
            .filter { (pkg, resumedAt) -> resumedAt > (lastPaused[pkg] ?: 0L) }
            .maxByOrNull { it.value }
            ?.key

        if (topPkg == null) return

        if (!blockedPackages.contains(topPkg)) {
            removeOverlay()
            return
        }

        showOverlay()
    }

    // ── Overlay ────────────────────────────────────────────────────────────────

    private fun showOverlay() {
        if (overlayView != null) return
        if (!android.provider.Settings.canDrawOverlays(this)) return

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.OPAQUE
        ).apply {
            gravity = Gravity.CENTER
        }

        val layout = LinearLayout(this).apply {
            orientation  = LinearLayout.VERTICAL
            gravity      = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0a0014"))
        }

        val title = TextView(this).apply {
            text      = if (isPenaltyMode) "⚠ PENALIZAÇÃO ATIVA" else "🛡️ O MONARCA DESCANSA"
            textSize  = 22f
            setTextColor(Color.parseColor(if (isPenaltyMode) "#ef4444" else "#38bdf8"))
            gravity   = Gravity.CENTER
            setPadding(32, 0, 32, 16)
        }

        val sub = TextView(this).apply {
            text      = if (isPenaltyMode) "Este app está bloqueado.\nCompleta as tuas missões primeiro." else overlayMessage
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

        val backBtn = TextView(this).apply {
            text     = "[ VOLTAR À APP ]"
            textSize = 14f
            setTextColor(Color.parseColor("#00d4ff"))
            gravity  = Gravity.CENTER
            setPadding(32, 48, 32, 0)
            setOnClickListener {
                val launchIntent = packageManager
                    .getLaunchIntentForPackage(OWN_PACKAGE)
                    ?.apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                launchIntent?.let { startActivity(it) }
            }
        }

        layout.addView(title)
        layout.addView(sub)
        layout.addView(remaining)
        layout.addView(backBtn)

        overlayView = layout
        try {
            windowManager.addView(layout, params)
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
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Solo Leveling — Focus Mode ativo" }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(chan)
        }
    }

    private fun buildNotification(): Notification {
        val minLeft = ((endTimeMs - System.currentTimeMillis()) / 60_000).coerceAtLeast(0)
        val h = minLeft / 60
        val m = minLeft % 60
        val timeStr = if (h > 0) "${h}h ${m}m" else "${m}m"
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⚡ Modo de Foco Ativo")
            .setContentText("O Sistema está a vigiar — $timeStr restantes")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
