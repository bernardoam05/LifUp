package com.lifup.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.app.PendingIntent
import android.content.Intent
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

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
