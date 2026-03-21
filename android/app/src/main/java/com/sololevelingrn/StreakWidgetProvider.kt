package com.sololevelingrn

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.util.Log

class StreakWidgetProvider : AppWidgetProvider() {

    companion object {
        // Must stay in sync with WidgetStorageModule.kt
        private const val PREFS_NAME = "SoloLevelingWidget"
        private const val KEY_STREAK = "currentStreak"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        Log.d("StreakWidget", "onUpdate — ids=${appWidgetIds.toList()}")

        val streak = try {
            context
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getInt(KEY_STREAK, 0)
        } catch (e: Exception) {
            Log.e("StreakWidget", "SharedPreferences read failed", e)
            0
        }

        Log.d("StreakWidget", "streak=$streak")

        for (id in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_streak)

                // Safe-Mode: only setTextViewText — no setInt / setTextColor reflection
                // that crashes the MIUI AppWidgetHost process.
                // All colors are defined in widget_streak.xml.
                views.setTextViewText(R.id.widget_count_display, streak.toString())

                appWidgetManager.updateAppWidget(id, views)
                Log.d("StreakWidget", "Updated id=$id streak=$streak")

            } catch (e: Exception) {
                Log.e("StreakWidget", "Failed to update id=$id", e)
                try {
                    val err = RemoteViews(context.packageName, R.layout.widget_streak)
                    err.setTextViewText(R.id.widget_count_display, "ERR")
                    appWidgetManager.updateAppWidget(id, err)
                } catch (_: Exception) { /* nothing more we can do */ }
            }
        }
    }
}
