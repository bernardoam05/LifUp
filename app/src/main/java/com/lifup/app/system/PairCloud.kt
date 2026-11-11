package com.lifup.app.system

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.Source
import com.lifup.app.BuildConfig
import com.lifup.app.domain.PairLink
import com.lifup.app.domain.PairQuest
import com.lifup.app.domain.PairRecurrence
import com.lifup.app.domain.PairRepeat
import com.lifup.app.domain.PairRules
import com.lifup.app.domain.PartnerMark
import kotlinx.coroutines.tasks.await
import java.util.Date

/**
 * The only code that talks to Firestore (docs/PAIRS.md, section 2). The security rules in firebase/firestore.rules
 * decide what each call may do; this keeps to them. Nothing here touches the game state: callers feed results
 * into the engine. The anonymous sign-in only happens the first time someone creates or joins a pair.
 */
object PairCloud {
    class QuotaExhausted : Exception()
    class NotFound : Exception()
    class PairFull : Exception()

    /** What one read of a pair found. [gone]: deleted, or this phone is no longer in it. */
    data class Snapshot(val partnerUid: String?, val partnerName: String?, val marks: Map<String, PartnerMark>, val gone: Boolean, val membersLeft: Int)

    private const val APP = "pairs"
    private const val EXPIRE_MS = 30L * 24 * 3_600_000

    private fun app(context: Context): FirebaseApp = FirebaseApp.getApps(context).firstOrNull { it.name == APP }
        ?: FirebaseApp.initializeApp(
            context.applicationContext,
            FirebaseOptions.Builder()
                .setProjectId(BuildConfig.FIREBASE_PROJECT)
                .setApplicationId(BuildConfig.FIREBASE_APP_ID)
                .setApiKey(BuildConfig.FIREBASE_API_KEY)
                .build(),
            APP,
        )

    private fun db(context: Context) = FirebaseFirestore.getInstance(app(context))

    private suspend fun uid(context: Context): String = call {
        val auth = FirebaseAuth.getInstance(app(context))
        auth.currentUser?.uid ?: auth.signInAnonymously().await().user!!.uid
    }

    private fun expiry() = Timestamp(Date(System.currentTimeMillis() + EXPIRE_MS))

    /** Maps the quota error, which the app has to handle (docs/PAIRS.md, 1.4), to its own type. */
    private suspend fun <T> call(block: suspend () -> T): T = try {
        block()
    } catch (e: FirebaseFirestoreException) {
        when (e.code) {
            FirebaseFirestoreException.Code.RESOURCE_EXHAUSTED -> throw QuotaExhausted()
            FirebaseFirestoreException.Code.NOT_FOUND -> throw NotFound()
            else -> throw e
        }
    }

    private fun recurrenceMap(r: PairRecurrence) = mapOf("kind" to r.kind.name.lowercase(), "days" to r.days, "every" to r.every)

    private fun recurrenceOf(m: Map<*, *>?): PairRecurrence = PairRecurrence(
        kind = runCatching { PairRepeat.valueOf((m?.get("kind") as String).uppercase()) }.getOrDefault(PairRepeat.DAILY),
        days = (m?.get("days") as? List<*>)?.mapNotNull { (it as? Number)?.toInt() }.orEmpty(),
        every = (m?.get("every") as? Number)?.toInt() ?: 2,
    )

    private fun partDoc(name: String, level: Int) = mapOf("name" to name.take(24), "level" to level.coerceIn(1, 1000), "done" to emptyMap<String, Any>(), "expireAt" to expiry())

    /** Creates a pair with this phone alone in it, and its invite. */
    suspend fun create(context: Context, defId: String, recurrence: PairRecurrence, tz: String, start: String, name: String, level: Int): PairQuest = call {
        val me = uid(context)
        val db = db(context)
        val ref = db.collection("pairs").document()
        val secret = PairLink.newSecret()
        ref.set(
            mapOf(
                "createdBy" to me, "members" to listOf(me), "quest" to defId, "recurrence" to recurrenceMap(recurrence),
                "tz" to tz, "start" to start, "secret" to secret, "expireAt" to expiry(),
            )
        ).await()
        ref.collection("parts").document(me).set(partDoc(name, level)).await()
        val (code, expires) = invite(context, ref.id)
        PairQuest(ref.id, defId, recurrence, tz, start, creator = true, myUid = me, secret = secret, invite = code, inviteExpires = expires, lastBump = System.currentTimeMillis())
    }

    /** A fresh invite for a pair nobody joined yet (the last one expired). */
    suspend fun invite(context: Context, pairId: String): Pair<String, Long> = call {
        val me = uid(context)
        val expires = System.currentTimeMillis() + PairRules.INVITE_MS - 60_000
        val code = PairLink.newInviteCode()
        db(context).collection("invites").document(code).set(mapOf("pairId" to pairId, "by" to me, "expireAt" to Timestamp(Date(expires)))).await()
        code to expires
    }

    /** Joins with a code: adds this phone to the pair, writes its part and uses the invite up. */
    suspend fun join(context: Context, code: String, name: String, level: Int): PairQuest = call {
        val me = uid(context)
        val db = db(context)
        val invite = try {
            db.collection("invites").document(code).get(Source.SERVER).await()
        } catch (e: FirebaseFirestoreException) {
            // Expired invites can't be read, so they look like missing ones.
            if (e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) throw NotFound() else throw e
        }
        val pairId = invite.getString("pairId") ?: throw NotFound()
        val ref = db.collection("pairs").document(pairId)
        try {
            ref.update(mapOf("members" to FieldValue.arrayUnion(me), "invite" to code, "expireAt" to expiry())).await()
        } catch (e: FirebaseFirestoreException) {
            // Someone else got there first, or the creator left.
            if (e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) throw PairFull() else throw e
        }
        val pair = ref.get(Source.SERVER).await()
        ref.collection("parts").document(me).set(partDoc(name, level)).await()
        runCatching { db.collection("invites").document(code).delete().await() }
        val creator = pair.getString("createdBy").orEmpty()
        val creatorPart = runCatching { ref.collection("parts").document(creator).get(Source.SERVER).await() }.getOrNull()
        PairQuest(
            id = pairId,
            defId = pair.getString("quest").orEmpty(),
            recurrence = recurrenceOf(pair.get("recurrence") as? Map<*, *>),
            tz = pair.getString("tz") ?: "UTC",
            start = pair.getString("start").orEmpty(),
            creator = false,
            myUid = me,
            secret = pair.getString("secret").orEmpty(),
            partnerUid = creator,
            partnerName = creatorPart?.getString("name").orEmpty(),
            lastRead = System.currentTimeMillis(),
            lastBump = System.currentTimeMillis(),
            partner = creatorPart?.let { marksOf(it.get("done")) }.orEmpty(),
        )
    }

    private fun marksOf(done: Any?): Map<String, PartnerMark> = (done as? Map<*, *>)?.mapNotNull { (k, v) ->
        val m = v as? Map<*, *> ?: return@mapNotNull null
        val at = (m["at"] as? Timestamp)?.toDate()?.time ?: return@mapNotNull null
        (k as String) to PartnerMark(at, (m["amount"] as? Number)?.toInt() ?: 0)
    }?.toMap().orEmpty()

    /** One read of the pair and its parts, straight from the server. */
    suspend fun read(context: Context, p: PairQuest): Snapshot = call {
        uid(context)
        val ref = db(context).collection("pairs").document(p.id)
        val pair = try {
            ref.get(Source.SERVER).await()
        } catch (e: FirebaseFirestoreException) {
            if (e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) return@call Snapshot(null, null, emptyMap(), gone = true, membersLeft = 0)
            throw e
        }
        if (!pair.exists()) return@call Snapshot(null, null, emptyMap(), gone = true, membersLeft = 0)
        val members = (pair.get("members") as? List<*>)?.filterIsInstance<String>().orEmpty()
        if (p.myUid !in members) return@call Snapshot(null, null, emptyMap(), gone = true, membersLeft = members.size)
        val partner = members.firstOrNull { it != p.myUid }
        // The partner had joined and is no longer in: they left.
        if (partner == null && p.partnerUid != null) return@call Snapshot(null, null, emptyMap(), gone = true, membersLeft = members.size)
        val part = partner?.let { ref.collection("parts").document(it).get(Source.SERVER).await() }
        Snapshot(partner, part?.getString("name"), marksOf(part?.get("done")), gone = false, membersLeft = members.size)
    }

    /**
     * Writes this phone's completion of [cycle] (the server stamps the time) and prunes its oldest ones. Every week
     * or so it also renews the pair's own expiry, which this write alone doesn't touch.
     */
    suspend fun markDone(context: Context, p: PairQuest, cycle: String, amount: Int, name: String, level: Int, bump: Boolean) = call {
        uid(context)
        val ref = db(context).collection("pairs").document(p.id)
        val prune = p.sentCycles.filter { it != cycle }.dropLast(PairRules.KEEP_CYCLES - 1)
        // update(FieldPath, value, more...) wants FieldPaths throughout: cycle keys have dashes.
        val more = mutableListOf<Any>(
            FieldPath.of("last"), cycle,
            FieldPath.of("name"), name.take(24),
            FieldPath.of("level"), level.coerceIn(1, 1000),
            FieldPath.of("expireAt"), expiry(),
        )
        prune.forEach { more += FieldPath.of("done", it); more += FieldValue.delete() }
        ref.collection("parts").document(p.myUid)
            .update(FieldPath.of("done", cycle), mapOf("at" to FieldValue.serverTimestamp(), "amount" to amount.coerceIn(0, 100_000)), *more.toTypedArray())
            .await()
        if (bump) runCatching { ref.update("expireAt", expiry()).await() }
        Unit
    }

    /**
     * Leaves the pair, cleaning up what the rules let this phone clean: its own part always; the whole pair when
     * nobody else is in it (or the pair is a one-off that's over for both).
     */
    suspend fun leave(context: Context, p: PairQuest) = call {
        uid(context)
        val db = db(context)
        val ref = db.collection("pairs").document(p.id)
        p.invite?.let { code -> runCatching { db.collection("invites").document(code).delete().await() } }
        val pair = runCatching { ref.get(Source.SERVER).await() }.getOrNull()
        val members = (pair?.get("members") as? List<*>)?.filterIsInstance<String>().orEmpty()
        if (pair == null || !pair.exists() || p.myUid !in members) return@call
        if (members.size <= 1) {
            runCatching { ref.collection("parts").document(p.myUid).delete().await() }
            ref.delete().await()
        } else {
            runCatching { ref.collection("parts").document(p.myUid).delete().await() }
            ref.update("members", members - p.myUid).await()
        }
        Unit
    }
}
