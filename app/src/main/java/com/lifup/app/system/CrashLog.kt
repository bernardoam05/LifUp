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
}
