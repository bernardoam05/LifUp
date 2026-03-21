package com.sololevelingrn.focusblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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
    fun startFocusMode(blockedPackages: ReadableArray, durationMs: Double, promise: Promise) {
        try {
            val pkgList = ArrayList<String>()
            for (i in 0 until blockedPackages.size()) {
                pkgList.add(blockedPackages.getString(i))
            }
            val intent = Intent(reactApplicationContext, FocusBlockerService::class.java).apply {
                action = FocusBlockerService.ACTION_START
                putStringArrayListExtra(FocusBlockerService.EXTRA_BLOCKED_PACKAGES, pkgList)
                putExtra(FocusBlockerService.EXTRA_DURATION_MS, durationMs.toLong())
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
}
