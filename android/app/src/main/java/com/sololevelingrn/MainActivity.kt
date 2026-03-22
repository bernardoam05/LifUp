package com.sololevelingrn

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "SoloLevelingRN"

  override fun onCreate(savedInstanceState: Bundle?) {
    // ── Splash Screen dismissal ─────────────────────────────────────────────
    // AndroidManifest assigns SplashTheme to this Activity so the native
    // window background (black + neon circle) appears instantly on cold start.
    // We switch to AppTheme here — before the React Native layout inflates —
    // so the splash disappears cleanly when the first RN frame is drawn.
    // setTheme MUST be called before super.onCreate() for the theme swap to
    // take effect on the window background.
    setTheme(R.style.AppTheme)
    // ───────────────────────────────────────────────────────────────────────

    // Required by react-native-screens: pass null to discard saved state and
    // prevent crashes on Activity restart (screen rotation, back-stack, etc.)
    super.onCreate(null)
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
