package com.lifup.app.system

import android.Manifest
import android.app.AlarmManager
import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat

data class InstalledApp(val pkg: String, val label: String)

/** Checks and settings shortcuts for everything the blocker, alarms and GPS need. */
object Permissions {
    fun usageAccess(c: Context): Boolean {
        val ops = c.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= 29) ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), c.packageName)
        else @Suppress("DEPRECATION") ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), c.packageName)
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun overlay(c: Context) = Settings.canDrawOverlays(c)

    fun batteryUnrestricted(c: Context) = (c.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(c.packageName)

    fun exactAlarms(c: Context) = Build.VERSION.SDK_INT < 31 || c.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

    fun notifications(c: Context) = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun activity(c: Context) = Build.VERSION.SDK_INT < 29 ||
        ContextCompat.checkSelfPermission(c, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

    fun location(c: Context) = ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    /** Blocking needs usage access (to see the app in front) and overlay (to cover it). */
    fun blockerReady(c: Context) = usageAccess(c) && overlay(c)

    private fun open(c: Context, intent: Intent) = runCatching { c.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess

    fun openUsageAccess(c: Context) = open(c, Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    fun openOverlay(c: Context) = open(c, Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${c.packageName}")))
    fun openAppDetails(c: Context) = open(c, Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${c.packageName}")))

    fun openExactAlarms(c: Context) {
        if (Build.VERSION.SDK_INT >= 31) open(c, Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${c.packageName}")))
    }

    fun openBattery(c: Context) {
        @Suppress("BatteryLife")
        val ok = open(c, Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${c.packageName}")))
        if (!ok) open(c, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    /**
     * Brands whose system closes apps it hasn't been told to keep ("autostart" / "auto launch"): there an alarm
     * can't wake a closed app, so reminders, portals and the midnight close only arrive when the phone is unlocked.
     */
    fun autostartMatters(): Boolean = Build.MANUFACTURER.lowercase().let { m ->
        listOf("xiaomi", "redmi", "poco", "oppo", "realme", "oneplus", "vivo", "iqoo", "huawei", "honor").any { it in m }
    }

    /**
     * Whether autostart is on, where the system says: Xiaomi keeps it as a hidden app-op (10008). Elsewhere no
     * app can read it, so null, and the player confirms it themselves ([autostartConfirmed]).
     */
    fun autostartKnown(c: Context): Boolean? {
        val m = Build.MANUFACTURER.lowercase()
        if (listOf("xiaomi", "redmi", "poco").none { it in m }) return null
        return runCatching {
            val ops = c.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val check = AppOpsManager::class.java.getMethod("checkOpNoThrow", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType, String::class.java)
            check.invoke(ops, 10008, android.os.Process.myUid(), c.packageName) as Int == AppOpsManager.MODE_ALLOWED
        }.getOrNull()
    }

    private const val PREFS = "permissions"
    fun autostartConfirmed(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("autostart", false)
    fun confirmAutostart(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("autostart", true).apply()

    /** On those brands: on when the system says so, or when the player said they turned it on. */
    fun autostart(c: Context): Boolean = autostartKnown(c) ?: autostartConfirmed(c)

    /** OEM "autostart" screens (Xiaomi, Oppo, Huawei, Vivo, Samsung…); falls back to App info. */
    fun openAutostart(c: Context) {
        val screens = listOf(
            "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
            "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
            "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
            "com.oplus.safecenter" to "com.oplus.safecenter.startupapp.StartupAppListActivity",
            "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
            "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
            "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
            "com.samsung.android.lool" to "com.samsung.android.sm.battery.ui.BatteryActivity",
            "com.asus.mobilemanager" to "com.asus.mobilemanager.powersaver.PowerSaverSettings",
        )
        if (screens.none { (pkg, cls) -> open(c, Intent().setComponent(ComponentName(pkg, cls))) }) openAppDetails(c)
    }

    fun installedApps(c: Context): List<InstalledApp> {
        val pm = c.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
            .map { it.activityInfo.applicationInfo.packageName to it.loadLabel(pm).toString() }
            .filter { it.first != c.packageName }
            .distinctBy { it.first }
            .map { InstalledApp(it.first, it.second) }
            .sortedBy { it.label.lowercase() }
    }
}
