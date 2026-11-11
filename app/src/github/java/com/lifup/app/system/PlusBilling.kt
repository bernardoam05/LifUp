package com.lifup.app.system

import android.app.Activity
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** The GitHub build sells nothing: LifUp+ is only bought through Google Play. */
object PlusBilling {
    const val available = false
    data class Offer(val id: String, val price: String)
    val offers: StateFlow<List<Offer>> = MutableStateFlow(emptyList())
    /** A thank-you after a tip, shown once. */
    val thanks = MutableStateFlow(false)
    fun start(context: Context) = Unit
    fun buy(activity: Activity, productId: String) = Unit
    fun restore() = Unit
}
