package com.sololevelingrn

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WidgetStoragePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(WidgetStorageModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
