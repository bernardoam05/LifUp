package com.sololevelingrn

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.app.PendingIntent
import android.content.Intent
import org.json.JSONObject

class VanguardWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("SoloLevelingWidget", Context.MODE_PRIVATE)
        val jsonData = prefs.getString("widgetData", "{}") ?: "{}"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_vanguard)

            try {
                val json = JSONObject(jsonData)
                val level = if (json.has("status")) json.getJSONObject("status").getInt("level") else 1

                if (level < 10) {
                    views.setTextViewText(R.id.shadow_1, "SISTEMA BLOQUEADO")
                    views.setTextViewText(R.id.shadow_2, "NÍVEL INSUFICIENTE (Nvl. 10)")
                    views.setTextViewText(R.id.shadow_3, "")
                } else if (json.has("activeShadows")) {
                    val shadows = json.getJSONArray("activeShadows")
                    val shadowViews = listOf(R.id.shadow_1, R.id.shadow_2, R.id.shadow_3)
                    
                    for (i in 0 until 3) {
                        if (i < shadows.length()) {
                            val s = shadows.getJSONObject(i)
                            val name = s.getString("name")
                            val shadowLvl = s.getInt("level")
                            views.setTextViewText(shadowViews[i], "Sombra: $name (NV. $shadowLvl)")
                        } else {
                            views.setTextViewText(shadowViews[i], "Slot ${i+1}: Vazio")
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore or log
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
