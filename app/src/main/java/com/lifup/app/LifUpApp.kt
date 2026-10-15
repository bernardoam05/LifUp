package com.lifup.app

import android.app.Application
import com.lifup.app.data.GameStore
import com.lifup.app.data.LegacyImport
import com.lifup.app.domain.Content
import com.lifup.app.system.Notifications
import com.lifup.app.system.PortalWorker
import com.lifup.app.system.SystemSync
import java.io.File

class LifUpApp : Application() {
    lateinit var store: GameStore
        private set

    override fun onCreate() {
        super.onCreate()
        val content = Content.load { name -> assets.open("content/$name").bufferedReader().use { it.readText() } }
        val file = File(filesDir, "state.json")
        // First launch over the old React Native app: carry its progress over automatically.
        val migrated = if (!file.exists()) {
            LegacyImport.readAsyncStorage(this)?.let { LegacyImport.decodeBackup(it) }?.let { LegacyImport.toState(it, content) }
        } else null
        store = GameStore(content, file, migrated)
        Notifications.createChannels(this)
        SystemSync.install(this, store)
        PortalWorker.schedule(this)
        store.fire()
    }

    companion object {
        lateinit var instance: LifUpApp
            private set
        val store get() = instance.store
    }

    init {
        instance = this
    }
}
