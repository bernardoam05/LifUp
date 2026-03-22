package com.sololevelingrn.focusblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
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

    // ── Focus mode control ─────────────────────────────────────────────────────

    @ReactMethod
    fun startFocusMode(blockedPackages: ReadableArray, durationMs: Double, isPenalty: Boolean, promise: Promise) {
        try {
            val pkgList = ArrayList<String>()
            for (i in 0 until blockedPackages.size()) {
                pkgList.add(blockedPackages.getString(i))
            }
            val intent = Intent(reactApplicationContext, FocusBlockerService::class.java).apply {
                action = FocusBlockerService.ACTION_START
                putStringArrayListExtra(FocusBlockerService.EXTRA_BLOCKED_PACKAGES, pkgList)
                putExtra(FocusBlockerService.EXTRA_DURATION_MS, durationMs.toLong())
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

            // queryIntentActivities is the reliable way on Android 11+ to get
            // all apps that appear in the launcher — doesn't need package visibility tricks
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
                if (!seen.add(pkg)) continue          // deduplicate
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
