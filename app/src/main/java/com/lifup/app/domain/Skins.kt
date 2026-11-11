package com.lifup.app.domain

import kotlinx.serialization.Serializable

/**
 * Accessories the Core can wear, one per seasonal event: beating that season's boss gives it for good. They're
 * looks only: no stats, never sold. The UI draws them over any form and face.
 */
@Serializable
enum class CoreSkin(val bossId: String) {
    PUMPKIN("season_halloween"),
    SCARF("season_yule"),
    PARTY_HAT("season_newyear"),
    FLOWER_CROWN("season_spring"),
    SUNGLASSES("season_summer");

    companion object {
        fun forBoss(bossId: String) = entries.firstOrNull { it.bossId == bossId }
    }
}

/** The seasonal boss behind [skin] was beaten: the Core gets its accessory (once). */
fun Tx.gainSkin(skin: CoreSkin) {
    if (skin in s.coreSkins) return
    s = s.copy(coreSkins = s.coreSkins + skin)
    toast(ToastKind.CORE_SKIN, skin.name)
}

/** Puts on an accessory the player owns, or takes it off with null. */
fun Tx.wearSkin(skin: CoreSkin?) {
    if (skin != null && skin !in s.coreSkins) return
    updateSettings { it.copy(coreSkin = skin) }
}
