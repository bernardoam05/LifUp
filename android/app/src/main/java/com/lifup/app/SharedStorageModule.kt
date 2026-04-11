package com.lifup.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SharedStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SharedStorageModule"

    @ReactMethod
    fun setWidgetData(jsonData: String) {
        android.util.Log.d("SharedStorage", "setWidgetData called with ${jsonData.length} bytes")
        val ctx = reactApplicationContext

        // Persist the huge JSON snapshot in SharedPreferences
        ctx.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
            .edit()
            .putString("widgetData", jsonData)
            .apply()

        // Distribute Intent to all 4 widgets to redraw themselves
        val providers = listOf(
            StreakWidgetProvider::class.java,
            MissionsWidgetProvider::class.java,
            VanguardWidgetProvider::class.java,
            StatusWidgetProvider::class.java
        )

        val manager = AppWidgetManager.getInstance(ctx)
        for (providerClass in providers) {
            val intent = Intent(ctx, providerClass)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = manager.getAppWidgetIds(ComponentName(ctx, providerClass))
            android.util.Log.d("SharedStorage", "Updating ${providerClass.simpleName} with ${ids.size} instances")
            if (ids.isNotEmpty()) {
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                ctx.sendBroadcast(intent)
            }
        }
    }
}
