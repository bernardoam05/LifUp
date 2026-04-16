package com.lifup.app.focusblocker

import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import androidx.annotation.RequiresApi
import com.lifup.app.R
import org.json.JSONArray

@RequiresApi(Build.VERSION_CODES.N)
class FocusTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        updateTile()
    }

    override fun onClick() {
        super.onClick()
        if (isFocusActive()) stopFocus() else startPermanentFocus()
        updateTile()
    }

    private fun isFocusActive(): Boolean {
        val prefs = getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        val endTimeMs = prefs.getLong("endTimeMs", 0L)
        return FocusBlockerService.isRunning && endTimeMs > System.currentTimeMillis()
    }

    private fun getBlockedPackages(): ArrayList<String> {
        val prefs = getSharedPreferences("FocusBlockerPrefs", Context.MODE_PRIVATE)
        val pkgsStr = prefs.getString("blockedPackages", "[]") ?: "[]"
        val result = ArrayList<String>()
        try {
            val arr = JSONArray(pkgsStr)
            for (i in 0 until arr.length()) result.add(arr.getString(i))
        } catch (_: Exception) {}
        return result
    }

    private fun startPermanentFocus() {
        val now = System.currentTimeMillis()
        val end = now + 365L * 24 * 60 * 60 * 1000 // 1 year — hardcore/permanent
        val intent = Intent(this, FocusBlockerService::class.java).apply {
            action = FocusBlockerService.ACTION_START
            putStringArrayListExtra(FocusBlockerService.EXTRA_BLOCKED_PACKAGES, getBlockedPackages())
            putExtra(FocusBlockerService.EXTRA_START_TIME_MS, now)
            putExtra(FocusBlockerService.EXTRA_END_TIME_MS, end)
            putExtra("extra_is_penalty", false)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun stopFocus() {
        startService(Intent(this, FocusBlockerService::class.java).apply {
            action = FocusBlockerService.ACTION_STOP
        })
    }

    private fun updateTile() {
        val tile = qsTile ?: return
        val active = isFocusActive()
        tile.state = if (active) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        tile.label = "Focus Mode"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.subtitle = if (active) "Ativo" else "Desligado"
        }
        tile.icon = Icon.createWithResource(this, R.drawable.ic_focus_tile)
        tile.updateTile()
    }
}
