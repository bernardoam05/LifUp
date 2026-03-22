package com.sololevelingrn

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

class StreakWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
        val jsonData = prefs.getString("widgetData", "{}") ?: "{}"
        
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_streak)
            
            try {
                val json = JSONObject(jsonData)
                if (json.has("streak")) {
                    views.setTextViewText(R.id.streak_count, json.getInt("streak").toString())
                }
            } catch (e: Exception) {
                // Keep default or show 0
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
