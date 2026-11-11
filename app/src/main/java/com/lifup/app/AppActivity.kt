package com.lifup.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import com.lifup.app.domain.rollPortal
import com.lifup.app.system.AppVisibility
import com.lifup.app.system.AutoTracker
import com.lifup.app.system.Updater
import com.lifup.app.system.PairService
import com.lifup.app.domain.PairLink
import kotlinx.coroutines.launch
import com.lifup.app.ui.AppRoot
import com.lifup.app.ui.Feedback

class AppActivity : ComponentActivity() {
    /** Deep link target: a tab (lifup://today), or a tab plus an id (lifup://quest/<id>, lifup://focus/<id>). */
    private val deepLink = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(0), navigationBarStyle = SystemBarStyle.dark(0))
        deepLink.value = route(intent)
        Feedback.warmUp(this)
        setContent { AppRoot(deepLink.value) { deepLink.value = null } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        deepLink.value = route(intent)
    }

    /** Where a link leads; a pair partner's "I'm done" link is handed to the pair sync and lands on Today. */
    private fun route(intent: Intent?): String? {
        val uri = intent?.data ?: return null
        if (uri.scheme == "https" && uri.host == PairLink.HOST) {
            PairLink.dataOf(uri.encodedFragment, uri.getQueryParameter("d"))?.let { data ->
                val join = PairLink.joinCodeOf(data)
                if (join != null) PairService.pendingJoin.value = join
                else {
                    val app = applicationContext
                    LifUpApp.store.scope.launch { PairService.openLink(app, data) }
                }
            }
            return "today"
        }
        return (uri.host ?: "") + (uri.path ?: "")
    }

    override fun onStart() {
        super.onStart()
        AppVisibility.foreground = true
        val app = applicationContext
        LifUpApp.store.scope.launch {
            AutoTracker.dispatchCatchingUp(app) { rollPortal() }
            AutoTracker.sync(app)
        }
        LifUpApp.store.scope.launch { Updater.check(app) }
        if (LifUpApp.store.current.pairs.isNotEmpty()) LifUpApp.store.scope.launch { PairService.sync(app, foreground = true) }
    }

    override fun onStop() {
        AppVisibility.foreground = false
        // Leaving the app: the moment the launcher icon can follow the Core's form without anyone watching.
        com.lifup.app.system.IconSwitcher.apply(applicationContext, LifUpApp.store.current)
        super.onStop()
    }
}
