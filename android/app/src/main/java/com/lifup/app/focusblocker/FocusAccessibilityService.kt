package com.lifup.app.focusblocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class FocusAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile var isConnected = false
    }

    // Cache of pkg → hasLaunchIntent.
    // System packages (com.android.systemui, android, system launchers using CATEGORY_HOME)
    // return null from getLaunchIntentForPackage() and are filtered out.
    // Regular user apps (Instagram, TikTok, Chrome, etc.) return a valid intent.
    // This is the root fix for "blocking only works from SL": those system events were
    // overwriting lastKnownForegroundPkg with a non-blocked package, causing removeOverlay().
    private val launchableCache = HashMap<String, Boolean>()

    private fun isLaunchableApp(pkg: String): Boolean {
        return launchableCache.getOrPut(pkg) {
            packageManager.getLaunchIntentForPackage(pkg) != null
        }
    }

    // Debounce timestamp for TYPE_WINDOWS_CHANGED — this event fires very frequently
    // (every status-bar update, keyboard show/hide, notification popup…).
    // We only want to trigger a UsageStats check at most once per 300 ms from it.
    private var lastWindowsChangedCheckMs = 0L

    override fun onServiceConnected() {
        isConnected = true
        launchableCache.clear()
        // Boost the main thread's nice level so MIUI/HyperOS allocates more of the
        // background cgroup's CPU budget to our process. This reduces the delay between
        // an ACC event arriving in the queue and actually being dispatched.
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_DISPLAY)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (!FocusBlockerService.isRunning) return

        when (event.eventType) {

            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // Primary path: instant pkg detection for overlay show/remove.
                val pkg = event.packageName?.toString() ?: return
                if (pkg.isBlank()) return

                // Skip packages with no launchable activity (com.android.systemui, android,
                // CATEGORY_HOME launchers, etc.) — they fire during transitions and would
                // corrupt lastKnownForegroundPkg, causing the overlay to be removed too early.
                // OWN_PACKAGE is exempt so the OWN_PACKAGE guard always fires.
                if (pkg != FocusBlockerService.OWN_PACKAGE && !isLaunchableApp(pkg)) return

                FocusBlockerService.notifyForegroundPackage(pkg)
            }

            AccessibilityEvent.TYPE_WINDOWS_CHANGED -> {
                // Supplementary path: fires for cold-start app launches that MIUI/Xiaomi
                // does NOT deliver via TYPE_WINDOW_STATE_CHANGED (window creation vs state
                // change). We trigger immediate + retried UsageStats checks.
                // Direct call (no handler.post): accessibility callbacks run on the main
                // thread, so calling directly is safe AND bypasses MIUI handler throttling.
                // Retries via postDelayed cover the case where UsageStats hasn't committed
                // the ACTIVITY_RESUMED event yet (can lag 0.5-1.5 s on MIUI).
                val now = System.currentTimeMillis()
                if (now - lastWindowsChangedCheckMs < 300) return  // debounce
                lastWindowsChangedCheckMs = now
                val inst = FocusBlockerService.serviceInstance ?: return
                inst.checkForegroundApp()  // immediate — on main thread already
                inst.handler.postDelayed({ FocusBlockerService.serviceInstance?.checkForegroundApp() }, 800)
                inst.handler.postDelayed({ FocusBlockerService.serviceInstance?.checkForegroundApp() }, 1_600)
            }
        }
    }

    override fun onInterrupt() {}

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        isConnected = false
        launchableCache.clear()
        return super.onUnbind(intent)
    }
}
