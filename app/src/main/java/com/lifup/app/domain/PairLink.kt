package com.lifup.app.domain

import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * "Tell my partner" links (docs/PAIRS.md, 1.5): https://<host>/p/#<payload>.<signature>. Everything rides in the
 * fragment, which never leaves the phone that opens it. The signature is an HMAC with the pair's secret, which
 * only the two members can read, so a link can't be forged for a pair or changed on the way.
 */
object PairLink {
    const val HOST = "questborn-38f2a.web.app"
    const val PATH = "/p/"
    private const val VERSION = "1"

    data class Done(val pairId: String, val cycle: String, val uid: String, val amount: Int, val at: Long)

    private val b64 = Base64.getUrlEncoder().withoutPadding()
    private val unb64 = Base64.getUrlDecoder()

    fun newSecret(): String = ByteArray(32).also { SecureRandom().nextBytes(it) }.let(b64::encodeToString)

    /** 8 characters without look-alikes (no I, O, 0, 1), the format the security rules accept. */
    fun newInviteCode(random: SecureRandom = SecureRandom()): String {
        val alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return (1..8).map { alphabet[random.nextInt(alphabet.length)] }.joinToString("")
    }

    fun normalizeCode(text: String) = text.uppercase().filter { it.isLetterOrDigit() }.take(8)

    fun build(d: Done, secret: String): String {
        val payload = b64.encodeToString(listOf(VERSION, d.pairId, d.cycle, d.uid, d.amount.toString(), d.at.toString()).joinToString("|").encodeToByteArray())
        return "https://$HOST$PATH#$payload.${sign(payload, secret)}"
    }

    /** The data part of a link: its fragment, or the `d` query parameter the fallback page hands over. */
    fun dataOf(fragment: String?, query: String?): String? = fragment?.takeIf { it.isNotBlank() } ?: query?.takeIf { it.isNotBlank() }

    /** Reads a link's data without checking it; [verify] with the pair's secret before trusting it. */
    fun parse(data: String): Pair<Done, String>? = runCatching {
        val payload = data.trim().split('.', limit = 2).takeIf { it.size == 2 }?.first() ?: return null
        val f = unb64.decode(payload).decodeToString().split('|')
        if (f.size != 6 || f[0] != VERSION) return null
        Done(f[1], f[2], f[3], f[4].toInt(), f[5].toLong()) to data.trim()
    }.getOrNull()

    fun verify(data: String, secret: String): Boolean {
        val (payload, sig) = data.trim().split('.', limit = 2).takeIf { it.size == 2 } ?: return false
        return java.security.MessageDigest.isEqual(sign(payload, secret).encodeToByteArray(), sig.encodeToByteArray())
    }

    private fun sign(payload: String, secret: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.encodeToByteArray(), "HmacSHA256"))
        return b64.encodeToString(mac.doFinal(payload.encodeToByteArray()).copyOf(16))
    }
}
