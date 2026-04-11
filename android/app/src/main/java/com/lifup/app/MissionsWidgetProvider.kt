package com.lifup.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.widget.RemoteViews
import android.app.PendingIntent
import android.content.Intent
import org.json.JSONObject

class MissionsWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
        val jsonData = prefs.getString("widgetData", "{}") ?: "{}"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_missions)

            try {
                val json = JSONObject(jsonData)
                if (json.has("dailyQuests")) {
                    val quests = json.getJSONArray("dailyQuests")
                    val missionIds = listOf(R.id.mission_1, R.id.mission_2, R.id.mission_3)
                    
                    for (i in 0 until 3) {
                        if (i < quests.length()) {
                            val q = quests.getJSONObject(i)
                            val label = q.getString("label")
                            val done = q.getBoolean("done")
                            
                            val prefix = if (done) "✓ " else "• "
                            views.setTextViewText(missionIds[i], prefix + label)
                            views.setTextColor(missionIds[i], if (done) Color.parseColor("#22c55e") else Color.WHITE)
                        } else {
                            views.setTextViewText(missionIds[i], "")
                        }
                    }
                    
                    if (quests.length() > 3) {
                        views.setTextViewText(R.id.mission_extra, "+${quests.length() - 3} mais missões")
                        views.setViewVisibility(R.id.mission_extra, android.view.View.VISIBLE)
                    } else {
                        views.setViewVisibility(R.id.mission_extra, android.view.View.GONE)
                    }
                }
            } catch (e: Exception) {
                views.setTextViewText(R.id.mission_1, "Erro ao carregar dados")
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
