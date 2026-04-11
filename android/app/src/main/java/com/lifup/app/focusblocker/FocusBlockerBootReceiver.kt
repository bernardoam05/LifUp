package com.lifup.app.focusblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class FocusBlockerBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        val isBootEvent = action == Intent.ACTION_BOOT_COMPLETED ||
                action == "android.intent.action.LOCKED_BOOT_COMPLETED" ||
                action == "android.intent.action.QUICKBOOT_POWERON" // HTC/MIUI
        val isKeepalive = action == FocusBlockerService.ACTION_KEEPALIVE

        if (!isBootEvent && !isKeepalive) return

        val prefs = context.getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        val endTimeMs = prefs.getLong("endTimeMs", 0L)

        if (System.currentTimeMillis() < endTimeMs) {
            Log.d("FocusBlocker", "BootReceiver($action): restarting service, ${(endTimeMs - System.currentTimeMillis()) / 60_000}m remaining")
            val serviceIntent = Intent(context, FocusBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } else {
            Log.d("FocusBlocker", "BootReceiver($action): block expired, not restarting")
        }
    }
}
