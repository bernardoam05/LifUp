package com.lifup.app.system

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.lifup.app.LifUpApp
import com.lifup.app.domain.PlusProducts
import com.lifup.app.domain.setPlus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * CoreQuest+ and tips through Google Play Billing. CoreQuest+ is a one-time product, acknowledged once bought; tips are
 * consumed so they can be given again. What Play reports as owned is the truth: the game state only mirrors it,
 * and a failed query never takes CoreQuest+ away.
 */
object PlusBilling {
    private const val TAG = "PlusBilling"
    const val available = true

    data class Offer(val id: String, val price: String)

    private val _offers = MutableStateFlow<List<Offer>>(emptyList())
    val offers: StateFlow<List<Offer>> = _offers
    /** A thank-you after a tip, shown once. */
    val thanks = MutableStateFlow(false)

    private var client: BillingClient? = null
    private val details = mutableMapOf<String, ProductDetails>()

    fun start(context: Context) {
        if (client != null) return
        val c = BillingClient.newBuilder(context.applicationContext)
            .setListener { result, purchases -> if (result.responseCode == BillingClient.BillingResponseCode.OK) purchases?.forEach(::handle) }
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build()
        client = c
        c.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode != BillingClient.BillingResponseCode.OK) return
                loadOffers()
                restore()
            }
            override fun onBillingServiceDisconnected() {
                client = null // started again on the next launch or purchase screen
            }
        })
    }

    private fun loadOffers() {
        val c = client ?: return
        val products = (listOf(PlusProducts.PLUS) + PlusProducts.TIPS).map {
            QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.INAPP).build()
        }
        c.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build()) { result, found ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@queryProductDetailsAsync
            found.productDetailsList.forEach { details[it.productId] = it }
            _offers.value = found.productDetailsList.mapNotNull { d -> d.oneTimePurchaseOfferDetails?.let { Offer(d.productId, it.formattedPrice) } }
        }
    }

    /** What Play says is owned: CoreQuest+ on or off (only when the answer came back fine). */
    fun restore() {
        val c = client ?: return
        c.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@queryPurchasesAsync
            purchases.forEach(::handle)
            val owned = purchases.any { PlusProducts.PLUS in it.products && it.purchaseState == Purchase.PurchaseState.PURCHASED }
            LifUpApp.store.fire { setPlus(owned) }
        }
    }

    fun buy(activity: Activity, productId: String) {
        val c = client ?: return start(activity)
        val d = details[productId] ?: return loadOffers()
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()))
            .build()
        c.launchBillingFlow(activity, params)
    }

    private fun handle(p: Purchase) {
        if (p.purchaseState != Purchase.PurchaseState.PURCHASED) return
        val c = client ?: return
        if (PlusProducts.PLUS in p.products) {
            LifUpApp.store.fire { setPlus(true) }
            if (!p.isAcknowledged) c.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { r ->
                if (r.responseCode != BillingClient.BillingResponseCode.OK) Log.w(TAG, "acknowledge failed: ${r.debugMessage}")
            }
        } else if (p.products.any { it in PlusProducts.TIPS }) {
            c.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { r, _ ->
                if (r.responseCode == BillingClient.BillingResponseCode.OK) thanks.value = true
            }
        }
    }
}
