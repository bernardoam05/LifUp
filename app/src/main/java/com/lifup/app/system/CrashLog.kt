package com.lifup.app.system

import android.content.Context
import android.content.Intent
import android.os.Build
import com.lifup.app.BuildConfig
import java.io.File
import java.time.Instant

/**
 * Keeps the last crash on the device (no servers involved). On the next launch the user can share the
 * report through any app (email, WhatsApp…) or dismiss it.
 */
object CrashLog {
    private const val FILE = "crash.txt"
    private const val MAX_CHARS = 12_000

    fun install(context: Context) {
        val file = File(context.filesDir, FILE)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            runCatching { file.writeText(report(thread, error).take(MAX_CHARS)) }
            previous?.uncaughtException(thread, error)
        }
    }

    fun read(context: Context): String? = File(context.filesDir, FILE).takeIf { it.exists() }?.readText()

    fun clear(context: Context) {
        File(context.filesDir, FILE).delete()
    }

    fun share(context: Context, report: String) {
        val send = Intent(Intent.ACTION_SEND).setType("text/plain")
            .putExtra(Intent.EXTRA_SUBJECT, "LifUp crash ${BuildConfig.VERSION_NAME}")
            .putExtra(Intent.EXTRA_TEXT, report)
        context.startActivity(Intent.createChooser(send, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun report(thread: Thread, error: Throwable) = buildString {
        appendLine("LifUp ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
        appendLine("Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT}) · ${Build.MANUFACTURER} ${Build.MODEL}")
        appendLine("When: ${Instant.now()} · thread ${thread.name}")
        appendLine()
        append(error.stackTraceToString())
    }

    const val SUPPORT_EMAIL = "corequest.app@gmail.com"

    /**
     * Opens the mail app on a message to [SUPPORT_EMAIL] with the app version, the phone and Android version, and
     * the last crash report if there is one; the player writes what happened and decides whether to send it.
     */
    fun reportProblem(context: Context, intro: String) {
        val body = buildString {
            appendLine(intro); appendLine(); appendLine(); appendLine("—")
            appendLine("CoreQuest ${com.lifup.app.BuildConfig.VERSION_NAME} (${com.lifup.app.BuildConfig.FLAVOR})")
            appendLine("${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}, Android ${android.os.Build.VERSION.RELEASE}")
            read(context)?.let { appendLine(); appendLine(it.take(6_000)) }
        }
        val intent = android.content.Intent(android.content.Intent.ACTION_SENDTO, android.net.Uri.parse("mailto:"))
            .putExtra(android.content.Intent.EXTRA_EMAIL, arrayOf(SUPPORT_EMAIL))
            .putExtra(android.content.Intent.EXTRA_SUBJECT, "CoreQuest ${com.lifup.app.BuildConfig.VERSION_NAME}")
            .putExtra(android.content.Intent.EXTRA_TEXT, body)
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }.onFailure {
            // No mail app: hand the same text to whatever can take it.
            share(context, "$SUPPORT_EMAIL\n\n$body")
        }
    }
}
