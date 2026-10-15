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
import android.text.TextUtils
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

    fun accessibility(c: Context): Boolean {
        val enabled = Settings.Secure.getString(c.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(c, BlockerAccessibilityService::class.java).flattenToString()
        val splitter = TextUtils.SimpleStringSplitter(':').apply { setString(enabled) }
        return splitter.any { it.equals(me, ignoreCase = true) }
    }

    fun batteryUnrestricted(c: Context) = (c.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(c.packageName)

    fun exactAlarms(c: Context) = Build.VERSION.SDK_INT < 31 || c.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

    fun notifications(c: Context) = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun activity(c: Context) = Build.VERSION.SDK_INT < 29 ||
        ContextCompat.checkSelfPermission(c, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

    fun location(c: Context) = ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    /** Minimum for blocking: usage access + overlay. Accessibility makes it instant. */
    fun blockerReady(c: Context) = usageAccess(c) && overlay(c)

    /** Sideloaded apps on Android 13+ must allow "restricted settings" before enabling accessibility. */
    fun sideloaded(c: Context): Boolean = Build.VERSION.SDK_INT >= 33 &&
        runCatching { c.packageManager.getInstallSourceInfo(c.packageName).installingPackageName == null }.getOrDefault(false)

    private fun open(c: Context, intent: Intent) = runCatching { c.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess

    fun openUsageAccess(c: Context) = open(c, Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    fun openOverlay(c: Context) = open(c, Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${c.packageName}")))
    fun openAccessibility(c: Context) = open(c, Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    fun openAppDetails(c: Context) = open(c, Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${c.packageName}")))

    fun openExactAlarms(c: Context) {
        if (Build.VERSION.SDK_INT >= 31) open(c, Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${c.packageName}")))
    }

    fun openBattery(c: Context) {
        @Suppress("BatteryLife")
        val ok = open(c, Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${c.packageName}")))
        if (!ok) open(c, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    /** OEM "autostart" screens (Xiaomi, Oppo, Huawei, Vivo, Samsung…); falls back to App info. */
    fun openAutostart(c: Context) {
        val screens = listOf(
            "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
            "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
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
