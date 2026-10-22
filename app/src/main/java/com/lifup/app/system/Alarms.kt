package com.lifup.app.system

import com.lifup.app.domain.openBedtime
import com.lifup.app.domain.dayGoal
import com.lifup.app.domain.limitsNearing
import com.lifup.app.domain.openAvoids
import com.lifup.app.domain.rollPortal
import com.lifup.app.domain.Rules
import com.lifup.app.domain.AutoKind
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.text
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.lifup.app.LifUpApp
import com.lifup.app.domain.Ctx
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Pomodoro
import com.lifup.app.domain.allDailyDone
import com.lifup.app.domain.elapsedMinutes
import com.lifup.app.domain.endsAt
import kotlinx.coroutines.launch

/**
 * One exact alarm at the next moment the state needs attention: midnight (close the day even with the
 * app closed), session end, penalty block start/end, portal roll and expiry, Pomodoro phase or the evening reminder.
 */
object Alarms {
    private const val REQUEST = 4242
    private const val PREFS = "alarms"

    fun nextWake(s: GameState, ctx: Ctx, reminderDone: Boolean): Long {
        val now = ctx.now
        val candidates = mutableListOf(ctx.nextMidnight() + 2_000)
        s.focus?.let { f ->
            candidates += f.endsAt() + 500
            f.pomodoro?.let { p ->
                val phase = Pomodoro.phaseAt(p, f.elapsedMinutes(now))
                candidates += f.startedAt + (phase.endsAtMin * 60_000).toLong() + 500
            }
        }
        if (s.penalty.active) {
            if (s.penalty.blockStart > now) candidates += s.penalty.blockStart
            if (s.penalty.blockEnd > now) candidates += s.penalty.blockEnd + 500
        }
        s.portal?.let { candidates += it.expiresAt + 500 }
        nextPortalRoll(s, ctx)?.let { candidates += it }
        if (!reminderDone && s.settings.notifications) {
            val at = ctx.atHour(ctx.today, s.settings.reminderHour)
            if (at > now) candidates += at
        }
        // Sunday evening nudge while the weekly boss is still standing.
        if (s.settings.notifications && ctx.today.dayOfWeek == java.time.DayOfWeek.SUNDAY && s.boss?.defeated == false) {
            val at = ctx.atHour(ctx.today, Rules.BOSS_NUDGE_HOUR)
            if (at > now) candidates += at
        }
        if (s.settings.notifications && s.openAvoids().isNotEmpty()) {
            val at = ctx.atHour(ctx.today, 0) + Rules.AVOID_CHECK_MIN * 60_000L
            if (at > now) candidates += at
        }
        if (s.settings.notifications && s.openBedtime() != null) {
            val at = ctx.atHour(ctx.today, 0) + Rules.BEDTIME_NUDGE_MIN * 60_000L
            if (at > now) candidates += at
        }
        return candidates.filter { it > now }.min()
    }

    /**
     * The next hour's portal roll, while one can still open today: rolled here rather than only when the app
     * opens, so portals also open (and notify) with the app closed.
     */
    private fun nextPortalRoll(s: GameState, ctx: Ctx): Long? {
        val opened = if (s.portalDay == ctx.todayKey) s.portalsToday else 0
        if (s.portal != null || opened >= Rules.MAX_PORTALS_PER_DAY) return null
        val next = ctx.hour + 1
        return if (next in Rules.PORTAL_HOURS) ctx.atHour(ctx.today, next) + 1_000 else null
    }

    fun schedule(context: Context, s: GameState) {
        val ctx = Ctx(LifUpApp.store.content, System.currentTimeMillis())
        val at = nextWake(s, ctx, reminderSentToday(context, ctx.todayKey))
        val am = context.getSystemService(AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(
            context, REQUEST, Intent(context, TickReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        runCatching {
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    private fun reminderSentToday(context: Context, today: String) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("reminder", "") == today

    /** Evening nudge that says what is actually at stake, plus a late one for an open bedtime check-in. */
    fun maybeRemind(context: Context, s: GameState) {
        val ctx = Ctx(LifUpApp.store.content, System.currentTimeMillis())
        if (!s.settings.notifications || s.daily.rest) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (ctx.hour >= s.settings.reminderHour && !reminderSentToday(context, ctx.todayKey)) {
            prefs.edit().putString("reminder", ctx.todayKey).apply()
            if (!s.allDailyDone()) Notifications.reminder(context, s.dayGoal())
        }
        val boss = s.boss
        if (ctx.today.dayOfWeek == java.time.DayOfWeek.SUNDAY && ctx.hour >= Rules.BOSS_NUDGE_HOUR && boss != null && !boss.defeated &&
            prefs.getString("boss", "") != ctx.weekKey
        ) {
            prefs.edit().putString("boss", ctx.weekKey).apply()
            val name = LifUpApp.store.content.bossById[boss.bossId]?.title?.let { it.text(java.util.Locale.getDefault().language) }.orEmpty()
            Notifications.bossLastDay(context, name, boss.hp)
        }
        val minute = ctx.dateTime.hour * 60 + ctx.dateTime.minute
        if (minute >= Rules.AVOID_CHECK_MIN && prefs.getString("avoid", "") != ctx.todayKey && s.openAvoids().isNotEmpty()) {
            prefs.edit().putString("avoid", ctx.todayKey).apply()
            Notifications.avoidCheck(context, s.openAvoids())
        }
        if (minute >= Rules.BEDTIME_NUDGE_MIN && prefs.getString("bedtime", "") != ctx.todayKey) {
            if (s.openBedtime() != null) {
                prefs.edit().putString("bedtime", ctx.todayKey).apply()
                Notifications.bedtime(context, s.openBedtime()!!.id)
            }
        }
    }

    private var dismissed: List<Int>? = null

    /**
     * Takes back nudges that no longer hold: the day got safe, the check-in was made, the portal closed,
     * or they were yesterday's. Only acts when that set changes, since it runs on every state change.
     */
    fun dismissResolved(context: Context, s: GameState) {
        val ctx = Ctx(LifUpApp.store.content, System.currentTimeMillis())
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        fun today(key: String) = prefs.getString(key, "") == ctx.todayKey
        val gone = buildList {
            if (!today("reminder") || s.allDailyDone()) add(Notifications.ID_REMINDER)
            if (!today("avoid") || s.openAvoids().isEmpty()) add(Notifications.ID_AVOID)
            if (!today("bedtime") || s.openBedtime() == null) add(Notifications.ID_BEDTIME)
            if (prefs.getString("boss", "") != ctx.weekKey || ctx.today.dayOfWeek != java.time.DayOfWeek.SUNDAY || s.boss?.defeated != false) add(Notifications.ID_BOSS)
            AutoKind.entries.forEach { k ->
                if (prefs.getString("limit_$k", "") != s.day || s.dailyQuests.none { it.auto == k && it.status == QuestStatus.OPEN }) add(Notifications.ID_LIMIT + k.ordinal)
            }
            if (s.portal == null) add(Notifications.ID_PORTAL)
            if (s.focus == null) add(Notifications.ID_POMODORO)
            if (!s.penalty.active) add(Notifications.ID_PENALTY)
        }
        if (gone == dismissed) return
        dismissed = gone
        Notifications.cancel(context, gone)
    }

    /** Once a day per mission: a measured limit (screen or distraction time) is about to break. */
    fun maybeWarnLimits(context: Context, s: GameState) {
        if (!s.settings.notifications || s.daily.rest) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val lang = java.util.Locale.getDefault().language
        s.limitsNearing().forEach { (q, left) ->
            val key = "limit_${q.auto}"
            if (prefs.getString(key, "") == s.day) return@forEach
            prefs.edit().putString(key, s.day).apply()
            Notifications.limitNearing(context, q.auto!!.ordinal, q.title.text(lang), left)
        }
    }
}

/** Catches the state up with the clock and re-syncs alarms/services, keeping the receiver alive meanwhile. */
private fun BroadcastReceiver.tick(context: Context) {
    val pending = goAsync()
    val store = LifUpApp.store
    store.scope.launch {
        try {
            val s = AutoTracker.dispatchCatchingUp(context) { rollPortal() }
            Alarms.maybeRemind(context, s)
            SystemSync.apply(context, s)
        } finally {
            pending?.finish()
        }
    }
}

class TickReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = tick(context)
}

/** Boot, app update and clock/timezone changes all need the alarm rescheduled. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = tick(context)
}
