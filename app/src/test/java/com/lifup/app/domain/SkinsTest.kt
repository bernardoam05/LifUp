package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.random.Random

class SkinsTest {
    private val zone = ZoneId.of("Europe/Lisbon")
    private val content = Content.load { File("src/main/assets/content/$it").readText() }
    private fun run(state: GameState, time: String, action: Tx.() -> Unit = {}) =
        Engine.run(state, Ctx(content, LocalDateTime.parse(time).atZone(zone).toInstant().toEpochMilli(), zone, Random(1)), action = action)

    @Test fun `every accessory belongs to a real seasonal boss`() {
        CoreSkin.entries.forEach { assertTrue(it.name, content.bossById[it.bossId]?.season != null) }
    }

    @Test fun `beating a seasonal boss gives its accessory once`() {
        var s = run(GameState(onboarded = true), "2026-10-26T09:00")
        val boss = s.boss!!
        s = s.copy(boss = boss.copy(bossId = "season_halloween", hp = 1))
        s = run(s, "2026-10-26T10:00") { damageBoss(5) }
        assertTrue(CoreSkin.PUMPKIN in s.coreSkins)
        assertEquals(1, s.rewards.filterIsInstance<Reward.Toast>().count { it.kind == ToastKind.CORE_SKIN })
    }

    @Test fun `bosses beaten before accessories existed give theirs on update`() {
        val old = GameState(onboarded = true, version = 8, bossHistory = listOf("boss_iron", "season_yule", "season_summer"))
        val s = run(old, "2026-11-11T09:00")
        assertEquals(setOf(CoreSkin.SCARF, CoreSkin.SUNGLASSES), s.coreSkins)
        assertTrue(s.rewards.none { it is Reward.Toast && it.kind == ToastKind.CORE_SKIN })
    }

    @Test fun `only owned accessories can be worn`() {
        var s = run(GameState(onboarded = true), "2026-11-11T09:00") { wearSkin(CoreSkin.PUMPKIN) }
        assertNull(s.settings.coreSkin)
        s = run(s, "2026-11-11T09:01") { gainSkin(CoreSkin.PUMPKIN); wearSkin(CoreSkin.PUMPKIN) }
        assertEquals(CoreSkin.PUMPKIN, s.settings.coreSkin)
        s = run(s, "2026-11-11T09:02") { wearSkin(null) }
        assertFalse(s.settings.coreSkin != null)
    }
}
