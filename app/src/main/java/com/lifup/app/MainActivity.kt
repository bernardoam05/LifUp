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
import kotlinx.coroutines.launch
import com.lifup.app.ui.AppRoot
import com.lifup.app.ui.Feedback

class MainActivity : ComponentActivity() {
    /** Tab requested by a deep link (lifup://today, focus, hero, shop). */
    private val deepLink = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(0), navigationBarStyle = SystemBarStyle.dark(0))
        deepLink.value = intent?.data?.host
        Feedback.warmUp(this)
        setContent { AppRoot(deepLink.value) { deepLink.value = null } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        deepLink.value = intent.data?.host
    }

    override fun onStart() {
        super.onStart()
        AppVisibility.foreground = true
        val app = applicationContext
        LifUpApp.store.scope.launch {
            AutoTracker.dispatchCatchingUp(app) { rollPortal() }
            AutoTracker.sync(app)
        }
    }

    override fun onStop() {
        AppVisibility.foreground = false
        super.onStop()
    }
}
