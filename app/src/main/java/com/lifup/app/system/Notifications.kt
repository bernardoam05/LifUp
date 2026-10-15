package com.lifup.app.system

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.lifup.app.MainActivity
import com.lifup.app.R

object Notifications {
    const val CH_SESSION = "session"
    const val CH_EVENTS = "events"
    const val CH_REMINDERS = "reminders"

    const val ID_SESSION = 1337
    const val ID_GPS = 1338
    private const val ID_RUN = 1339
    private const val ID_PORTAL = 2001
    private const val ID_FOCUS_DONE = 2002
    private const val ID_PENALTY = 2003
    private const val ID_REMINDER = 2004
    private const val ID_POMODORO = 2005

    fun createChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannels(
            listOf(
                NotificationChannel(CH_SESSION, context.getString(R.string.channel_session), NotificationManager.IMPORTANCE_DEFAULT).apply {
                    setSound(null, null); enableVibration(false)
                },
                NotificationChannel(CH_EVENTS, context.getString(R.string.channel_events), NotificationManager.IMPORTANCE_HIGH),
                NotificationChannel(CH_REMINDERS, context.getString(R.string.channel_reminders), NotificationManager.IMPORTANCE_DEFAULT),
            )
        )
    }

    fun openApp(context: Context, route: String = "today"): PendingIntent = PendingIntent.getActivity(
        context, route.hashCode(),
        Intent(Intent.ACTION_VIEW, Uri.parse("lifup://$route"), context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun canPost(context: Context) =
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    private fun post(context: Context, id: Int, channel: String, title: String, text: String, route: String) {
        if (!canPost(context)) return
        val n = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_lifup)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(openApp(context, route))
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(id, n) }
    }

    fun portalOpened(context: Context, quest: String, minutes: Long) = post(
        context, ID_PORTAL, CH_EVENTS, context.getString(R.string.notif_portal_title),
        context.getString(R.string.notif_portal_text, quest, minutes), "today",
    )

    fun focusDone(context: Context, minutes: Int) = post(
        context, ID_FOCUS_DONE, CH_EVENTS, context.getString(R.string.notif_focus_done_title),
        context.getString(R.string.notif_focus_done_text, minutes), "focus",
    )

    fun pomodoroPhase(context: Context, work: Boolean, cycle: Int) = post(
        context, ID_POMODORO, CH_EVENTS,
        context.getString(if (work) R.string.notif_pomodoro_work else R.string.notif_pomodoro_break),
        context.getString(R.string.notif_pomodoro_cycle, cycle), "focus",
    )

    fun penaltyApplied(context: Context, quests: Int) = post(
        context, ID_PENALTY, CH_EVENTS, context.getString(R.string.notif_penalty_title),
        context.getString(R.string.notif_penalty_text, quests), "today",
    )

    fun reminder(context: Context, left: Int) = post(
        context, ID_REMINDER, CH_REMINDERS, context.getString(R.string.notif_reminder_title),
        context.getString(R.string.notif_reminder_text, left), "today",
    )

    /** Ongoing note for a step-counted run (no service: the counter runs in hardware). */
    fun run(context: Context, r: com.lifup.app.domain.RunSession?) {
        val nm = NotificationManagerCompat.from(context)
        if (r == null || !canPost(context)) { nm.cancel(ID_RUN); return }
        val now = System.currentTimeMillis()
        val n = NotificationCompat.Builder(context, CH_SESSION)
            .setSmallIcon(R.drawable.ic_stat_lifup)
            .setContentTitle(context.getString(if (r.running) R.string.run_notif_running else R.string.run_notif_paused))
            .setContentText(context.getString(R.string.run_km, r.km))
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(r.running)
            .setUsesChronometer(r.running)
            .setWhen(now - r.elapsed(now))
            .setContentIntent(openApp(context, "today"))
            .build()
        runCatching { nm.notify(ID_RUN, n) }
    }

    fun cancelReminder(context: Context) = NotificationManagerCompat.from(context).cancel(ID_REMINDER)
}
