package com.sololevelingrn.focusblocker

import android.app.*
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
        const val ACTION_START = "com.sololevelingrn.FOCUS_START"
        const val ACTION_STOP  = "com.sololevelingrn.FOCUS_STOP"
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
                endTimeMs       = System.currentTimeMillis() + durationMs
                isRunning       = true
                startForeground(NOTIF_ID, buildNotification())
                schedulePoll()
            }
            ACTION_STOP -> stopSelf()
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
            handler.postDelayed(this, 1_000)
        }
    }

    private fun schedulePoll() {
        handler.post(pollRunnable)
    }

    private fun checkForegroundApp() {
        val now = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            now - 10_000,
            now
        )
        val topPkg = stats?.maxByOrNull { it.lastTimeUsed }?.packageName ?: return

        // Bug 1 fix: never block our own app — remove overlay immediately if visible
        if (topPkg == OWN_PACKAGE) {
            removeOverlay()
            return
        }

        if (blockedPackages.contains(topPkg)) {
            showOverlay()
        } else {
            removeOverlay()
        }
    }

    // ── Overlay ────────────────────────────────────────────────────────────────

    private fun showOverlay() {
        if (overlayView != null) return
        if (!android.provider.Settings.canDrawOverlays(this)) return

        // Removed FLAG_NOT_TOUCH_MODAL so the overlay captures all touches
        // and the "Voltar" button is fully clickable
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
            text      = "⚠ PENALIZAÇÃO ATIVA"
            textSize  = 22f
            setTextColor(Color.parseColor("#ef4444"))
            gravity   = Gravity.CENTER
            setPadding(32, 0, 32, 16)
        }

        val sub = TextView(this).apply {
            text      = "Este app está bloqueado.\nCompleta as tuas missões primeiro."
            textSize  = 14f
            setTextColor(Color.parseColor("#94a3b8"))
            gravity   = Gravity.CENTER
            setPadding(32, 0, 32, 0)
        }

        val remaining = TextView(this).apply {
            val minLeft = ((endTimeMs - System.currentTimeMillis()) / 60_000).coerceAtLeast(0)
            text      = "Tempo restante: ${minLeft} min"
            textSize  = 12f
            setTextColor(Color.parseColor("#475569"))
            gravity   = Gravity.CENTER
            setPadding(32, 24, 32, 0)
        }

        // Bug 2 fix: "Voltar" button with FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TOP
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
        windowManager.addView(layout, params)
    }

    private fun removeOverlay() {
        overlayView?.let {
            try { windowManager.removeView(it) } catch (_: Exception) {}
            overlayView = null
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
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⚡ Focus Mode Ativo")
            .setContentText("${minLeft} min restantes — Stay strong, Hunter.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
