package com.lifup.app.data

import com.lifup.app.domain.Content
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Player
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.Rigor
import com.lifup.app.domain.StatKey
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ImportTest {
    private val content = Content.load { File("src/main/assets/content/$it").readText() }

    // Shape of the old zustand store persisted by the React Native app ("lifup-v3").
    private val legacy = """
    {"state":{
      "player":{"name":"Bernardo","level":12,"xp":340,"gold":900,"strXp":500,"agiXp":80,"intXp":300,"vitXp":120,
        "currentStreak":4,"highestStreak":9,
        "inventory":[{"itemId":"shadow_essence","quantity":2},{"itemId":"void_crystal","quantity":3},{"itemId":"lagrima_purificacao","quantity":1}],
        "shadows":[{"id":"auto_pawn","level":3,"copies":1},{"id":"tank","level":2},"bone_collector"],
        "activeShadowIds":["auto_pawn","tank"]},
      "settings":{"missionDifficulty":"custom","customDailyMissions":6,"autoBlockApps":true,"pomodoroWorkMins":50,"lastFocusDuration":{"hours":1,"minutes":15}},
      "system":{"blockedApps":["com.instagram.android"],"bossesDefeated":7},
      "statistics":{"totalCompleted":210,"perfectDays":30,"totalFocusMinutes":1200,"maxStreakReached":11},
      "questDictionary":[
        {"id":"core_pushups","type":"core","questType":"training","title":"x","description":"y","baseTarget":15,"baseXP":50,"baseGold":10},
        {"id":"my_piano","type":"pool","questType":"pomodoro","title":"Piano","description":"{target} min","baseTarget":2,"baseXP":80,"baseGold":20,"daysOfWeek":[0,6]}
      ],
      "sideQuests":[{"id":"s1","title":"Comprar pão","done":false},{"id":"s2","title":"Feita","done":true}]
    },"version":0}
    """.trimIndent()

    @Test fun `old app progress maps onto the new state`() {
        val obj = LegacyImport.decodeBackup(legacy)
        assertNotNull(obj)
        val s = LegacyImport.toState(obj!!, content)
        assertEquals("Bernardo", s.player.name)
        assertEquals(12, s.player.level)
        assertEquals(340, s.player.xp)
        assertEquals(11, s.player.bestStreak)
        // "tank" no longer exists: refunded as gold, dropped from the squad.
        assertEquals(900 + 200, s.player.gold)
        assertEquals(listOf("auto_pawn", "bone_collector"), s.shadows.map { it.id })
        assertEquals(listOf("auto_pawn"), s.squad)
        assertEquals(mapOf("essencia_sombria" to 2, "lagrima_purificacao" to 1), s.inventory)
        assertEquals(Rigor.NORMAL, s.settings.rigor)
        assertEquals(6, s.settings.dailyPoolOverride)
        assertTrue(s.settings.blockOnPenalty)
        assertEquals(75, s.settings.focusMinutes)
        assertEquals(listOf("com.instagram.android"), s.settings.blockedApps)
        assertEquals(210L, s.count(StatKey.QUESTS_COMPLETED))
        assertEquals(7L, s.count(StatKey.BOSSES_DEFEATED))
        val piano = s.customDefs.single()
        assertEquals(DefKind.POOL, piano.kind)
        assertEquals(QuestType.FOCUS, piano.type)
        assertEquals(50.0, piano.baseTarget, 0.0)
        assertEquals(listOf(7, 6), piano.daysOfWeek)
        assertEquals(listOf("Comprar pão"), s.sideQuests.map { it.title })
    }

    @Test fun `new backups round trip`() {
        val state = GameState(onboarded = true, player = Player(name = "A", level = 7, gold = 42))
        val back = Backup.import(Backup.export(state), content)
        assertEquals(state, back)
    }
}
