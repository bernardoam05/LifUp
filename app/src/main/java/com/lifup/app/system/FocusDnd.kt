package com.lifup.app.system

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings

/**
 * Do Not Disturb during focus phases, like a phone's focus mode. It only switches it on when the
 * phone isn't already in DND, and only switches off what it switched on itself.
 */
object FocusDnd {
    private const val PREFS = "focus_dnd"
    private const val ACTIVE = "active"

    private fun nm(c: Context) = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    fun granted(c: Context) = nm(c).isNotificationPolicyAccessGranted

    fun openAccess(c: Context) = runCatching {
        c.startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }.isSuccess

    fun set(c: Context, on: Boolean) {
        if (!granted(c)) return
        val prefs = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val ours = prefs.getBoolean(ACTIVE, false)
        val nm = nm(c)
        if (on && !ours && nm.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL) {
            prefs.edit().putBoolean(ACTIVE, true).apply()
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
        } else if (!on && ours) {
            prefs.edit().putBoolean(ACTIVE, false).apply()
            if (nm.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_PRIORITY) nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        }
    }
}
