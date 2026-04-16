package com.lifup.app.focusblocker

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*

class FocusBlockerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "FocusBlocker"

    // ── Permission checks ──────────────────────────────────────────────────────

    @ReactMethod
    fun hasUsagePermission(promise: Promise) {
        val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactApplicationContext.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactApplicationContext.packageName
            )
        }
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
    }

    @ReactMethod
    fun hasAccessibilityPermission(promise: Promise) {
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        val pkg = reactApplicationContext.packageName
        // Android stores the full class name: "pkg/pkg.ClassName"
        val ownService = "$pkg/$pkg.focusblocker.FocusAccessibilityService"
        promise.resolve(enabledServices.contains(ownService))
    }

    @ReactMethod
    fun requestAccessibilityPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_ACCESSIBILITY", e.message)
        }
    }

    // ── Permission requests ────────────────────────────────────────────────────

    @ReactMethod
    fun requestUsagePermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE", e.message)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_OVERLAY", e.message)
        }
    }

    // ── Battery optimization ───────────────────────────────────────────────────

    @ReactMethod
    fun hasBatteryOptimizationExemption(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(true) // not relevant before Android 6
            return
        }
        val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(true)
            return
        }
        try {
            val intent = Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${reactApplicationContext.packageName}")
            ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            // Some OEMs (Huawei EMUI) don't support this intent — fall back to battery settings
            try {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(fallback)
                promise.resolve(true)
            } catch (e2: Exception) {
                promise.reject("ERR_BATTERY", e2.message)
            }
        }
    }

    // ── OEM autostart settings ─────────────────────────────────────────────────
    // Many OEMs (Xiaomi, Oppo, Huawei, Vivo) require manual "Autostart" permission
    // in addition to battery optimization exemption. Returns true if the OEM screen
    // was opened, false if only the generic App Info screen was available.

    @ReactMethod
    fun openOEMAutostartSettings(promise: Promise) {
        val pkg = reactApplicationContext.packageName

        // Ordered by market share. Each entry is (packageName, activityClassName).
        val oemIntents = listOf(
            // Xiaomi / Redmi / POCO — MIUI
            "com.miui.securitycenter" to
                "com.miui.permcenter.autostart.AutoStartManagementActivity",
            // Oppo / Realme / OnePlus — ColorOS / OxygenOS
            "com.coloros.safecenter" to
                "com.coloros.safecenter.permission.startup.StartupAppListActivity",
            "com.oppo.safe" to
                "com.oppo.safe.permission.startup.StartupAppListActivity",
            // Huawei / Honor — EMUI
            "com.huawei.systemmanager" to
                "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
            "com.huawei.systemmanager" to
                "com.huawei.systemmanager.optimize.process.ProtectActivity",
            // Vivo — FuntouchOS / OriginOS
            "com.vivo.permissionmanager" to
                "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
            // Samsung — One UI (Battery settings)
            "com.samsung.android.lool" to
                "com.samsung.android.sm.battery.ui.BatteryActivity",
            // Asus — ZenUI
            "com.asus.mobilemanager" to
                "com.asus.mobilemanager.powersaver.PowerSaverSettings",
            // Letv / LeEco
            "com.letv.android.letvsafe" to
                "com.letv.android.letvsafe.AutobootManageActivity",
        )

        val started = oemIntents.any { (oemPkg, activityClass) ->
            try {
                val intent = Intent().apply {
                    component = ComponentName(oemPkg, activityClass)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                true
            } catch (_: Exception) { false }
        }

        if (started) {
            promise.resolve(true) // opened OEM-specific screen
            return
        }

        // Generic fallback: App Info page where user can find battery settings
        try {
            val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$pkg")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(fallback)
            promise.resolve(false) // false = only generic settings available
        } catch (e: Exception) {
            promise.reject("ERR_AUTOSTART", e.message)
        }
    }

    // ── Android 13+ Restricted Settings detection ─────────────────────────────
    // Apps sideloaded on Android 13+ cannot enable Accessibility Services unless
    // the user explicitly goes to App Info → ⋮ → "Allow restricted settings".
    // Returns true if the app appears to be sideloaded on Android 13+.

    @ReactMethod
    fun isSideloadedOnAndroid13Plus(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            promise.resolve(false) // restricted settings don't exist before Android 13
            return
        }
        val isSideloaded = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val info = reactApplicationContext.packageManager
                    .getInstallSourceInfo(reactApplicationContext.packageName)
                // installingPackageName is null when installed via ADB/direct APK
                info.installingPackageName == null
            } else {
                @Suppress("DEPRECATION")
                reactApplicationContext.packageManager
                    .getInstallerPackageName(reactApplicationContext.packageName) == null
            }
        } catch (e: Exception) {
            Log.w("FocusBlocker", "Could not determine install source", e)
            false
        }
        promise.resolve(isSideloaded)
    }

    // ── Focus mode control ─────────────────────────────────────────────────────

    @ReactMethod
    fun startFocusMode(blockedPackages: ReadableArray, startTimeMs: Double, endTimeMs: Double, isPenalty: Boolean, promise: Promise) {
        try {
            val pkgList = ArrayList<String>()
            for (i in 0 until blockedPackages.size()) {
                pkgList.add(blockedPackages.getString(i))
            }
            val intent = Intent(reactApplicationContext, FocusBlockerService::class.java).apply {
                action = FocusBlockerService.ACTION_START
                putStringArrayListExtra(FocusBlockerService.EXTRA_BLOCKED_PACKAGES, pkgList)
                putExtra(FocusBlockerService.EXTRA_START_TIME_MS, startTimeMs.toLong())
                putExtra(FocusBlockerService.EXTRA_END_TIME_MS, endTimeMs.toLong())
                putExtra("extra_is_penalty", isPenalty)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_START", e.message)
        }
    }

    @ReactMethod
    fun stopFocusMode(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, FocusBlockerService::class.java).apply {
                action = FocusBlockerService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_STOP", e.message)
        }
    }

    @ReactMethod
    fun isFocusModeActive(promise: Promise) {
        promise.resolve(FocusBlockerService.isRunning)
    }

    // ── Installed apps enumeration ─────────────────────────────────────────────

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val ownPkg = reactApplicationContext.packageName

            val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val resolveFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PackageManager.MATCH_ALL
            } else { 0 }
            val activities = pm.queryIntentActivities(launcherIntent, resolveFlags)
            Log.d("FocusBlocker", "getInstalledApps: found ${activities.size} launcher activities")

            val seen = mutableSetOf<String>()
            val result = Arguments.createArray()

            for (ri in activities) {
                val pkg = ri.activityInfo.applicationInfo.packageName
                if (pkg == ownPkg) continue
                if (!seen.add(pkg)) continue
                val label = ri.loadLabel(pm).toString()
                val map = Arguments.createMap()
                map.putString("pkg", pkg)
                map.putString("label", label)
                result.pushMap(map)
            }

            Log.d("FocusBlocker", "getInstalledApps: returning ${result.size()} unique apps")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e("FocusBlocker", "getInstalledApps failed", e)
            promise.reject("ERR_APPS", e.message)
        }
    }

    // ── Native focus state (for tile→app sync) ────────────────────────────────
    // Returns the persisted FocusBlockerPrefs so the RN store can sync when the
    // Quick Settings Tile toggled focus mode while the app was closed.

    @ReactMethod
    fun getFocusNativeState(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("FocusBlockerPrefs", android.content.Context.MODE_PRIVATE)
            val endTimeMs   = prefs.getLong("endTimeMs", 0L)
            val isHardcore  = prefs.getBoolean("isHardcoreMode", false)
            val pkgsStr     = prefs.getString("blockedPackages", "[]") ?: "[]"

            val result = com.facebook.react.bridge.Arguments.createMap()
            result.putBoolean("isRunning",     FocusBlockerService.isRunning)
            result.putDouble("endTimeMs",      endTimeMs.toDouble())
            result.putBoolean("isHardcoreMode", isHardcore)

            val pkgsArr = com.facebook.react.bridge.Arguments.createArray()
            try {
                val jsonArr = org.json.JSONArray(pkgsStr)
                for (i in 0 until jsonArr.length()) pkgsArr.pushString(jsonArr.getString(i))
            } catch (_: Exception) {}
            result.putArray("blockedPackages", pkgsArr)

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_NATIVE_STATE", e.message)
        }
    }

    // ── Hot-reload blocked apps ────────────────────────────────────────────────

    @ReactMethod
    fun updateBlockedApps(apps: ReadableArray, promise: Promise) {
        try {
            val pkgList = ArrayList<String>()
            for (i in 0 until apps.size()) pkgList.add(apps.getString(i))
            val intent = Intent(reactApplicationContext, FocusBlockerService::class.java).apply {
                action = FocusBlockerService.ACTION_UPDATE_APPS
                putStringArrayListExtra(FocusBlockerService.EXTRA_BLOCKED_PACKAGES, pkgList)
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_UPDATE", e.message)
        }
    }
}
