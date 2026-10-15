package com.lifup.app.system

import android.graphics.drawable.Icon
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.FocusSession
import com.lifup.app.domain.startFocus
import com.lifup.app.domain.stopFocus
import kotlinx.coroutines.launch

/** Quick Settings tile: starts a focus session with the last duration, or stops a non-strict one. */
class FocusTileService : TileService() {
    override fun onStartListening() {
        super.onStartListening()
        update()
    }

    override fun onClick() {
        super.onClick()
        val store = LifUpApp.store
        store.scope.launch {
            val s = store.current
            val f = s.focus
            if (f == null) {
                val blocks = s.settings.blockedApps.isNotEmpty() && Permissions.blockerReady(this@FocusTileService)
                store.dispatch { startFocus(FocusSession(0, s.settings.focusMinutes, blockApps = blocks)) }
            } else if (!f.strict) {
                store.dispatch { stopFocus() }
            }
            update()
        }
    }

    private fun update() {
        val tile = qsTile ?: return
        val active = LifUpApp.store.current.focus != null
        tile.state = if (active) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        tile.label = getString(R.string.tile_label)
        if (Build.VERSION.SDK_INT >= 29) tile.subtitle = getString(if (active) R.string.tile_on else R.string.tile_off)
        tile.icon = Icon.createWithResource(this, R.drawable.ic_focus_tile)
        tile.updateTile()
    }
}
