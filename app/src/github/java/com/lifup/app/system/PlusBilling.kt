package com.lifup.app.system

import android.app.Activity
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import com.lifup.app.domain.setPlus

/**
 * The GitHub build sells nothing: there CoreQuest+ comes included (it's where things get tested). A backup taken
 * here and restored on the Play build doesn't carry it over: Play's own check turns it off unless it was bought.
 */
object PlusBilling {
    const val available = false
    data class Offer(val id: String, val price: String)
    val offers: StateFlow<List<Offer>> = MutableStateFlow(emptyList())
    /** A thank-you after a tip, shown once. */
    val thanks = MutableStateFlow(false)
    fun start(context: Context) {
        com.lifup.app.LifUpApp.store.fire { setPlus(true) }
    }
    fun buy(activity: Activity, productId: String) = Unit
    fun restore() = Unit
}
