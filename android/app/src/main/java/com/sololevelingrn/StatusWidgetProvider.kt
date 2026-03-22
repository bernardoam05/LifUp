package com.sololevelingrn

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

class StatusWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
        val jsonData = prefs.getString("widgetData", "{}") ?: "{}"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_status)

            try {
                val json = JSONObject(jsonData)
                if (json.has("status")) {
                    val status = json.getJSONObject("status")
                    val level = status.getInt("level")
                    val xp = status.getInt("xp")
                    val rank = status.getString("rank")
                    val nextXp = status.getInt("nextRankXp")

                    views.setTextViewText(R.id.status_rank, "RANK: $rank")
                    views.setTextViewText(R.id.status_level, "NÍVEL: $level")
                    views.setTextViewText(R.id.status_xp_text, "XP: $xp / $nextXp")
                    
                    val progress = if (nextXp > 0) (xp * 100) / nextXp else 0
                    views.setProgressBar(R.id.status_xp_progress, 100, progress, false)
                }
            } catch (e: Exception) {
                // Ignore
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
