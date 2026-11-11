package com.lifup.app.system

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.lifup.app.LifUpApp
import com.lifup.app.domain.PairLink
import com.lifup.app.domain.PairQuest
import com.lifup.app.domain.PairRecurrence
import com.lifup.app.domain.PairRules
import com.lifup.app.domain.PartnerMark
import com.lifup.app.domain.activePairs
import com.lifup.app.domain.canAddPair
import com.lifup.app.domain.addPair
import com.lifup.app.domain.completePairPart
import com.lifup.app.domain.deadline
import com.lifup.app.domain.defOf
import com.lifup.app.domain.dropPair
import com.lifup.app.domain.droppable
import com.lifup.app.domain.isCycleDay
import com.lifup.app.domain.joined
import com.lifup.app.domain.leavePair
import com.lifup.app.domain.nextPairWake
import com.lifup.app.domain.nudgeDue
import com.lifup.app.domain.pairBumped
import com.lifup.app.domain.pairInvite
import com.lifup.app.domain.pairLinkMark
import com.lifup.app.domain.pairNudged
import com.lifup.app.domain.pairQuotaBlocked
import com.lifup.app.domain.pairQuotaHit
import com.lifup.app.domain.pairRead
import com.lifup.app.domain.pairSent
import com.lifup.app.domain.partnerDone
import com.lifup.app.domain.text
import com.lifup.app.domain.useLinkRead
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

/**
 * Runs pair quests against the cloud: sends completions, reads the partner only when it matters (docs/PAIRS.md,
 * 1.4: after a deadline, after the quota reset, for the evening reminder, or with the app open), settles cycles
 * through the engine, and plans the next background run. No periodic polling.
 */
object PairService {
    private const val TAG = "PairService"
    private const val WORK = "pair-sync"
    private const val OPEN_READ_MS = 10 * 60_000L
    private const val BUMP_MS = 7L * 24 * 3_600_000
    private const val RETRY_MS = 15 * 60_000L
    private val mutex = Mutex()

    enum class Failure { NETWORK, QUOTA, NOT_FOUND, FULL, LIMIT }

    private val store get() = LifUpApp.store

    /**
     * A pair part completed anywhere (its sheet, the counter, focus, a run) goes to the cloud right away, so the
     * partner sees it; installed once from the Application.
     */
    fun install(context: Context, store: com.lifup.app.data.GameStore) {
        val app = context.applicationContext
        store.addListener { old, new ->
            fun done(s: com.lifup.app.domain.GameState) = s.pairs.flatMap { p -> p.parts.filter { it.doneAt != null }.map { p.id + it.cycle } }.toSet()
            if ((done(new) - done(old)).isNotEmpty()) store.scope.launch { sync(app, foreground = true) }
        }
    }

    /** A join link was opened: Today shows "join with a code" with this code until it's handled. */
    val pendingJoin = kotlinx.coroutines.flow.MutableStateFlow<String?>(null)

    private fun failureOf(e: Throwable) = when (e) {
        is PairCloud.QuotaExhausted -> Failure.QUOTA
        is PairCloud.NotFound -> Failure.NOT_FOUND
        is PairCloud.PairFull -> Failure.FULL
        else -> Failure.NETWORK
    }

    /** Runs a user action against the cloud; a quota error also pauses the background sync until the reset. */
    private suspend fun <T> attempt(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: kotlinx.coroutines.CancellationException) {
        throw e
    } catch (e: Exception) {
        if (e is PairCloud.QuotaExhausted) store.dispatch { pairQuotaHit() }
        Log.w(TAG, "pair action failed", e)
        Result.failure(e)
    }

    /** The first cycle from today on, in this phone's calendar (the creator's). */
    private fun firstCycle(recurrence: PairRecurrence, zone: ZoneId): String {
        val today = LocalDate.now(zone)
        val probe = PairQuest("", "", recurrence, zone.id, today.toString(), true, "", "")
        return generateSequence(today) { it.plusDays(1) }.take(8).firstOrNull { probe.isCycleDay(it) }?.toString() ?: today.toString()
    }

    suspend fun create(context: Context, defId: String, recurrence: PairRecurrence): Result<PairQuest> = attempt {
        val s = store.current
        if (!s.canAddPair()) error("limit")
        val zone = ZoneId.systemDefault()
        val p = PairCloud.create(context, defId, recurrence, zone.id, firstCycle(recurrence, zone), s.player.name, s.player.level)
        store.dispatch { addPair(p) }
        schedule(context)
        p
    }

    suspend fun join(context: Context, code: String): Result<PairQuest> = attempt {
        val s = store.current
        if (!s.canAddPair()) error("limit")
        val p = PairCloud.join(context, PairLink.normalizeCode(code), s.player.name, s.player.level)
        store.dispatch { addPair(p) }
        schedule(context)
        p
    }

    fun failure(e: Throwable?): Failure = if (e?.message == "limit") Failure.LIMIT else failureOf(e ?: Exception())

    suspend fun renewInvite(context: Context, id: String): Result<Unit> = attempt {
        val (code, expires) = PairCloud.invite(context, id)
        store.dispatch { pairInvite(id, code, expires) }
        Unit
    }

    fun complete(context: Context, id: String) {
        store.scope.launch {
            store.dispatch { completePairPart(id) }
            sync(context, foreground = true)
        }
    }

    fun leave(context: Context, id: String) {
        store.scope.launch {
            store.dispatch { leavePair(id) }
            sync(context, foreground = true)
        }
    }

    /** The link that tells the partner this phone finished [cycle], or null if it hasn't. */
    fun shareLink(p: PairQuest, cycle: String): String? {
        val part = p.parts.firstOrNull { it.cycle == cycle } ?: return null
        val at = part.doneAt ?: return null
        return PairLink.build(PairLink.Done(p.id, cycle, p.myUid, part.target.roundToInt(), at), p.secret)
    }

    /**
     * A partner's link was opened: if it checks out, their completion counts even without the cloud, and (a few
     * times a day at most) one read brings the rest. Returns false for a link that isn't for any pair here.
     */
    suspend fun openLink(context: Context, data: String): Boolean {
        val (done, raw) = PairLink.parse(data) ?: return false
        val p = store.current.pairs.firstOrNull { it.id == done.pairId } ?: return false
        if (done.uid == p.myUid || !PairLink.verify(raw, p.secret)) return false
        if (p.partner.containsKey(done.cycle)) return true // seen already: no read
        var read = false
        store.dispatch {
            pairLinkMark(p.id, done.cycle, PartnerMark(done.at, done.amount, viaLink = true))
            read = useLinkRead()
        }
        if (read) sync(context, foreground = true, force = setOf(p.id))
        return true
    }

    private fun needsRead(p: PairQuest, now: Long, foreground: Boolean): Boolean {
        if (foreground && now - p.lastRead > OPEN_READ_MS) return true
        if (!p.joined) return now - p.lastRead > 6 * 3_600_000L - 60_000
        if (p.nudgeDue(now) != null) return true
        return p.parts.any { part ->
            if (part.outcome != null) return@any false
            val dl = p.deadline(part.cycle)
            val first = dl + PairRules.SETTLE_DELAY_MS
            val final = PairRules.finalCheckAt(dl)
            (now >= first && p.lastRead < first) || (now >= final && p.lastRead < final)
        }
    }

    /** Brings every pair up to date with the cloud, then plans the next run. Safe to call often. */
    suspend fun sync(context: Context, foreground: Boolean, force: Set<String> = emptySet()) = mutex.withLock {
        store.dispatch() // let the engine catch up with the clock first (cycles, settlements)
        if (store.current.pairs.isEmpty()) { cancel(context); return@withLock }
        if (store.current.pairQuotaBlocked(System.currentTimeMillis())) { schedule(context); return@withLock }
        try {
            sendCompletions(context)
            readPartners(context, foreground, force)
            nudge(context)
            clearEnded(context)
        } catch (e: PairCloud.QuotaExhausted) {
            store.dispatch { pairQuotaHit() }
        } catch (e: Exception) {
            // Network trouble or a pair that changed under us: try again later, never in a tight loop.
            Log.w(TAG, "sync failed", e)
            schedule(context, minDelayMs = RETRY_MS)
            return@withLock
        }
        schedule(context)
    }

    private suspend fun sendCompletions(context: Context) {
        val s = store.current
        s.pairs.forEach { p ->
            p.parts.filter { it.doneAt != null && !it.sent }.forEach { part ->
                val now = System.currentTimeMillis()
                val bump = now - p.lastBump > BUMP_MS
                PairCloud.markDone(context, p, part.cycle, part.target.roundToInt(), s.player.name, s.player.level, bump)
                store.dispatch {
                    pairSent(p.id, part.cycle)
                    if (bump) pairBumped(p.id)
                }
            }
        }
    }

    private suspend fun readPartners(context: Context, foreground: Boolean, force: Set<String>) {
        val now = System.currentTimeMillis()
        store.current.activePairs().filter { it.id in force || needsRead(it, now, foreground) }.forEach { p ->
            val snap = PairCloud.read(context, p)
            store.dispatch { pairRead(p.id, snap.partnerUid, snap.partnerName, snap.marks, snap.gone, snap.left) }
        }
    }

    /** At 20:00, a part still open: say whether the partner already did theirs. Once per cycle. */
    private suspend fun nudge(context: Context) {
        val now = System.currentTimeMillis()
        val s = store.current
        s.activePairs().forEach { p ->
            val part = p.nudgeDue(now) ?: return@forEach
            if (s.settings.notifications) {
                val mission = part.quest?.title?.text(java.util.Locale.getDefault().language).orEmpty()
                Notifications.pairNudge(context, p.id, p.partnerName, mission, p.partnerDone(part.cycle))
            }
            store.dispatch { pairNudged(p.id, part.cycle) }
        }
    }

    /** Pairs that are over: leave them in the cloud (what the rules allow), then forget them here. */
    private suspend fun clearEnded(context: Context) {
        store.current.pairs.filter { it.droppable() }.forEach { p ->
            runCatching { PairCloud.leave(context, p) }.onFailure { if (it is PairCloud.QuotaExhausted) throw it }
            store.dispatch { dropPair(p.id) }
        }
    }

    fun schedule(context: Context, minDelayMs: Long = 0) {
        val s = store.current
        val now = System.currentTimeMillis()
        val wake = s.nextPairWake(now) ?: return cancel(context)
        val request = OneTimeWorkRequestBuilder<PairWorker>()
            .setInitialDelay((wake - now).coerceAtLeast(minDelayMs), TimeUnit.MILLISECONDS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(WORK, ExistingWorkPolicy.REPLACE, request)
    }

    private fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK)
    }
}

class PairWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        PairService.sync(applicationContext, foreground = false)
        return Result.success()
    }
}
