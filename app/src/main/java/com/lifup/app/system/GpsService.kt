package com.lifup.app.system

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.creditGps
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class GpsSession(
    val questId: String,
    val startedAt: Long,
    val km: Double = 0.0,
    val speedKmh: Double = 0.0,
    val hasFix: Boolean = false,
    val rejected: Int = 0,
)

/** Live tracking state for the UI. */
object GpsTracker {
    private val _session = MutableStateFlow<GpsSession?>(null)
    val session: StateFlow<GpsSession?> = _session.asStateFlow()
    internal fun set(value: GpsSession?) { _session.value = value }
}

/** Foreground location service that turns walked/run distance into progress for one GPS quest. */
class GpsService : Service(), LocationListener {
    companion object {
        private const val EXTRA_QUEST = "quest"
        private const val MAX_SPEED_KMH = 20.0
        private const val MAX_ACCURACY_M = 30f
        private const val FLUSH_KM = 0.05

        fun start(context: Context, questId: String) {
            ContextCompat.startForegroundService(context, Intent(context, GpsService::class.java).putExtra(EXTRA_QUEST, questId))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, GpsService::class.java))
        }
    }

    private lateinit var lm: LocationManager
    private var last: Location? = null
    private var pendingKm = 0.0
    private var questId: String? = null

    override fun onBind(intent: Intent?) = null

    @SuppressLint("MissingPermission")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val id = intent?.getStringExtra(EXTRA_QUEST)
        val type = if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
        ServiceCompat.startForeground(this, Notifications.ID_GPS, notification(0.0), type)
        if (id == null) { stopSelf(); return START_NOT_STICKY }
        if (id != questId) {
            flush()
            questId = id
            last = null
            GpsTracker.set(GpsSession(id, System.currentTimeMillis()))
        }
        lm = getSystemService(LOCATION_SERVICE) as LocationManager
        runCatching { lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2_000L, 5f, this, Looper.getMainLooper()) }
            .onFailure { stopSelf() }
        return START_NOT_STICKY
    }

    override fun onLocationChanged(loc: Location) {
        val session = GpsTracker.session.value ?: return
        if (loc.hasAccuracy() && loc.accuracy > MAX_ACCURACY_M) {
            GpsTracker.set(session.copy(hasFix = false)); return
        }
        val prev = last
        last = loc
        if (prev == null) { GpsTracker.set(session.copy(hasFix = true)); return }
        val meters = prev.distanceTo(loc)
        val hours = (loc.time - prev.time) / 3_600_000.0
        val speed = if (hours > 0) meters / 1000 / hours else 0.0
        if (speed > MAX_SPEED_KMH) {
            // Anti-cheat: vehicles don't count.
            GpsTracker.set(session.copy(speedKmh = speed, rejected = session.rejected + 1)); return
        }
        val km = meters / 1000.0
        pendingKm += km
        val updated = session.copy(km = session.km + km, speedKmh = speed, hasFix = true)
        GpsTracker.set(updated)
        if (pendingKm >= FLUSH_KM) flush()
        val nm = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
        nm.notify(Notifications.ID_GPS, notification(updated.km))
        val q = LifUpApp.store.current.allQuests.firstOrNull { it.id == questId }
        if (q == null || q.status != QuestStatus.OPEN) stopSelf()
    }

    private fun flush() {
        val id = questId ?: return
        val km = pendingKm
        if (km <= 0) return
        pendingKm = 0.0
        LifUpApp.store.fire { creditGps(id, km) }
    }

    override fun onDestroy() {
        runCatching { lm.removeUpdates(this) }
        flush()
        GpsTracker.set(null)
        super.onDestroy()
    }

    private fun notification(km: Double) = NotificationCompat.Builder(this, Notifications.CH_SESSION)
        .setSmallIcon(R.drawable.ic_stat_lifup)
        .setContentTitle(getString(R.string.gps_tracking_title))
        .setContentText(getString(R.string.gps_tracking_text, km))
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setContentIntent(Notifications.openApp(this, "today"))
        .build()
}
