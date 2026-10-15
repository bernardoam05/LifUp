package com.lifup.app.domain

fun GameState.statValue(key: StatKey): Long = when (key) {
    StatKey.LEVEL -> player.level.toLong()
    StatKey.BEST_STREAK -> player.bestStreak.toLong()
    StatKey.SHADOWS_OWNED -> shadows.size.toLong()
    StatKey.MAX_SHADOW_LEVEL -> (shadows.maxOfOrNull { it.level } ?: 0).toLong()
    StatKey.SQUAD_FULL -> if (squad.size >= Rules.SQUAD_SIZE) 1 else 0
    StatKey.GPS_KM -> count(StatKey.GPS_METERS) / 1000
    else -> count(key)
}

/** Unlocks every tier whose target has been reached. Rewards are paid unboosted to avoid feedback loops. */
fun Tx.checkAchievements() {
    for (def in content.achievements) {
        var tier = s.achievements[def.id] ?: 0
        val value = s.statValue(def.stat)
        while (tier < def.tiers.size && value >= def.tiers[tier]) {
            tier++
            val gold = Rules.ACHIEVEMENT_GOLD[(tier - 1).coerceAtMost(Rules.ACHIEVEMENT_GOLD.lastIndex)]
            s = s.copy(achievements = s.achievements + (def.id to tier), player = s.player.copy(gold = s.player.gold + gold))
            val t = tier
            reward { Reward.AchievementUnlocked(it, def.id, t, gold) }
            def.shadowReward?.takeIf { it.tier == t }?.let { gainShadow(it.shadowId, SourceType.ACHIEVEMENT) }
        }
    }
}
