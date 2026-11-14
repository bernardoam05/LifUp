package com.lifup.app.system

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.util.Log
import com.lifup.app.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Keeps the app on the latest GitHub release: on each launch (at most every few hours once up to date) it reads
 * the latest release, and when its tag is newer than this build it downloads the APK and hands it to the system
 * installer. The first update asks the user to allow installs from LifUp; from Android 12 on, later ones go
 * through without a prompt.
 */
object Updater {
    private const val TAG = "Updater"
    private const val RELEASES = "https://api.github.com/repos/bernardoam05/LifUp/releases"
    private const val NOTES = "https://raw.githubusercontent.com/bernardoam05/LifUp"
    private const val PREFS = "updater"
    private const val CHECK_EVERY_MS = 6 * 60 * 60 * 1000L

    sealed interface State {
        data object Idle : State
        data object Checking : State
        data object UpToDate : State
        /** A newer release exists: nothing is downloaded until the player agrees. */
        data class Available(val version: String, val apkUrl: String) : State
        data class Downloading(val version: String) : State
        data class Installing(val version: String) : State
        data class Failed(val step: FailureStep, val detail: String) : State
    }

    enum class FailureStep { CHECK, DOWNLOAD, INSTALL }

    private val _state = MutableStateFlow<State>(State.Idle)
    val state: StateFlow<State> = _state
    private val busy = Mutex()
    /** Update transfers must outlive the prompt that starts them. */
    private val updateScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Checks for a newer release and says so ([State.Available]); [install] downloads it once the player agrees. Without [force], debug builds skip it and a recent "up to date" is trusted. */
    suspend fun check(context: Context, force: Boolean = false) {
        if (!BuildConfig.SELF_UPDATE) return // the store updates it
        if (!force && BuildConfig.DEBUG) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!force && System.currentTimeMillis() - prefs.getLong("upToDateAt", 0) < CHECK_EVERY_MS) return
        if (_state.value is State.Available || _state.value is State.Downloading || _state.value is State.Installing) return
        if (!force && prefs.getString("later", null)?.let { later -> latestSeen == later } == true) return
        if (!busy.tryLock()) return
        try {
            _state.value = State.Checking
            val release = withContext(Dispatchers.IO) { latest() }
            if (release == null || !isNewer(release.version, BuildConfig.VERSION_NAME)) {
                prefs.edit().putLong("upToDateAt", System.currentTimeMillis()).apply()
                _state.value = State.UpToDate
                return
            }
            latestSeen = release.version
            _state.value = if (!force && prefs.getString("later", null) == release.version) State.UpToDate else State.Available(release.version, release.apkUrl)
        } catch (e: Exception) {
            fail(FailureStep.CHECK, e)
        } finally {
            busy.unlock()
        }
    }

    private var latestSeen: String? = null

    /** The player agreed: download the release and hand it to the system installer. */
    fun install(context: Context, available: State.Available) {
        val appContext = context.applicationContext
        updateScope.launch { installInBackground(appContext, available) }
    }

    private suspend fun installInBackground(context: Context, available: State.Available) {
        if (!busy.tryLock()) return
        var step = FailureStep.DOWNLOAD
        try {
            _state.value = State.Downloading(available.version)
            val apk = withContext(Dispatchers.IO) { download(context, available.apkUrl) }
            step = FailureStep.INSTALL
            _state.value = State.Installing(available.version)
            withContext(Dispatchers.IO) { install(context, apk) }
        } catch (e: Exception) {
            fail(step, e)
        } finally {
            busy.unlock()
        }
    }

    /** "Later": the prompt stays away until a release newer than this one comes out (Settings still offers it). */
    fun later(context: Context, available: State.Available) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("later", available.version).apply()
        _state.value = State.UpToDate
    }

    /**
     * The notes to show on the first launch after an update (by the app itself or by hand): every release since the
     * one whose notes were last seen, from the notes bundled in the APK, in [lang] or else English. A build without
     * them falls back to the release's notes on GitHub. Empty on a fresh install, once seen, or offline without notes.
     */
    suspend fun whatsNew(context: Context, lang: String): List<com.lifup.app.domain.VersionNotes> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val version = BuildConfig.VERSION_NAME
        val seen = prefs.getString("notesSeen", null)
        if (seen == version) return emptyList()
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        if (info.firstInstallTime == info.lastUpdateTime) {
            seenWhatsNew(context)
            return emptyList()
        }
        return withContext(Dispatchers.IO) {
            val bundled = ReleaseNotes.since(context, seen, version, lang)
            bundled.ifEmpty {
                val text = listOf(lang, "en").distinct().firstNotNullOfOrNull { fetch("$NOTES/v$version/release-notes/$version/$it.md") }
                    ?: fetch("$RELEASES/tags/v$version", json = true)?.let { Json.parseToJsonElement(it).jsonObject["body"]?.jsonPrimitive?.contentOrNull }
                listOfNotNull(text?.takeIf { it.isNotBlank() }?.let { com.lifup.app.domain.VersionNotes(version, com.lifup.app.domain.PatchNotes.parse(it)) })
            }
        }
    }

    /** The text at [url], or null when it's missing or the phone is offline. */
    private fun fetch(url: String, json: Boolean = false): String? = runCatching {
        open(url).apply { if (json) setRequestProperty("Accept", "application/vnd.github+json") }
            .inputStream.use { it.readBytes().decodeToString() }
    }.getOrNull()

    fun seenWhatsNew(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("notesSeen", BuildConfig.VERSION_NAME).apply()
    }

    private class Release(val version: String, val apkUrl: String)

    /** The latest published release, or null when it has no APK attached. */
    private fun latest(): Release? {
        val body = open("$RELEASES/latest").apply { setRequestProperty("Accept", "application/vnd.github+json") }
            .inputStream.use { it.readBytes().decodeToString() }
        val json = Json.parseToJsonElement(body).jsonObject
        val tag = json["tag_name"]?.jsonPrimitive?.content ?: return null
        val apk = json["assets"]?.jsonArray?.map { it.jsonObject }
            ?.firstOrNull { it["name"]?.jsonPrimitive?.content?.endsWith(".apk") == true }
            ?.get("browser_download_url")?.jsonPrimitive?.content ?: return null
        return Release(tag.removePrefix("v"), apk)
    }

    private fun download(context: Context, url: String): File {
        val file = File(context.cacheDir, "update.apk")
        val partial = File(context.cacheDir, "update.apk.part")
        val connection = open(url).apply {
            setRequestProperty("Accept", "application/vnd.android.package-archive")
        }
        try {
            check(connection.responseCode in HttpURLConnection.HTTP_OK..HttpURLConnection.HTTP_PARTIAL) {
                "Update download returned HTTP ${connection.responseCode}"
            }
            connection.inputStream.use { input -> partial.outputStream().use { input.copyTo(it) } }
            check(partial.length() > 0L) { "Update download was empty" }
            if (file.exists()) check(file.delete()) { "Could not replace previous update APK" }
            check(partial.renameTo(file)) { "Could not save update APK" }
        } finally {
            connection.disconnect()
            partial.delete()
        }
        return file
    }

    private fun open(url: String) = (URL(url).openConnection() as HttpURLConnection).apply {
        instanceFollowRedirects = true
        connectTimeout = 30_000
        readTimeout = 120_000
        setRequestProperty("User-Agent", "CoreQuest/${BuildConfig.VERSION_NAME}")
    }

    private fun install(context: Context, apk: File) {
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = installer.createSession(params)
        installer.openSession(id).use { session ->
            session.openWrite("lifup.apk", 0, apk.length()).use { out ->
                apk.inputStream().use { it.copyTo(out) }
                session.fsync(out)
            }
            val result = PendingIntent.getBroadcast(
                context, id, Intent(context, UpdateReceiver::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            session.commit(result.intentSender)
        }
    }

    /** "2.10.0" is newer than "2.9.3": compares the dotted numbers one by one. */
    fun isNewer(candidate: String, current: String): Boolean {
        val a = candidate.split('.').map { it.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }
        val b = current.split('.').map { it.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(a.size, b.size)) {
            val x = a.getOrElse(i) { 0 }
            val y = b.getOrElse(i) { 0 }
            if (x != y) return x > y
        }
        return false
    }

    internal fun onResult(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        when (status) {
            // First update, or before Android 12: the system asks the user to confirm.
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                if (confirm == null) {
                    fail(FailureStep.INSTALL, "Android did not provide the confirmation screen")
                    return
                }
                context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
            PackageInstaller.STATUS_SUCCESS -> File(context.cacheDir, "update.apk").delete()
            else -> {
                val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                fail(FailureStep.INSTALL, "Android installer $status${message?.let { ": $it" }.orEmpty()}")
            }
        }
    }

    private fun fail(step: FailureStep, error: Throwable) {
        Log.e(TAG, "Update failed during ${step.name.lowercase()}", error)
        fail(step, error.message ?: error.javaClass.simpleName)
    }

    private fun fail(step: FailureStep, detail: String) {
        Log.e(TAG, "Update failed during ${step.name.lowercase()}: $detail")
        _state.value = State.Failed(step, detail.take(240))
    }
}

class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = Updater.onResult(context, intent)
}
