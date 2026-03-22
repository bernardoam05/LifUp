package com.sololevelingrn

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

class VanguardWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
        val jsonData = prefs.getString("widgetData", "{}") ?: "{}"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_vanguard)

            try {
                val json = JSONObject(jsonData)
                if (json.has("activeShadows")) {
                    val shadows = json.getJSONArray("activeShadows")
                    val shadowViews = listOf(R.id.shadow_1, R.id.shadow_2, R.id.shadow_3)
                    
                    for (i in 0 until 3) {
                        if (i < shadows.length()) {
                            val s = shadows.getJSONObject(i)
                            val name = s.getString("name")
                            val level = s.getInt("level")
                            views.setTextViewText(shadowViews[i], "Sombra: $name (NV. $level)")
                        } else {
                            views.setTextViewText(shadowViews[i], "Slot ${i+1}: Vazio")
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore or log
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
