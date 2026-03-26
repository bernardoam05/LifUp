import type { Player, Quest, RankLetter, PunishmentIntensity, ShadowEntry, JobClass } from './types'
import { SHADOW_MAP } from '../data/shadows'
import type { Shadow, ShadowRank } from '../data/shadows'

// ── XP & Leveling ─────────────────────────────────────────────────────────────

/** Computes total XP required to *reach* the given level */
export function xpForLevel(level: number): number {
  if (level < 1) return 0
  const base = 80
  const multiplier = 1.12
  return Math.floor(base * Math.pow(multiplier, level - 1))
}

export function rankFromXP(xp: number): 'E' | 'D' | 'C' | 'B' | 'A' | 'S' {
  if (xp >= 1000) return 'S'
  if (xp >= 600) return 'A'
  if (xp >= 300) return 'B'
  if (xp >= 150) return 'C'
  if (xp >= 50) return 'D'
  return 'E'
}

export function getQuestTier(level: number): string {
  if (level >= 90) return 'National'
  if (level >= 70) return 'S'
  if (level >= 50) return 'A'
  if (level >= 30) return 'B'
  if (level >= 15) return 'C'
  if (level >= 5) return 'D'
  return 'E'
}

export const TIER_MULT: Record<string, number> = {
  E: 1.0, D: 1.2, C: 1.5, B: 2.0, A: 2.5, S: 3.5, National: 5.0,
}

export function applyXP(xp: number, level: number, amount: number) {
  let newXp = xp + amount
  let newLevel = level
  let leveledUp = false
  let levelGain = 0

  while (newXp >= xpForLevel(newLevel)) {
    newXp -= xpForLevel(newLevel)
    newLevel++
    leveledUp = true
    levelGain++
  }

  return { xp: newXp, level: newLevel, leveledUp, levelGain }
}

// ── Attributes ────────────────────────────────────────────────────────────────

export function attrLevelFromXP(xp: number): number {
  return 10 + Math.floor(Math.sqrt(Math.max(0, xp) / 5))
}

export const ATTR_XP_PER_QUEST: Record<Quest['type'] | 'boss' | 'side', { strXp: number; agiXp: number; intXp: number; vitXp: number }> = {
  training: { strXp: 12, agiXp: 0, intXp: 0, vitXp: 6 },
  gps: { strXp: 0, agiXp: 12, intXp: 0, vitXp: 6 },
  knowledge: { strXp: 0, agiXp: 0, intXp: 12, vitXp: 0 },
  focus: { strXp: 0, agiXp: 0, intXp: 12, vitXp: 0 },
  forbidden: { strXp: 3, agiXp: 3, intXp: 3, vitXp: 3 },
  limit: { strXp: 3, agiXp: 3, intXp: 3, vitXp: 3 },
  boss: { strXp: 6, agiXp: 6, intXp: 6, vitXp: 6 },
  side: { strXp: 3, agiXp: 3, intXp: 3, vitXp: 3 },
}

export function getAttrXpBoost(
  player: Pick<Player, 'strXp' | 'agiXp' | 'intXp' | 'vitXp'>,
  questType: Quest['type'] | 'boss' | 'side',
): Pick<Player, 'strXp' | 'agiXp' | 'intXp' | 'vitXp' | 'str' | 'agi' | 'int' | 'vit'> {
  const gain = ATTR_XP_PER_QUEST[questType] ?? ATTR_XP_PER_QUEST['side']
  const strXp = (player.strXp ?? 0) + gain.strXp
  const agiXp = (player.agiXp ?? 0) + gain.agiXp
  const intXp = (player.intXp ?? 0) + gain.intXp
  const vitXp = (player.vitXp ?? 0) + gain.vitXp
  return {
    strXp, agiXp, intXp, vitXp,
    str: attrLevelFromXP(strXp),
    agi: attrLevelFromXP(agiXp),
    int: attrLevelFromXP(intXp),
    vit: attrLevelFromXP(vitXp),
  }
}

// ── Ranks ─────────────────────────────────────────────────────────────────────

export const CLASS_REQUIREMENTS = [
  { rank: 'E', level: 1, minCompleted: 0, label: 'Novato', color: '#94a3b8', bgColor: '#0f172a', minRankMissions: 0, minLevel: 1, minMissions: 0, minBosses: 0, prevRank: null },
  { rank: 'D', level: 5, minCompleted: 10, label: 'Caçador Básico', color: '#10b981', bgColor: '#022c22', minRankMissions: 0, minLevel: 5, minMissions: 10, minBosses: 0, prevRank: 'E' },
  { rank: 'C', level: 15, minCompleted: 50, label: 'Mestre da Vontade', color: '#3b82f6', bgColor: '#172554', minRankMissions: 10, minLevel: 15, minMissions: 50, minBosses: 2, prevRank: 'D' },
  { rank: 'B', level: 30, minCompleted: 150, label: 'Cavaleiro das Sombras', color: '#8b5cf6', bgColor: '#2e1065', minRankMissions: 20, minLevel: 30, minMissions: 150, minBosses: 5, prevRank: 'C' },
  { rank: 'A', level: 50, minCompleted: 300, label: 'Comandante', color: '#ec4899', bgColor: '#500724', minRankMissions: 15, minLevel: 50, minMissions: 300, minBosses: 10, prevRank: 'B' },
  { rank: 'S', level: 70, minCompleted: 500, label: 'Monarca', color: '#fbbf24', bgColor: '#451a03', minRankMissions: 10, minLevel: 70, minMissions: 500, minBosses: 20, prevRank: 'A' },
  { rank: 'National', level: 90, minCompleted: 1000, label: 'Caçador Nível Nacional', color: '#ef4444', bgColor: '#450a0a', minRankMissions: 0, minLevel: 90, minMissions: 1000, minBosses: 50, prevRank: 'S' },
] as const

export function getNewLevelKeys(currentKeys: string[], level: number): string[] {
  const newKeys = [...(currentKeys || [])]
  if (level >= 5 && !newKeys.includes('key_kasaka')) newKeys.push('key_kasaka')
  if (level >= 10 && !newKeys.includes('key_baruka')) newKeys.push('key_baruka')
  if (level >= 15 && !newKeys.includes('key_kargalgan')) newKeys.push('key_kargalgan')
  if (level >= 20 && !newKeys.includes('key_vulcan')) newKeys.push('key_vulcan')
  if (level >= 30 && !newKeys.includes('key_metus')) newKeys.push('key_metus')
  if (level >= 40 && !newKeys.includes('key_beru')) newKeys.push('key_beru')
  if (level >= 50 && !newKeys.includes('key_kamish')) newKeys.push('key_kamish')
  if (level >= 70 && !newKeys.includes('key_statue_god')) newKeys.push('key_statue_god')
  if (level >= 100 && !newKeys.includes('key_ashborn')) newKeys.push('key_ashborn')
  return Array.from(new Set(newKeys))
}

export function getRank(
  level: number,
  totalCompleted: number = 0,
  bossesDefeated: number = 0,
  questsByRank: Record<string, number> = {}
): { rank: RankLetter; label: string; color: string; bgColor: string; progress: number } {
  const reqs = [...CLASS_REQUIREMENTS].reverse()

  for (const req of reqs) {
    let qualifies = false

    if (req.rank === 'E') {
      qualifies = true
    } else if (req.rank === 'D') {
      qualifies = level >= req.level && totalCompleted >= req.minCompleted
    } else if (req.rank === 'C') {
      qualifies = level >= req.level && totalCompleted >= req.minCompleted &&
        ((questsByRank['C'] || 0) + (questsByRank['B'] || 0) + (questsByRank['A'] || 0) + (questsByRank['S'] || 0)) >= 10
    } else if (req.rank === 'B') {
      qualifies = level >= req.level && totalCompleted >= req.minCompleted &&
        ((questsByRank['B'] || 0) + (questsByRank['A'] || 0) + (questsByRank['S'] || 0)) >= 20
    } else if (req.rank === 'A') {
      qualifies = level >= req.level && totalCompleted >= req.minCompleted &&
        ((questsByRank['A'] || 0) + (questsByRank['S'] || 0)) >= 15 && bossesDefeated >= 5
    } else if (req.rank === 'S') {
      qualifies = level >= req.level && totalCompleted >= req.minCompleted &&
        (questsByRank['S'] || 0) >= 10 && bossesDefeated >= 15
    } else if (req.rank === 'National') {
      qualifies = level >= req.level && totalCompleted >= req.minCompleted && bossesDefeated >= 30
    }

    if (qualifies) {
      const idx = CLASS_REQUIREMENTS.findIndex(r => r.rank === req.rank)
      const isMax = idx === CLASS_REQUIREMENTS.length - 1
      if (isMax) return { rank: req.rank, label: req.label, color: req.color, bgColor: req.bgColor, progress: 1 }

      const nextReq = CLASS_REQUIREMENTS[idx + 1]
      const levelProg = Math.min((level - req.level) / (nextReq.level - req.level), 1)
      const questProg = Math.min((totalCompleted - req.minCompleted) / (nextReq.minCompleted - req.minCompleted), 1)

      let reqProg = 1
      if (nextReq.rank === 'C') {
        reqProg = Math.min(((questsByRank['C'] || 0) + (questsByRank['B'] || 0) + (questsByRank['A'] || 0) + (questsByRank['S'] || 0)) / 10, 1)
      } else if (nextReq.rank === 'B') {
        reqProg = Math.min(((questsByRank['B'] || 0) + (questsByRank['A'] || 0) + (questsByRank['S'] || 0)) / 20, 1)
      } else if (nextReq.rank === 'A') {
        const p1 = Math.min(((questsByRank['A'] || 0) + (questsByRank['S'] || 0)) / 15, 1)
        const p2 = Math.min(bossesDefeated / 5, 1)
        reqProg = (p1 + p2) / 2
      } else if (nextReq.rank === 'S') {
        const p1 = Math.min((questsByRank['S'] || 0) / 10, 1)
        const p2 = Math.min(bossesDefeated / 15, 1)
        reqProg = (p1 + p2) / 2
      } else if (nextReq.rank === 'National') {
        reqProg = Math.min(bossesDefeated / 30, 1)
      }

      const progress = (levelProg * 0.4) + (questProg * 0.4) + (reqProg * 0.2)
      return { rank: req.rank, label: req.label, color: req.color, bgColor: req.bgColor, progress }
    }
  }

  // Fallback
  const eReq = CLASS_REQUIREMENTS[0]
  return { rank: eReq.rank, label: eReq.label, color: eReq.color, bgColor: eReq.bgColor, progress: 0 }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function getMondayDateString(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toDateString()
}

/** Returns `count` unique random indices from `0` to `max - 1` using `seed`.
 *  Uses a seeded Fisher-Yates shuffle to guarantee exactly `count` unique results.
 */
export function seededPick(count: number, max: number, seed: number): number[] {
  if (max === 0 || count <= 0) return []
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  // Build index array and shuffle via Fisher-Yates
  const indices = Array.from({ length: max }, (_, i) => i)
  for (let i = max - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1)) // 0 ≤ j ≤ i
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.slice(0, Math.min(count, max))
}


// ── Shadows ───────────────────────────────────────────────────────────────────

const SHADOW_RELEASE_BASE: Partial<Record<string, number>> = {
  Normal: 50,
  Elite: 150,
  Knight: 400,
  Commander: 1000,
  Marshal: 3000,
}

export function getShadowReleaseGold(shadow: Shadow, level: number): number {
  if (shadow.type === 'Custom') return 0
  const base = SHADOW_RELEASE_BASE[shadow.rank as string] ?? 50
  return Math.round(base * (1 + (level - 1) * 0.5))
}

export function computeActivePassives(
  activeShadowIds: string[],
  shadows: ShadowEntry[],
  customShadows: Shadow[],
  activeBuffs: any[] = []
): {
  xpBoost: number;
  goldBoost: number;
  penaltyReduction: number;
  ariseBoost: number;
  lootBoost: number;
  focusMastery: number;
  shopDiscount: number;
  bossXpBoost: number;
  streakProtect: boolean;
  penaltyImmunity: boolean;
} {
  const customMap: Record<string, Shadow> = {}
  for (const sh of customShadows) customMap[sh.id] = sh
  const lookup = { ...SHADOW_MAP, ...customMap }

  let xpBoost = 0
  let goldBoost = 0
  let penaltyReduction = 0
  let ariseBoost = 0
  let lootBoost = 0
  let focusMastery = 0
  let shopDiscount = 0
  let bossXpBoost = 0
  let allStatsMult = 0
  let streakProtect = false
  let penaltyImmunity = false

  for (const id of activeShadowIds) {
    const entry = shadows.find(e => e.id === id)
    const shadow = lookup[id]
    if (!entry || !shadow) continue
    const val = shadow.passiveEffect.value * (1 + (entry.level - 1) * 0.2)
    
    switch (shadow.passiveEffect.type) {
      case 'xp_boost': xpBoost += val; break
      case 'gold_boost': goldBoost += val; break
      case 'penalty_reduce': penaltyReduction += val; break
      case 'arise_resonance': ariseBoost += val; break
      case 'loot_perception': lootBoost += val; break
      case 'focus_mastery': focusMastery += val; break
      case 'shop_discount': shopDiscount += val; break
      case 'boss_bonus_xp': bossXpBoost += val; break
      case 'all_stats_boost': allStatsMult += val; break
      case 'streak_protect': streakProtect = true; break
      case 'penalty_immunity': penaltyImmunity = true; break
    }
  }

  // Apply global multiplier from all_stats_boost
  if (allStatsMult > 0) {
    const m = (1 + allStatsMult)
    xpBoost *= m
    goldBoost *= m
    penaltyReduction *= m
    ariseBoost *= m
    lootBoost *= m
    focusMastery *= m
    shopDiscount *= m
    bossXpBoost *= m
  }

  // Active Buffs
  for (const buff of activeBuffs) {
    if (buff.stat === 'xp') xpBoost += (buff.multiplier - 1)
    if (buff.stat === 'gold') goldBoost += (buff.multiplier - 1)
  }

  return { 
    xpBoost, goldBoost, penaltyReduction, ariseBoost, 
    lootBoost, focusMastery, shopDiscount, bossXpBoost,
    streakProtect, penaltyImmunity
  }
}

export function pickExtractionRank(level: number): ShadowRank {
  const r = Math.random()
  if (level >= 26) {
    if (r < 0.02) return 'Marshal'
    if (r < 0.15) return 'Commander'
    if (r < 0.45) return 'Knight'
    if (r < 0.82) return 'Elite'
    return 'Normal'
  }
  if (level >= 21) {
    if (r < 0.10) return 'Commander'
    if (r < 0.40) return 'Knight'
    if (r < 0.78) return 'Elite'
    return 'Normal'
  }
  if (level >= 11) {
    if (r < 0.15) return 'Knight'
    if (r < 0.55) return 'Elite'
    return 'Normal'
  }
  if (level >= 6) return Math.random() < 0.30 ? 'Elite' : 'Normal'
  return 'Normal'
}

// ── Punishment ────────────────────────────────────────────────────────────────

export function pickPenaltyQuests(count: number, pool: Quest[]): Quest[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, pool.length)).map((q, i) => ({ ...q, id: `${q.id}_${i}` }))
}

export function computePunishment(
  failedCount: number,
  totalCount: number,
  playerXP: number,
  intensity: PunishmentIntensity,
  penaltyReduction: number, // percentage reduction from shadows
  tier: string,
  pool: Quest[]
): { xpLost: number; goldLost: number; penaltyQuests: Quest[]; hardcorePunished: boolean; streakReset: boolean; penaltyHours: number } {

  // Tier-scaled 60% daily XP values (baseXP=50, target=4)
  const TIER_BASE_XP: Record<string, number> = {
    E: 120, D: 144, C: 180, B: 240, A: 300, S: 420, National: 600
  }
  const baseDayValue = TIER_BASE_XP[tier] || 120

  let multiplier = 1.0
  if (intensity === 'light') multiplier = 0.3  // 18% of day
  if (intensity === 'medium') multiplier = 1.0 // 60% of day
  if (intensity === 'hardcore') multiplier = 2.0 // 120% of day (harsh!)

  const rawXpLost = Math.floor(baseDayValue * multiplier)
  const xpLost = Math.max(0, Math.floor(rawXpLost * (1 - penaltyReduction)))
  const goldLost = xpLost // Balanced gold penalty

  if (intensity === 'light') {
    return {
      xpLost,
      goldLost,
      penaltyQuests: pickPenaltyQuests(1, pool),
      hardcorePunished: false,
      streakReset: failedCount >= totalCount,
      penaltyHours: Math.min(2 + failedCount, 6),
    }
  }

  if (intensity === 'medium') {
    return {
      xpLost,
      goldLost,
      penaltyQuests: pickPenaltyQuests(Math.min(1 + Math.floor(failedCount / 2), 3), pool),
      hardcorePunished: failedCount >= Math.ceil(totalCount * 0.5),
      streakReset: true,
      penaltyHours: Math.min(4 + failedCount * 2, 12),
    }
  }

  // hardcore
  return {
    xpLost,
    goldLost,
    penaltyQuests: pickPenaltyQuests(Math.min(2 + failedCount, 4), pool),
    hardcorePunished: true,
    streakReset: true,
    penaltyHours: Math.min(8 + failedCount * 2, 24),
  }
}

// JobClass type is defined in ./types to serve as the single source of truth.
// It is imported above and re-used throughout this module.

export const JOB_CLASSES: JobClass[] = [
  { name: 'Civilian',          color: '#94a3b8', minLevel: 1  },
  { name: 'Hunter Novice',     color: '#10b981', minLevel: 5  },
  { name: 'Fighter',           color: '#3b82f6', minLevel: 10 },
  { name: 'Assassin',          color: '#06b6d4', minLevel: 15 },
  { name: 'Dual Mage',         color: '#8b5cf6', minLevel: 20 },
  { name: 'Runic Knight',      color: '#a855f7', minLevel: 25 },
  { name: 'Necromancer',       color: '#7c3aed', minLevel: 30 },
  { name: 'Void Stalker',      color: '#6d28d9', minLevel: 35 },
  { name: 'Death Knight',      color: '#4c1d95', minLevel: 40 },
  { name: 'Shadow Commander',  color: '#5b21b6', minLevel: 45 },
  { name: 'Abyssal Reaper',    color: '#7e22ce', minLevel: 50 },
  { name: 'Arch Lich',         color: '#9333ea', minLevel: 60 },
  { name: "Monarch's Herald",  color: '#c026d3', minLevel: 70 },
  { name: 'Dragon Emperor',    color: '#dc2626', minLevel: 80 },
  { name: 'Monarch of Ruins',  color: '#b91c1c', minLevel: 90 },
  { name: 'Shadow Monarch',    color: '#fbbf24', minLevel: 100 },
]

export function getJobClass(level: number): JobClass {
  const matched = [...JOB_CLASSES].reverse().find(c => level >= c.minLevel)
  return matched ?? JOB_CLASSES[0]
}

export function hadJobClassChange(prevLevel: number, newLevel: number): JobClass | null {
  const prev = getJobClass(prevLevel)
  const next = getJobClass(newLevel)
  return prev.name !== next.name ? next : null
}
