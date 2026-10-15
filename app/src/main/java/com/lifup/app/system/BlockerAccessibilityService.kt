package com.lifup.app.system

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

/** Real-time foreground-app detection for the blocker (much faster than polling UsageStats). */
class BlockerAccessibilityService : AccessibilityService() {
    private val launchable = HashMap<String, Boolean>()
    private var lastWindowsCheck = 0L

    private fun isLaunchable(pkg: String) = launchable.getOrPut(pkg) { packageManager.getLaunchIntentForPackage(pkg) != null }

    override fun onServiceConnected() {
        launchable.clear()
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_DISPLAY)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val session = SessionService.instance ?: return
        if (session.plan == null) return
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val pkg = event.packageName?.toString()?.takeIf { it.isNotBlank() } ?: return
                // System UI and launchers fire during transitions and would hide the overlay too early.
                if (pkg != SessionService.OWN_PACKAGE && !isLaunchable(pkg)) return
                SessionService.onForegroundApp(pkg)
            }
            AccessibilityEvent.TYPE_WINDOWS_CHANGED -> {
                // Some OEMs only report cold starts here; double-check with UsageStats, with retries.
                val now = System.currentTimeMillis()
                if (now - lastWindowsCheck < 300) return
                lastWindowsCheck = now
                session.checkNow()
                session.handler.postDelayed({ SessionService.instance?.checkNow() }, 800)
                session.handler.postDelayed({ SessionService.instance?.checkNow() }, 1_600)
            }
        }
    }

    override fun onInterrupt() = Unit

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        launchable.clear()
        return super.onUnbind(intent)
    }
}
