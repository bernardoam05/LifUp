// ── Shadow Types ──────────────────────────────────────────────────────────────

export type ShadowRank = 'Normal' | 'Elite' | 'Knight' | 'Commander' | 'Marshal'

export type ShadowType =
  | 'Beast'
  | 'Magic'
  | 'Assassin'
  | 'Tank'
  | 'Warrior'
  | 'Insect'
  | 'Undead'
  | 'Demon'
  | 'Elemental'
  | 'Ancient'
  | 'Custom'
  | 'Thief'
  | 'Mage'
  | 'Artisan'
  | 'Explorer'
  | 'Ghost'
  | 'Support'
  | 'General'

export type PassiveEffectType =
  | 'gold_boost'        // % bonus to all gold earned
  | 'xp_boost'          // % bonus to all XP earned
  | 'penalty_immunity'  // weekly immunity to one penalty
  | 'penalty_reduce'    // reduces penalty XP loss by %
  | 'streak_protect'    // prevents streak reset once per week
  | 'shop_discount'     // % discount on shop purchases
  | 'focus_mastery'     // % reduction in focus time needed
  | 'boss_bonus_xp'     // % extra XP from boss raids
  | 'arise_resonance'   // % bonus to shadow extraction success (cap 5% total)
  | 'loot_perception'   // % bonus to loot box drop rates
  | 'daily_bonus'       // small XP granted each day on login
  | 'all_stats_boost'   // % bonus to all other shadow effects

export type PassiveEffect = {
  type:        PassiveEffectType
  value:       number    // the magnitude (0.05 = 5%, 1 = 1 minute, etc.)
  description: string    // human-readable effect
}

export type UnlockMethod =
  | { type: 'gacha' }
  | { type: 'shop';        price: number }
  | { type: 'achievement'; id: string }
  | { type: 'boss_drop';   bossId: string; category: 'dungeon' | 'dungeon_break' | 'event' | 'key' | 'raid' }
  | { type: 'custom' }

export type Shadow = {
  id:             string
  name:           string
  rank:           ShadowRank
  type:           ShadowType
  dropRate:       number          // weight in gacha pool (ignored for non-gacha)
  /**
   * Probability of dropping when the boss is defeated (0.0–1.0).
   * undefined / 1.0 = 100% guaranteed (raids, events).
   * Only used for dungeon and key boss drops to add tension and replayability.
   */
  dropChance?:    number
  passiveEffect:  PassiveEffect
  lore:           string
  icon:           string          // MaterialCommunityIcons name
  color:          string          // rank color for UI
  unlockMethod?:  UnlockMethod    // undefined = gacha by default
}

// ── Rank color map ─────────────────────────────────────────────────────────────

export const SHADOW_RANK_COLOR: Record<ShadowRank, string> = {
  Normal:     '#94a3b8',
  Elite:      '#22c55e',
  Knight:     '#3b82f6',
  Commander:  '#f59e0b',
  Marshal:    '#ef4444',
};
