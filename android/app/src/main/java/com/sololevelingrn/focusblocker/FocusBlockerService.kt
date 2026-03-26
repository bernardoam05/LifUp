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
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.app.AlarmManager
import android.app.PendingIntent

class FocusBlockerService : Service() {

    companion object {
        const val ACTION_START       = "com.sololevelingrn.FOCUS_START"
        const val ACTION_STOP        = "com.sololevelingrn.FOCUS_STOP"
        const val ACTION_UPDATE_APPS = "com.sololevelingrn.FOCUS_UPDATE_APPS"
        const val ACTION_KEEPALIVE   = "com.sololevelingrn.FOCUS_KEEPALIVE"
        const val EXTRA_BLOCKED_PACKAGES = "blocked_packages"
        const val EXTRA_START_TIME_MS    = "start_time_ms"
        const val EXTRA_END_TIME_MS      = "end_time_ms"
        const val CHANNEL_ID = "focus_blocker_channel"
        const val NOTIF_ID   = 1337
        const val KEEPALIVE_REQUEST_CODE = 4242

        // The own app package — overlay must NEVER block this
        const val OWN_PACKAGE = "com.sololevelingrn"

        @Volatile var isRunning = false
    }

    private var blockedPackages: List<String> = emptyList()
    private var startTimeMs: Long = 0L
    private var endTimeMs: Long = 0L
    private var isPenaltyMode: Boolean = false
    private var overlayMessage: String = ""
    private var lastRedirectTime: Long = 0L
    private var overlayView: LinearLayout? = null
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var windowManager: WindowManager
    private lateinit var usageStatsManager: UsageStatsManager

    // ── Persistence ────────────────────────────────────────────────────────────
    private fun saveState() {
        val prefs = getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putLong("startTimeMs", startTimeMs)
            .putLong("endTimeMs", endTimeMs)
            .putBoolean("isPenaltyMode", isPenaltyMode)
            .putString("blockedPackages", JSONArray(blockedPackages).toString())
            .apply()
    }

    private fun restoreState() {
        val prefs = getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        startTimeMs = prefs.getLong("startTimeMs", 0L)
        endTimeMs = prefs.getLong("endTimeMs", 0L)
        isPenaltyMode = prefs.getBoolean("isPenaltyMode", false)
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
        windowManager     = getSystemService(WINDOW_SERVICE) as WindowManager
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                blockedPackages = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES) ?: emptyList()
                startTimeMs     = intent.getLongExtra(EXTRA_START_TIME_MS, 0L)
                endTimeMs       = intent.getLongExtra(EXTRA_END_TIME_MS, 0L)
                isPenaltyMode   = intent.getBooleanExtra("extra_is_penalty", false)

                // Keep default start time logic if startTimeMs wasn't provided (backwards compat)
                if (startTimeMs == 0L && endTimeMs > 0L) {
                    startTimeMs = System.currentTimeMillis()
                }

                saveState()
                isRunning       = true
                startForeground(NOTIF_ID, buildNotification())
                schedulePoll()
                scheduleNotifUpdates()
                scheduleKeepaliveAlarm()
            }
            ACTION_STOP -> {
                cancelKeepaliveAlarm()
                getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE).edit().clear().apply()
                stopSelf()
            }
            ACTION_UPDATE_APPS -> {
                val newPkgs = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES)
                if (newPkgs != null) {
                    blockedPackages = newPkgs
                    saveState()
                }
                checkForegroundApp()
            }
            null, ACTION_KEEPALIVE -> {
                // START_STICKY restart or AlarmManager keepalive
                restoreState()
                if (System.currentTimeMillis() >= endTimeMs) {
                    cancelKeepaliveAlarm()
                    stopSelf()
                } else {
                    isRunning = true
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
        handler.removeCallbacksAndMessages(null)
        removeOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null

    // ── Polling ────────────────────────────────────────────────────────────────

    private val pollRunnable = object : Runnable {
        override fun run() {
            // Polling continua sempre enquanto o serviço estiver vivo
            checkForegroundApp()
            handler.postDelayed(this, 1000) // 1s is enough and saves battery
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

    private fun checkForegroundApp() {
        val now = System.currentTimeMillis()

        // Cooldown: wait 2 seconds after redirect so UsageStats can catch up
        if (now - lastRedirectTime < 2000) return

        val topPkg = getForegroundPackage(now) ?: return

        // Nunca bloquear a própria app!
        if (topPkg == OWN_PACKAGE) {
            removeOverlay()
            return
        }

        val isExpired = now >= endTimeMs || now < startTimeMs
        val isBlocked = !isExpired && blockedPackages.contains(topPkg)

        if (!isBlocked) {
            removeOverlay()
            return
        }

        showOverlay(topPkg)
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
        if (overlayView != null) return

        // MAXXED OUT TRUE BLOCKING: Fire Intent to launch Solo Leveling to vigorously kick user out of blocked activity FIRST
        // Starting our own activity is exempt from Android 10+ background start restrictions on almost all OEM ROMs
        val redirectIntent = packageManager.getLaunchIntentForPackage(OWN_PACKAGE)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        if (redirectIntent != null) {
            try {
                val pendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    redirectIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                val options = android.app.ActivityOptions.makeBasic()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    options.pendingIntentBackgroundActivityStartMode = android.app.ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                }
                pendingIntent.send(this, 0, null, null, null, null, options.toBundle())
            } catch (e: Exception) {
                try {
                    startActivity(redirectIntent)
                } catch (ignored: Exception) {}
            }
        }

        lastRedirectTime = System.currentTimeMillis()

        // Agendamos a execução fatal para 1.5 segundos depois, garantindo que a app já está totalmente
        // em background e vulnerável ao killBackgroundProcesses.
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                if (blockedPkg != OWN_PACKAGE) {
                    val am = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
                    am.killBackgroundProcesses(blockedPkg)
                }
            } catch (ignored: Exception) {}
        }, 1500)

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

        val title = TextView(this).apply {
            text      = if (isPenaltyMode) "⚠ PENALIZAÇÃO ATIVA" else "🛡️ O MONARCA DESCANSA"
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
                removeOverlay()
                // Ao fechar o overlay, força a ida para o Ecrã Principal (Home) caso o redirect falhe
                val startMain = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(startMain)
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
        val now = System.currentTimeMillis()
        val text: String
        
        if (now < startTimeMs) {
            val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
            text = "Bloqueio automático agendado para as ${sdf.format(Date(startTimeMs))}"
        } else {
            val minLeft = ((endTimeMs - now) / 60_000).coerceAtLeast(0)
            val h = minLeft / 60
            val m = minLeft % 60
            val timeStr = if (h > 0) "${h}h ${m}m" else "${m}m"
            text = "O Sistema está a vigiar — $timeStr restantes"
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
