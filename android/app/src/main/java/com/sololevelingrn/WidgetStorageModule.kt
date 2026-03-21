package com.sololevelingrn

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetStorage"

    @ReactMethod
    fun setStreak(streak: Int) {
        val ctx = reactApplicationContext

        // Persist streak in SharedPreferences
        ctx.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
            .edit()
            .putInt("currentStreak", streak)
            .apply()

        // Push update to all active widget instances
        val manager = AppWidgetManager.getInstance(ctx)
        val ids     = manager.getAppWidgetIds(
            ComponentName(ctx, StreakWidgetProvider::class.java)
        )
        if (ids.isNotEmpty()) {
            val provider = StreakWidgetProvider()
            provider.onUpdate(ctx, manager, ids)
        }
    }
}
