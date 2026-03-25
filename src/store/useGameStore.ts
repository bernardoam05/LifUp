import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Vibration } from 'react-native'

// Native Modules / Storage
import SharedStorage from '../native/SharedStorage'
import { scheduleSystemWarnings, cancelSystemWarnings } from '../utils/notifications'

// Sub-modules (Newly created)
import type { 
  GameState, GameActions, Player, Quest, SideQuest, RankKey, SystemState,
  InventoryEntry, ShadowEntry, LevelUpReward, TriggerPayload, StoreRef 
} from './types'
import { INITIAL_PLAYER, INITIAL_STATS, INITIAL_SETTINGS, INITIAL_SHOP_STOCKS } from './types'

import { 
  xpForLevel, getRank, applyXP, attrLevelFromXP, getAttrXpBoost, 
  getNewLevelKeys, getMondayDateString, seededPick, computeActivePassives, 
  pickExtractionRank, getShadowReleaseGold, computePunishment, pickPenaltyQuests,
  getQuestTier, TIER_MULT, hadJobClassChange
} from './helpers'

import { 
  createDailyQuests, defToQuest, INITIAL_QUEST_DICTIONARY, 
  generateSideQuestReward, getCustomShadowPassive, PENALTY_QUEST_POOL,
  getDailyMissionTarget, BOX_KEYS,
  isWeeklyBossDefinition, isPortalBossDefinition,
} from './questDictionary'

import { 
  fireEvent, checkAndUnlockAchievements, progressAchievements 
} from './achievements'
import { CATALOG_MAP } from '../data/shopItems'

// Data / Types needed locally
import { SHADOW_MAP, rollShadow, getBossDropShadow } from '../data/shadows'
import type { Shadow, ShadowRank } from '../data/shadows'
import { RAID_BOSSES } from '../data/bosses'
import type { RaidBossRank } from '../data/bosses'

// ── Re-exports for project-wide compatibility ──────────────────────────────────
export * from './types'
export * from './helpers'
export * from './questDictionary'
export * from './achievements'

// ── Initial States ─────────────────────────────────────────────────────────────
const INITIAL_SYSTEM: Omit<SystemState, 'weeklyBossIds' | 'normalBossIds' | 'normalBossRotationDate' | 'weeklyResetDate' | 'bossDefeatedThisWeek' | 'weeklyDefeatedBossId' | 'extractionDoneToday' | 'completedNormalBossIds'> = {
  focusModeActive: false,
  hardcoreFocusMode: false,
  hardcorePunished: false,
  xpBoostNext: false,
  hasPenalty: false,
  penaltyReduced: false,
  penaltyTriggered: false,
  penaltyQuests: [],
  blockedApps: [],
  weeklyTrainingCount: 0,
  weeklyRegenCount: 0,
  bossesDefeated: 0,
  shopStocks: { ...INITIAL_SHOP_STOCKS },
  blockedAttemptTimestamps: [],
  penaltyBlockEnd: 0,
  eventBossKey: '',
  eventBossCompletedIds: [],
  eventBossRequired: 0,
  eventBossTotal: 0,
  eventBossDefeated: false,
  tutorialPhase: 0,
  activeRaidBoss: null,
  consecutiveFails: 0,
  penaltyMissionsOwed: 0,
  activeDungeonBreak: null,
}

const INITIAL_RESET_SYSTEM = {
  weeklyBossIds: [],
  normalBossIds: [],
  normalBossRotationDate: '',
  weeklyResetDate: '',
  bossDefeatedThisWeek: false,
  weeklyDefeatedBossId: undefined,
  extractionDoneToday: false,
  completedNormalBossIds: [],
  portalDailyCount: 0,
  portalLastRollHourKey: '',
  portalCooldownEnd: 0,
}

// ── Store ──────────────────────────────────────────────────────────────────────

const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => {
      const ref: StoreRef = { get, set }

      return {
        player: INITIAL_PLAYER,
        quests: createDailyQuests(1, INITIAL_QUEST_DICTIONARY, 'normal'),
        extraQuests: [],
        extraQuestRerolledIds: [],
        extraQuestUsedPoolIds: [],
        sideQuests: [],
        questDictionary: INITIAL_QUEST_DICTIONARY,
        customShadows: [],
        settings: INITIAL_SETTINGS,
        statistics: INITIAL_STATS,
        unlockedAchievements: [],
        achievementProgress: {},
        system: {
          ...INITIAL_SYSTEM,
          ...INITIAL_RESET_SYSTEM,
          completedNormalBossIds: [],
        },
        lastResetDate: '',
        lastExtraction: null,
        questRecords: {},
        questCompletions: {},
        levelUpReward: null,
        jobChangeReward: null,
        activeMissionTimers: {},
        rewardsQueue: [] as { type: 'achievement' | 'shadow' | 'level_up' | 'job_change'; id: string; isLevelUp?: boolean; newLevel?: number; data?: any }[],
        activeBuffs: [],
        newAchievementIds: [],

        applyBuff: (buff: { id: string; label: string; multiplier: number; stat: 'xp' | 'gold'; }, duration: number) => {
          set(s => {
            const existingBuffIdx = s.activeBuffs.findIndex(b => b.id === buff.id)
            if (existingBuffIdx > -1) {
              const existing = s.activeBuffs[existingBuffIdx]
              const newActive = [...s.activeBuffs]
              newActive[existingBuffIdx] = {
                ...existing,
                expiresAt: existing.expiresAt + duration
              }
              return { activeBuffs: newActive }
            } else {
              return { activeBuffs: [...s.activeBuffs, { ...buff, expiresAt: Date.now() + duration }] }
            }
          })
        },

        clearPendingRaidExtraction: () => {
          set((s: GameState) => ({ system: { ...s.system, pendingRaidExtractionId: undefined } }))
        },

        popReward: () => {
          setTimeout(() => {
            set((s: GameState & GameActions) => ({ rewardsQueue: s.rewardsQueue.slice(1) }))
          }, 350)
        },

        triggerEvent(event, payload = {}, value = 1) {
          fireEvent(event, payload, ref, value)
        },

        emitEvent(event, value = 1) {
          fireEvent(event, {}, ref, value)
        },

        recordBlockedAttempt() {
          const now = Date.now()
          set((s: GameState & GameActions) => ({
            system: {
              ...s.system,
              blockedAttemptTimestamps: [
                ...s.system.blockedAttemptTimestamps.filter((t: number) => now - t < 60_000),
                now,
              ],
            },
          }))
          fireEvent('blocked_app_attempt', {}, ref)
          if (get().system.blockedAttemptTimestamps.length >= 5) {
            fireEvent('blocked_app_spam', {}, ref)
          }
        },

        rankUp() {
          set((s: GameState) => {
            const qualifiedRank = getRank(s.player.level, s.statistics.totalCompleted, s.system.bossesDefeated, s.statistics.questsByRank).rank
            return { player: { ...s.player, rank: qualifiedRank } }
          })
        },

        bootSystem() {
          const today = new Date().toDateString()
          const { lastResetDate, quests, player, system } = get()

          if (system.hasPenalty && system.penaltyBlockEnd > 0 && Date.now() >= system.penaltyBlockEnd) {
            set((s: GameState & GameActions) => ({ system: { ...s.system, hasPenalty: false, penaltyBlockEnd: 0 } }))
          }

          {
            const qd = get().questDictionary
            if (qd.some(d => (d as { type?: string }).type === 'normal_boss')) {
              set((s: GameState & GameActions) => ({
                questDictionary: s.questDictionary.map(d =>
                  (d as { type?: string }).type === 'normal_boss' ? { ...d, type: 'boss' as const } : d
                ),
              }))
            }
            const storedIds = new Set(get().questDictionary.map((d) => d.id))
            const missing = INITIAL_QUEST_DICTIONARY.filter(d => !storedIds.has(d.id))
            if (missing.length > 0) {
              set((s: GameState & GameActions) => ({ questDictionary: [...s.questDictionary, ...missing] }))
            }
          }

          if (get().system.weeklyBossIds.length === 0) {
            const bossDefs = get().questDictionary.filter(isWeeklyBossDefinition)
            if (bossDefs.length > 0) {
              const picked = seededPick(3, bossDefs.length, Date.now()).map(i => bossDefs[i].id)
              set((s: GameState & GameActions) => ({ system: { ...s.system, weeklyBossIds: picked } }))
            }
          }

          if (lastResetDate === today) return

          const thisMonday = getMondayDateString()
          const weeklyReset = system.weeklyResetDate !== thisMonday
          const newWeeklyCount = weeklyReset ? 0 : system.weeklyTrainingCount
          const newWeeklyRegenCount = weeklyReset ? 0 : system.weeklyRegenCount
          const wasRestDay = get().settings.restDay
          const allDone = quests.length > 0 && quests.every((q: Quest) => q.done)
          const isFirstDay = lastResetDate === ''
          const hadPenalty = !allDone && !isFirstDay && !wasRestDay
          const failedCount = quests.filter((q: Quest) => !q.done).length

          let newXp = player.xp
          let newGold = player.gold
          let penaltyTriggered = false
          let newPenaltyQuests: Quest[] = []
          let newHardcorePunished = false
          let streakReset = false
          let newPenaltyBlockEnd = 0

          // ── New Penalty Logic (Cumulative) ────────────────────────────────────
          const difficulty = get().settings.missionDifficulty
          const consecutiveFails = system.consecutiveFails ?? 0
          const prevOwed = system.penaltyMissionsOwed ?? 0

          const { 
            penaltyReduction, lootBoost, focusMastery, penaltyImmunity, streakProtect 
          } = computeActivePassives(player.activeShadowIds, player.shadows, get().customShadows, get().activeBuffs)

          if (hadPenalty) {
            const tier = getQuestTier(player.level)
            const punishment = computePunishment(
              failedCount,
              quests.length,
              player.xp,
              get().settings.punishmentIntensity,
              penaltyReduction,
              tier,
              PENALTY_QUEST_POOL
            )

            newXp = Math.max(0, player.xp - punishment.xpLost)
            newPenaltyQuests = punishment.penaltyQuests
            penaltyTriggered = true
            newHardcorePunished = punishment.hardcorePunished
            streakReset = punishment.streakReset
            
            // Difficulty-based blocking logic
            if (difficulty === 'normal') {
              const todayEnd = new Date()
              todayEnd.setHours(22, 0, 0, 0)
              newPenaltyBlockEnd = todayEnd.getTime()
            } else if (difficulty === 'hard') {
              newPenaltyBlockEnd = Date.now() + 24 * 3600_000 
            } else {
              newPenaltyBlockEnd = Date.now() + punishment.penaltyHours * 3600_000
            }

            // ── Defensive Passives (Weekly Cooldown) ───────────────────────────
            const usedSkills = system.usedShadowSkills ?? {}
            const oneWeekMs = 7 * 24 * 3600_000
            const now = Date.now()

            const canUseImmunity = !usedSkills['penalty_immunity'] || (now - usedSkills['penalty_immunity'] > oneWeekMs)

            if (penaltyImmunity && canUseImmunity) {
              console.log('[System] Penalty Immunity triggered. Skipping penalty.')
              set((s: GameState & GameActions) => ({
                system: {
                  ...s.system,
                  hasPenalty: false,
                  penaltyTriggered: false,
                  usedShadowSkills: { ...usedSkills, ['penalty_immunity']: now }
                }
              }))
              // Bypass penalty logic
              penaltyTriggered = false
              newPenaltyQuests = []
              newXp = player.xp
              newGold = player.gold
              streakReset = false
            } else {
              set((s: GameState & GameActions) => ({
                system: {
                  ...s.system,
                  consecutiveFails: consecutiveFails + 1,
                  penaltyMissionsOwed: Math.min(prevOwed + punishment.penaltyQuests.length, 8),
                }
              }))
            }
          } else if (!hadPenalty && !isFirstDay && !wasRestDay) {
            set((s: GameState & GameActions) => ({
              system: { ...s.system, consecutiveFails: 0, penaltyMissionsOwed: prevOwed }
            }))
          }

          // Dungeon/break portals are now rolled hourly via checkDynamicPortalSpawn().

          let newStreak = player.currentStreak
          let newHighest = player.highestStreak

          if (!wasRestDay && !isFirstDay) {
            const pendingRewards = quests.filter((q: Quest) => {
              if (q.done) return false
              if (q.type === 'forbidden' && !q.failed) return true
              if (q.type === 'limit' && (q.currentValue ?? 0) <= (q.gpsTarget ?? q.focusDuration ?? 1)) return true
              return false
            })

            if (pendingRewards.length > 0) {
              newXp += pendingRewards.reduce((sum, q) => sum + q.xp, 0)
              newGold += pendingRewards.reduce((sum, q) => sum + q.gold, 0)
            }

            const effectiveDone = quests.filter((q: Quest) => {
              if (q.done && !q.failed) return true
              if (!q.done && q.type === 'forbidden' && !q.failed) return true
              if (!q.done && q.type === 'limit' && (q.currentValue ?? 0) <= (q.gpsTarget ?? q.focusDuration ?? 1)) return true
              return false
            }).length

            const isPerfect = effectiveDone === quests.length && quests.length > 0
            if (isPerfect) {
              newStreak = player.currentStreak + 1
              newHighest = Math.max(player.highestStreak, newStreak)
            } else if (streakReset) {
              const usedSkills = system.usedShadowSkills ?? {}
              const oneWeekMs = 7 * 24 * 3600_000
              const now = Date.now()

              const canUseProtect = !usedSkills['streak_protect'] || (now - usedSkills['streak_protect'] > oneWeekMs)
              
              if (streakProtect && canUseProtect) {
                console.log('[System] Streak Protect triggered. Streak maintained.')
                newStreak = player.currentStreak
                set((s: GameState & GameActions) => ({
                  system: {
                    ...s.system,
                    usedShadowSkills: { ...(s.system.usedShadowSkills ?? {}), ['streak_protect']: now }
                  }
                }))
              } else {
                newStreak = 0
              }
            }
          }

          const prevStreak = player.currentStreak

          const rawQuests = createDailyQuests(player.level, get().questDictionary, get().settings.missionDifficulty)
          const adjustedQuests = rawQuests.map(q => {
            if (q.type === 'focus' && q.focusDuration) {
              return { ...q, focusDuration: Math.round(q.focusDuration * (1 - focusMastery)) }
            }
            return q
          })

          set((s: GameState & GameActions) => ({
            quests: adjustedQuests,
            extraQuests: [],
            extraQuestRerolledIds: [],
            extraQuestUsedPoolIds: [],
            sideQuests: [],
            lastResetDate: today,
            settings: { ...s.settings, restDay: false },
            statistics: {
              ...s.statistics,
              perfectDays: allDone ? s.statistics.perfectDays + 1 : s.statistics.perfectDays,
              perfectDaysStreak: allDone ? (s.statistics.perfectDaysStreak ?? 0) + 1 : 0,
              sideQuestsCompletedToday: 0,
            },
            player: { ...s.player, xp: newXp, gold: newGold, currentStreak: newStreak, highestStreak: newHighest },
            system: {
              ...s.system,
              hasPenalty: hadPenalty,
              penaltyTriggered,
              penaltyReduced: false,
              hardcorePunished: hadPenalty ? newHardcorePunished : false,
              penaltyQuests: newPenaltyQuests,
              lastPenaltyInfo: hadPenalty ? {
                intensity: get().settings.punishmentIntensity,
                failedCount,
                totalCount: quests.length,
                xpLost: player.xp - newXp,
              } : s.system.lastPenaltyInfo,
              weeklyTrainingCount: weeklyReset ? 0 : s.system.weeklyTrainingCount,
              weeklyRegenCount: weeklyReset ? 0 : s.system.weeklyRegenCount,
              weeklyResetDate: weeklyReset ? thisMonday : s.system.weeklyResetDate,
              weeklyBossIds: (weeklyReset || s.system.weeklyBossIds.length === 0)
                ? (() => {
                    const pool = get().questDictionary.filter(isWeeklyBossDefinition)
                    return pool.length === 0 ? [] : seededPick(3, pool.length, Date.now()).map(i => pool[i].id)
                  })()
                : s.system.weeklyBossIds,
              bossDefeatedThisWeek: weeklyReset ? false : s.system.bossDefeatedThisWeek,
              weeklyDefeatedBossId: weeklyReset ? undefined : s.system.weeklyDefeatedBossId,
              shopStocks: weeklyReset ? { ...INITIAL_SHOP_STOCKS } : s.system.shopStocks,
              extractionDoneToday: false,
              portalDailyCount: 0,
              portalLastRollHourKey: '',
              portalCooldownEnd: 0,
              penaltyBlockEnd: newPenaltyBlockEnd,
              // Portais dinâmicos foram unificados no roll horário (sem lista fixa diária).
              normalBossRotationDate: new Date().toDateString(),
              normalBossIds: [],
              completedNormalBossIds: [],
            },
          }))

          if (hadPenalty) fireEvent('penalty_triggered', {}, ref)
          if (allDone) fireEvent('all_quests_completed', {
            afterPerfectDay: true,
            firstDay: isFirstDay,
            afterPenalty: system.hasPenalty,
          }, ref)
          if (!wasRestDay && !isFirstDay && allDone) {
            fireEvent('streak_updated', { prevStreak }, ref)
          }
          // Job Change detection after player state update
          const nextPlayer = get().player; // Get the updated player state
          const jobChange = hadJobClassChange(player.level, nextPlayer.level)
          if (jobChange) {
            set((s: GameState & GameActions) => ({ jobChangeReward: jobChange }))
          }
          checkAndUnlockAchievements(ref)
          scheduleSystemWarnings().catch(() => { })
          get().checkRaidBoss()
          get().checkDynamicPortalSpawn()
        },

        dismissPenaltyModal() {
          set((s: GameState & GameActions) => ({ system: { ...s.system, penaltyTriggered: false } }))
        },

        setPenaltyTriggered(value: boolean) {
          set((s: GameState & GameActions) => ({ system: { ...s.system, penaltyTriggered: value } }))
        },

        advanceTutorialPhase() {
          set((s: GameState & GameActions) => ({
            system: { ...s.system, tutorialPhase: Math.min((s.system.tutorialPhase ?? 0) + 1, 2) as 0 | 1 | 2 },
          }))
        },

        spawnRaidBoss() {
          set((state: GameState & GameActions) => {
            const pR = getRank(state.player.level)
            let allowedRanks: RaidBossRank[] = ['B']
            if (['E', 'D'].includes(pR.rank)) allowedRanks = ['B']
            else if (pR.rank === 'C') allowedRanks = ['B', 'A']
            else if (pR.rank === 'B') allowedRanks = ['A']
            else if (pR.rank === 'A') allowedRanks = ['A', 'S']
            else if (pR.rank === 'S') allowedRanks = ['S', 'National']
            else if (pR.rank === 'National') allowedRanks = ['National']

            const pool = RAID_BOSSES.filter(b => 
              allowedRanks.includes(b.rank) && 
              !b.id.startsWith('break_boss_') && 
              !b.id.startsWith('key_boss_')
            )
            const bossDef = pool[Math.floor(Math.random() * pool.length)] || RAID_BOSSES[0]
            const tier = getQuestTier(state.player.level)
            const mult = TIER_MULT[tier] || 1
            const poolQuests = state.questDictionary.filter(q => q.type === 'pool')
            const avgPoolBaseXp = poolQuests.length > 0 ? poolQuests.reduce((sum, q) => sum + q.baseXP, 0) / poolQuests.length : 50
            const coreQuests = state.questDictionary.filter(q => q.type === 'core')
            const totalCoreBaseXp = coreQuests.reduce((sum, q) => sum + q.baseXP, 0)
            const poolTarget = getDailyMissionTarget(state.player.level, state.settings.missionDifficulty)
            const expectedDailyXp = (totalCoreBaseXp + (avgPoolBaseXp * poolTarget)) * mult

            const rankReq: Record<string, number> = { B: 0.6, A: 0.75, S: 0.9, National: 1.2 }
            const challengeFactor = rankReq[bossDef.rank] || 0.7
            const maxHp = Math.max(100, Math.floor(expectedDailyXp * bossDef.durationDays * challengeFactor))

            return {
              system: {
                ...state.system,
                activeRaidBoss: {
                  defId: bossDef.id, maxHp, currentHp: maxHp,
                  endDate: Date.now() + bossDef.durationDays * 24 * 60 * 60 * 1000
                }
              }
            }
          })
        },

        dealRaidBossDamage(dmg: number) {
          set((state: GameState & GameActions) => {
            const boss = state.system.activeRaidBoss
            if (!boss) return {}
            const currentHp = Math.max(0, boss.currentHp - dmg)
            if (currentHp <= 0) {
              const bDef = RAID_BOSSES.find(b => b.id === boss.defId)
              if (bDef) {
                const goldReward = boss.maxHp
                const xpReward = Math.floor(boss.maxHp / 2)
                const res = applyXP(state.player.xp, state.player.level, xpReward)
                const attrBoost = getAttrXpBoost(state.player, 'boss')
                const isNewLevel = res.level > state.player.maxLevelReached
                const jobChange = hadJobClassChange(state.player.level, res.level)

                return {
                  player: {
                    ...state.player, gold: state.player.gold + goldReward, xp: res.xp, level: res.level,
                    ...attrBoost,
                    dungeonKeys: getNewLevelKeys(state.player.dungeonKeys ?? [], res.level),
                    maxLevelReached: isNewLevel ? res.level : state.player.maxLevelReached,
                  },
                  ...(res.leveledUp && isNewLevel ? { levelUpReward: { level: res.level, items: [] } } : {}),
                  ...(jobChange ? { jobChangeReward: jobChange } : {}),
                  statistics: { ...state.statistics, totalBossesCompleted: (state.statistics.totalBossesCompleted || 0) + 1 },
                  system: { ...state.system, activeRaidBoss: null, pendingRaidExtractionId: boss.defId }
                }
              }
              return { system: { ...state.system, activeRaidBoss: null } }
            }
            return { system: { ...state.system, activeRaidBoss: { ...boss, currentHp } } }
          })
        },

        checkRaidBoss() {
          const s = get().system.activeRaidBoss
          if (s && Date.now() > s.endDate) set((state: GameState & GameActions) => ({ system: { ...state.system, activeRaidBoss: null } }))
          if (!get().system.activeRaidBoss) get().spawnRaidBoss()
        },

        clearExtraction() { set({ lastExtraction: null }) },

        completeQuest(id: string) {
          let leveledUp = false
          let finalXpGain = 0
          set((s: GameState & GameActions) => {
            const quest = s.quests.find(q => q.id === id)
            if (!quest || quest.done) return {}
            const { xpBoost, goldBoost } = computeActivePassives(s.player.activeShadowIds, s.player.shadows, s.customShadows, s.activeBuffs)
            const baseXP = s.system.xpBoostNext ? quest.xp * 2 : quest.xp
            const xpGain = Math.round(baseXP * (1 + xpBoost))
            finalXpGain = xpGain
            const goldGain = Math.round(quest.gold * (1 + goldBoost))
            const res = applyXP(s.player.xp, s.player.level, xpGain)
            leveledUp = res.leveledUp
            const isNewLevel = res.level > s.player.maxLevelReached
            
            const rewardItems: string[] = []
            if (res.leveledUp && isNewLevel) {
              const count = res.level % 10 === 0 ? 2 : res.level % 5 === 0 ? 1 : 0
              for (let i = 0; i < count; i++) rewardItems.push(Math.random() < 0.5 ? 'lagrima_purificacao' : 'relogio_ampulheta')
            }
            
            const { lootBoost } = computeActivePassives(s.player.activeShadowIds, s.player.shadows, s.customShadows, s.activeBuffs)
            
            if (Math.random() < 0.1 * (1 + lootBoost)) rewardItems.push('loot_box')

            const rewardInv = [...s.player.inventory]
            if (Math.random() < 0.05 * (1 + lootBoost)) rewardItems.push('shadow_essence')
            if (Math.random() < 0.03 * (1 + lootBoost)) rewardItems.push('blood_fallen')
            
            rewardItems.forEach(itemId => {
              const idx = rewardInv.findIndex(e => e.itemId === itemId)
              if (idx >= 0) rewardInv[idx] = { ...rewardInv[idx], quantity: rewardInv[idx].quantity + 1 }
              else rewardInv.push({ itemId, quantity: 1 })
            })

            const attrBoost = getAttrXpBoost(s.player, quest.type)
            const questRank: RankKey = quest?.rank ?? (getRank(res.level).rank as RankKey)
            const jobChange = hadJobClassChange(s.player.level, res.level)
            
            return {
              quests: s.quests.map(q => q.id === id ? { ...q, done: true, xpGained: xpGain, goldGained: goldGain } : q),
              player: {
                ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + goldGain, ...attrBoost,
                inventory: rewardInv, dungeonKeys: getNewLevelKeys(s.player.dungeonKeys ?? [], res.level),
                maxLevelReached: isNewLevel ? res.level : s.player.maxLevelReached,
              },
              system: { ...s.system, xpBoostNext: false, weeklyTrainingCount: quest.type === 'training' ? Math.min(s.system.weeklyTrainingCount + 1, 7) : s.system.weeklyTrainingCount },
              statistics: {
                ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1,
                questsByRank: { ...s.statistics.questsByRank, [questRank]: (s.statistics.questsByRank[questRank] ?? 0) + 1 },
              },
              questCompletions: { ...s.questCompletions, [id]: (s.questCompletions[id] ?? 0) + 1 },
              rewardsQueue: [
                ...s.rewardsQueue,
                ...(res.leveledUp && isNewLevel ? [{ type: 'level_up' as const, id: String(res.level), data: { level: res.level, items: rewardItems } }] : []),
                ...(jobChange ? [{ type: 'job_change' as const, id: jobChange.name, data: jobChange }] : []),
              ],
            }
          })

          const allNowDone = get().quests.every(q => q.done)
          if (allNowDone) cancelSystemWarnings().catch(() => { })

          if (allNowDone && !get().system.extractionDoneToday) {
            const state = get()
            const rank = pickExtractionRank(state.player.level)
            const shadow = rollShadow(rank, [])
            if (shadow) {
              const existing = state.player.shadows.find(e => e.id === shadow.id)
              set((s: GameState & GameActions) => ({
                player: {
                  ...s.player,
                  shadows: existing 
                    ? s.player.shadows.map(e => e.id === shadow.id ? { ...e, level: e.level + 1 } : e)
                    : [...s.player.shadows, { id: shadow.id, level: 1 }]
                },
                lastExtraction: { shadow, isLevelUp: !!existing, newLevel: existing ? existing.level + 1 : 1 },
                system: { ...s.system, extractionDoneToday: true },
              }))
            }
          }

          fireEvent('quest_completed', { isLastQuest: allNowDone }, ref)
          if (allNowDone) fireEvent('all_quests_completed', { afterPerfectDay: true, firstDay: get().statistics.perfectDays === 0, afterPenalty: get().system.hasPenalty }, ref)
          Vibration.vibrate(leveledUp ? [0, 150, 50, 150, 50, 300] : 50)
          checkAndUnlockAchievements(ref)
          if (finalXpGain > 0) get().dealRaidBossDamage(finalXpGain)
          return { leveledUp }
        },

        failQuest(id) { set((s: GameState) => ({ quests: s.quests.map(q => q.id === id ? { ...q, done: true, failed: true } : q) })) },
        updateQuestValue(id, value) { set((s: GameState) => ({ quests: s.quests.map(q => q.id === id ? { ...q, currentValue: value } : q) })) },

        skipQuest(id) {
          set((s: GameState & GameActions) => {
            const quest = s.quests.find(q => q.id === id)
            if (!quest || quest.done) return {}
            const res = applyXP(s.player.xp, s.player.level, quest.xp)
            const isNewLevel = res.level > s.player.maxLevelReached
            const jobChange = hadJobClassChange(s.player.level, res.level)
            return {
              quests: s.quests.map(q => q.id === id ? { ...q, done: true } : q),
              player: {
                ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + quest.gold, ...getAttrXpBoost(s.player, quest.type),
                dungeonKeys: getNewLevelKeys(s.player.dungeonKeys ?? [], res.level), maxLevelReached: isNewLevel ? res.level : s.player.maxLevelReached,
              },
              ...(res.leveledUp && isNewLevel ? { levelUpReward: { level: res.level, items: [] } } : {}),
              ...(jobChange ? { jobChangeReward: jobChange } : {}),
              statistics: { ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1 },
            }
          })
          if (get().quests.every(q => q.done)) cancelSystemWarnings().catch(() => { })
          fireEvent('quest_skipped_via_pass', { itemId: 'system_pass' }, ref)
          checkAndUnlockAchievements(ref)
        },

        undoQuest(id) {
          let xpToRevert = 0
          set((s: GameState & GameActions) => {
            const quest = s.quests.find(q => q.id === id)
            if (!quest?.done) return {}
            xpToRevert = quest.xpGained ?? quest.xp
            let { xp, level, gold } = s.player
            let newXp = xp - xpToRevert
            let newLevel = level
            while (newXp < 0 && newLevel > 1) { newLevel--; newXp = xpForLevel(newLevel) + newXp }
            const questRankToReverse: RankKey = quest.rank ?? (getRank(newLevel).rank as RankKey)
            
            return {
              quests: s.quests.map(q => q.id === id ? { ...q, done: false, xpGained: undefined, goldGained: undefined } : q),
              system: { ...s.system, weeklyTrainingCount: quest.type === 'training' ? Math.max(s.system.weeklyTrainingCount - 1, 0) : s.system.weeklyTrainingCount },
              statistics: {
                ...s.statistics, totalCompleted: Math.max(s.statistics.totalCompleted - 1, 0),
                questsByRank: { ...s.statistics.questsByRank, [questRankToReverse]: Math.max((s.statistics.questsByRank[questRankToReverse] ?? 0) - 1, 0) },
              },
              player: { ...s.player, xp: Math.max(newXp, 0), level: newLevel, gold: Math.max(gold - (quest.goldGained ?? quest.gold), 0) },
              questCompletions: { ...s.questCompletions, [id]: Math.max((s.questCompletions[id] ?? 1) - 1, 0) },
            }
          })
          if (xpToRevert > 0) get().dealRaidBossDamage(-xpToRevert)
        },

        addSideQuest(title) {
          if (!title.trim()) return
          const { rank, xp, gold } = generateSideQuestReward()
          const sq: SideQuest = { id: `sq_${Date.now()}`, title: title.trim(), rank, xp, gold, done: false, createdDate: new Date().toDateString() }
          set((s: GameState) => ({ sideQuests: [...s.sideQuests, sq] }))
          fireEvent('side_quest_added', {}, ref)
          if (rank === 'C') fireEvent('side_quest_c_rank', { rank }, ref)
        },

        completeSideQuest(id) {
          let leveledUp = false
          let finalXpGain = 0
          set((s: GameState & GameActions) => {
            const sq = s.sideQuests.find(q => q.id === id)
            if (!sq || sq.done) return {}
            const { xpBoost, goldBoost } = computeActivePassives(s.player.activeShadowIds, s.player.shadows, s.customShadows)
            const xpGain = Math.round((s.system.xpBoostNext ? sq.xp * 2 : sq.xp) * (1 + xpBoost))
            finalXpGain = xpGain
            const res = applyXP(s.player.xp, s.player.level, xpGain)
            leveledUp = res.leveledUp
            const isNewLevel = res.level > s.player.maxLevelReached
            const jobChange = hadJobClassChange(s.player.level, res.level)
            return {
              sideQuests: s.sideQuests.map(q => q.id === id ? { ...q, done: true, xpGained: xpGain, goldGained: Math.round(sq.gold * (1 + goldBoost)) } : q),
              system: { ...s.system, xpBoostNext: false },
              player: {
                ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + Math.round(sq.gold * (1 + goldBoost)), 
                ...getAttrXpBoost(s.player, 'side'), dungeonKeys: getNewLevelKeys(s.player.dungeonKeys ?? [], res.level),
                maxLevelReached: isNewLevel ? res.level : s.player.maxLevelReached,
              },
              ...(res.leveledUp && isNewLevel ? { levelUpReward: { level: res.level, items: [] } } : {}),
              ...(jobChange ? { jobChangeReward: jobChange } : {}),
              statistics: {
                ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1,
                sideQuestsCompletedToday: (s.statistics.sideQuestsCompletedToday ?? 0) + 1,
                totalSideCompleted: (s.statistics.totalSideCompleted ?? 0) + 1,
                questsByRank: { ...s.statistics.questsByRank, [sq.rank as RankKey]: (s.statistics.questsByRank[sq.rank as RankKey] ?? 0) + 1 },
              },
            }
          })
          fireEvent('side_quest_completed', { todayCount: get().statistics.sideQuestsCompletedToday }, ref)
          checkAndUnlockAchievements(ref)
          if (finalXpGain > 0) get().dealRaidBossDamage(finalXpGain)
          return { leveledUp }
        },

        startSideQuest(id, mins) { set((s: GameState) => ({ sideQuests: s.sideQuests.map(q => q.id === id ? { ...q, startTime: Date.now(), duration: mins * 60 } : q) })) },
        updateSideQuestNote(id, note) { set((s: GameState) => ({ sideQuests: s.sideQuests.map(q => q.id === id ? { ...q, note } : q) })) },
        removeSideQuest(id) { set((s: GameState) => ({ sideQuests: s.sideQuests.filter(q => q.id !== id) })) },

        addXP(amount) {
          let leveledUp = false
          set((s: GameState & GameActions) => {
            const res = applyXP(s.player.xp, s.player.level, amount)
            leveledUp = res.leveledUp
            const isNewLevel = res.level > s.player.maxLevelReached
            const jobChange = hadJobClassChange(s.player.level, res.level)
            return {
              player: {
                ...s.player, xp: res.xp, level: res.level, ...getAttrXpBoost(s.player, 'side'),
                dungeonKeys: getNewLevelKeys(s.player.dungeonKeys ?? [], res.level), maxLevelReached: isNewLevel ? res.level : s.player.maxLevelReached,
              },
              ...(res.leveledUp && isNewLevel ? { levelUpReward: { level: res.level, items: [] } } : {}),
              ...(jobChange ? { jobChangeReward: jobChange } : {}),
            }
          })
          checkAndUnlockAchievements(ref)
          return { leveledUp }
        },

        toggleFavoriteShadow(id) {
          set((s: GameState) => ({ player: { ...s.player, shadows: s.player.shadows.map(sh => sh.id === id ? { ...sh, isFavorite: !sh.isFavorite } : sh) } }))
        },

        recordFocusTime(minutes) {
          if (minutes <= 0) return
          set((s: GameState) => {
            const stats = { ...s.statistics, totalFocusMinutes: s.statistics.totalFocusMinutes + minutes }
            if (s.system.hasPenalty && s.system.penaltyBlockEnd > 0) {
              const newEnd = s.system.penaltyBlockEnd - minutes * 60_000
              if (newEnd <= Date.now()) return { statistics: stats, system: { ...s.system, hasPenalty: false, penaltyBlockEnd: 0 } }
              return { statistics: stats, system: { ...s.system, penaltyBlockEnd: newEnd } }
            }
            return { statistics: stats }
          })
          fireEvent('focus_total_hours', {}, ref, minutes)
          fireEvent('focus_session_completed', { minutes }, ref, 1)
          checkAndUnlockAchievements(ref)
        },

        purchaseItem(itemId, cost) {
          let success = false
          set((s: GameState & GameActions) => {
            const { shopDiscount } = computeActivePassives(s.player.activeShadowIds, s.player.shadows, s.customShadows, s.activeBuffs)
            const finalCost = Math.round(cost * (1 - shopDiscount))

            if (s.player.gold < finalCost || (STOCKED_ITEMS.includes(itemId) && (s.system.shopStocks[itemId] ?? 0) <= 0)) return {}
            success = true
            if (itemId.startsWith('theme_')) {
              if (s.player.unlockedThemes?.includes(itemId)) return {}
              return {
                player: { ...s.player, gold: s.player.gold - finalCost, unlockedThemes: [...(s.player.unlockedThemes ?? []), itemId], activeThemeId: itemId },
                statistics: { ...s.statistics, totalGoldSpent: (s.statistics.totalGoldSpent ?? 0) + finalCost },
              }
            }
            const inv = [...s.player.inventory]
            const idx = inv.findIndex(e => e.itemId === itemId)
            if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + 1 }
            else inv.push({ itemId, quantity: 1 })
            return {
              player: { ...s.player, gold: s.player.gold - finalCost, inventory: inv },
              system: { ...s.system, shopStocks: STOCKED_ITEMS.includes(itemId) ? { ...s.system.shopStocks, [itemId]: s.system.shopStocks[itemId]! - 1 } : s.system.shopStocks },
              statistics: { ...s.statistics, totalGoldSpent: (s.statistics.totalGoldSpent ?? 0) + finalCost },
            }
          })
          if (success) { fireEvent('item_purchased', { itemId }, ref); fireEvent('gold_spent_total', { itemId }, ref, cost); checkAndUnlockAchievements(ref) }
          return success
        },

        useInventoryItem(itemId) {
          set((s: GameState & GameActions) => {
            const item = CATALOG_MAP[itemId]
            if (!item) return {}
            const nextInv = s.player.inventory.map(e => e.itemId === itemId ? { ...e, quantity: e.quantity - 1 } : e).filter(e => e.quantity > 0)
            
            // Handle specific buff items
            const newBuffs = [...s.activeBuffs]
            const now = Date.now()
            
            if (itemId === 'kasaka_venom') {
              get().applyBuff({ id: 'kasaka_xp', label: 'Veneno de Kasaka', multiplier: 1.15, stat: 'xp' }, 2 * 3600_000)
            } else if (itemId === 'igris_fragment') {
              get().applyBuff({ id: 'igris_xp', label: 'Fragmento de Igris', multiplier: 1.20, stat: 'xp' }, 3600_000)
            } else if (itemId === 'cerberus_fang') {
              get().applyBuff({ id: 'cerberus_gold', label: 'Presa de Cerberus', multiplier: 1.20, stat: 'gold' }, 2 * 3600_000)
            } else if (itemId === 'iron_will_crystal') {
              get().applyBuff({ id: 'iron_will_xp', label: 'Vontade de Ferro', multiplier: 1.50, stat: 'xp' }, 30 * 60_000)
            } else if (itemId === 'blood_fallen') {
              get().applyBuff({ id: 'blood_gold', label: 'Sangue dos Caídos', multiplier: 1.25, stat: 'gold' }, 3 * 3600_000)
            } else if (itemId === 'dragon_scale') {
              get().applyBuff({ id: 'dragon_xp', label: 'Escama de Dragão', multiplier: 1.30, stat: 'xp' }, 4 * 3600_000)
            } else if (itemId === 'shadow_essence') {
              // Special logic: reset extractionDoneToday
              return { player: { ...s.player, inventory: nextInv }, system: { ...s.system, extractionDoneToday: false } }
            } else if (itemId === 'lich_eye') {
              // Special: double next (simplified as 1h 100% boost?)
              get().applyBuff({ id: 'lich_eye_xp', label: 'Olho do Lich', multiplier: 2.0, stat: 'xp' }, 3600_000)
            }

            return {
              player: { ...s.player, inventory: nextInv },
              activeBuffs: newBuffs,
            }
          })
        },

        openLootBox() {
          let result = { reward: 'Vazio', detail: 'O cofre estava vazio...', color: '#94a3b8' }
          set((s: GameState & GameActions) => {
            const hasBox = s.player.inventory.find(e => e.itemId === 'loot_box' && e.quantity > 0)
            if (!hasBox) return {}
            const { lootBoost } = computeActivePassives(s.player.activeShadowIds, s.player.shadows, s.customShadows, s.activeBuffs)
            const roll = Math.random()
            const lootMult = (1 + lootBoost)

            let g = 0, x = 0, k = null
            if (roll < (0.7 / lootMult)) { 
              // More likely to get XP/Keys if lootBoost is high (by reducing gold probability range)
              // Or better yet, boost the amount
              g = Math.round((100 + Math.floor(Math.random() * 201)) * lootMult)
              result = { reward: 'GOLD', detail: `Encontraste ${g} Gold!`, color: '#fbbf24' } 
            }
            else if (roll < 0.9) { 
              x = Math.round((50 + Math.floor(Math.random() * 51)) * lootMult)
              result = { reward: 'XP', detail: `Absorveste ${x} XP!`, color: '#3b82f6' } 
            }
            else {
              const available = BOX_KEYS.filter(k => !(s.player.dungeonKeys ?? []).includes(k.id))
              if (available.length > 0) { const key = available[Math.floor(Math.random()*available.length)]; k = key.id; result = { reward: 'CHAVE RARA', detail: `Obtiveste a ${key.name}!`, color: key.color } }
              else { g = Math.round(500 * lootMult); result = { reward: 'GOLD', detail: `Recebeste ${g} Gold!`, color: '#fbbf24' } }
            }
            const res = applyXP(s.player.xp, s.player.level, x)
            const jobChange = hadJobClassChange(s.player.level, res.level)
            return {
              player: { ...s.player, gold: s.player.gold + g, xp: res.xp, level: res.level, inventory: s.player.inventory.map(e => e.itemId === 'loot_box' ? { ...e, quantity: e.quantity - 1 } : e).filter(e => e.quantity > 0), dungeonKeys: k ? Array.from(new Set([...(s.player.dungeonKeys ?? []), k])) : getNewLevelKeys(s.player.dungeonKeys ?? [], res.level), maxLevelReached: Math.max(s.player.maxLevelReached, res.level) },
              ...(res.leveledUp && res.level > s.player.maxLevelReached ? { levelUpReward: { level: res.level, items: [] } } : {}),
              ...(jobChange ? { jobChangeReward: jobChange } : {}),
            }
          })
          return result
        },

        enterDungeon(keyId) {
          let success = false
          set((s: GameState) => {
            if (!s.player.dungeonKeys?.includes(keyId)) return {}
            success = true
            return { player: { ...s.player, dungeonKeys: s.player.dungeonKeys.filter(id => id !== keyId) } }
          })
          return success
        },

        addToInventory(itemId, qty = 1) {
          set((s: GameState) => {
            const inv = [...s.player.inventory]
            const idx = inv.findIndex(e => e.itemId === itemId)
            if (idx >= 0) inv[idx].quantity += qty
            else inv.push({ itemId, quantity: qty })
            return { player: { ...s.player, inventory: inv } }
          })
        },

        purchaseShadow(shadowId, cost) {
          const state = get()
          const { shopDiscount } = computeActivePassives(state.player.activeShadowIds, state.player.shadows, state.customShadows, state.activeBuffs)
          const finalCost = Math.round(cost * (1 - shopDiscount))

          if (state.player.gold < finalCost || !SHADOW_MAP[shadowId]) return false
          const existing = state.player.shadows.find(e => e.id === shadowId)
          set((s: GameState) => ({
            player: { 
              ...s.player, 
              gold: s.player.gold - finalCost, 
              shadows: existing ? s.player.shadows.map(e => e.id === shadowId ? { ...e, level: e.level + 1 } : e) : [...s.player.shadows, { id: shadowId, level: 1 }] 
            },
            statistics: { ...s.statistics, totalGoldSpent: (s.statistics.totalGoldSpent ?? 0) + finalCost },
            rewardsQueue: [...s.rewardsQueue, { type: 'shadow', id: shadowId, isLevelUp: !!existing, newLevel: existing ? existing.level + 1 : 1 }],
          }))
          fireEvent('shadow_collected', { shadowId }, ref); checkAndUnlockAchievements(ref)
          return true
        },

        defeatDungeonBoss(shadowId, customDef) {
          const { player, system, customShadows } = get()
          const { xpBoost, goldBoost, lootBoost } = computeActivePassives(player.activeShadowIds, player.shadows, customShadows, get().activeBuffs)
          const xpReward = Math.round(800 * (1 + xpBoost) * (system.xpBoostNext ? 2 : 1))
          const goldReward = Math.round(2000 * (1 + goldBoost))
          let shadowName, leveledUpShadow = false, isNew = false
          let newShadows = [...player.shadows]
          const newRewards: { type: 'achievement' | 'shadow'; id: string; isLevelUp?: boolean; newLevel?: number }[] = []

          if (shadowId) {
            let finalId = shadowId
            const exclusiveShadow = getBossDropShadow(shadowId)
            if (exclusiveShadow) {
                finalId = exclusiveShadow.id
            } else if (!customDef && !SHADOW_MAP[shadowId]) {
                const rank = pickExtractionRank(player.level)
                const rolled = rollShadow(rank, [])
                if (rolled) finalId = rolled.id
            }

            const existingShadow = player.shadows.find(e => e.id === finalId)
            leveledUpShadow = !!existingShadow
            isNew = !existingShadow
            if (customDef && !existingShadow) {
              const newCustom: Shadow = { id: finalId, name: customDef.name, rank: 'Normal' as ShadowRank, type: 'Custom', dropRate: 0, passiveEffect: getCustomShadowPassive(customDef.questType), lore: `"${customDef.name} — lealdade absoluta."`, icon: customDef.icon, color: '#a855f7' }
              set((s: GameState & GameActions) => ({ customShadows: [...s.customShadows, newCustom] }))
              newShadows.push({ id: finalId, level: 1 })
              shadowName = customDef.name
            } else {
              newShadows = existingShadow ? player.shadows.map(e => e.id === finalId ? { ...e, level: e.level + 1 } : e) : [...player.shadows, { id: finalId, level: 1 }]
              shadowName = customDef?.name ?? SHADOW_MAP[finalId]?.name ?? finalId
            }

            newRewards.push({
              type: 'shadow',
              id: finalId,
              isLevelUp: leveledUpShadow,
              newLevel: existingShadow ? existingShadow.level + 1 : 1
            })
            
            set({ lastExtraction: { shadow: SHADOW_MAP[finalId] ?? customShadows.find(s => s.id === finalId), isLevelUp: leveledUpShadow, newLevel: existingShadow ? existingShadow.level + 1 : 1 } })
          }

          set(s => {
            const isNormalBoss = shadowId && (shadowId.startsWith('normal_boss_') || shadowId.includes('cerberus') || shadowId.includes('igris'))
            const newCompleted = isNormalBoss ? [...s.system.completedNormalBossIds, shadowId] : s.system.completedNormalBossIds
            
            const res = applyXP(s.player.xp, s.player.level, xpReward)
            const jobChange = hadJobClassChange(s.player.level, res.level)

            return {
              player: { ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + goldReward, shadows: newShadows, ...getAttrXpBoost(s.player, 'boss'), maxLevelReached: Math.max(s.player.maxLevelReached, res.level) },
              system: { ...s.system, bossDefeatedThisWeek: true, weeklyDefeatedBossId: shadowId, bossesDefeated: s.system.bossesDefeated + 1, completedNormalBossIds: newCompleted },
              rewardsQueue: [
                ...s.rewardsQueue,
                ...newRewards,
                ...(res.leveledUp && res.level > s.player.maxLevelReached ? [{ type: 'level_up' as const, id: String(res.level), data: { level: res.level, items: [] } }] : []),
                ...(jobChange ? [{ type: 'job_change' as const, id: jobChange.name, data: jobChange }] : []),
              ],
              statistics: { ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1, totalBossesCompleted: (s.statistics.totalBossesCompleted ?? 0) + 1, questsByRank: { ...s.statistics.questsByRank, A: (s.statistics.questsByRank.A ?? 0) + 1 } },
            }
          })

          // Item Rewards with Loot Perception
          const dropItems: string[] = []
          const roll = Math.random()
          const lootMult = (1 + lootBoost)

          if (roll < (0.5 * lootMult)) dropItems.push('shadow_essence')
          if (roll < (0.2 * lootMult)) dropItems.push('blood_fallen')
          
          if (shadowId.includes('kasaka') && roll < (0.4 * lootMult)) dropItems.push('kasaka_venom')
          else if (shadowId.includes('igris') && roll < (0.4 * lootMult)) dropItems.push('igris_fragment')
          else if (shadowId.includes('cerberus') && roll < (0.4 * lootMult)) dropItems.push('cerberus_fang')
          else if (shadowId.includes('lich') || shadowId.includes('baran')) {
            if (roll < 0.3) dropItems.push(Math.random() < 0.5 ? 'iron_will_crystal' : 'lich_eye')
          } else if (shadowId.includes('antares') || shadowId.includes('kamish')) {
            if (roll < 0.2) dropItems.push('dragon_scale')
          }

          if (dropItems.length > 0) {
            set((s: GameState) => {
              const inv = [...s.player.inventory]
              dropItems.forEach(itemId => {
                const idx = inv.findIndex(e => e.itemId === itemId)
                if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + 1 }
                else inv.push({ itemId, quantity: 1 })
              })
              return { player: { ...s.player, inventory: inv } }
            })
          }

          fireEvent('boss_defeated', { missionId: shadowId }, ref); if (shadowName) fireEvent('shadow_collected', {}, ref); checkAndUnlockAchievements(ref)
          return { xp: xpReward, gold: goldReward, shadowName, leveledUpShadow, isNew }
        },

        setFocusModeActive(v) { set((s: GameState) => ({ system: { ...s.system, focusModeActive: v } })) },
        setHardcoreFocusMode(v) { set((s: GameState) => ({ system: { ...s.system, hardcoreFocusMode: v } })) },
        setHardcorePunished(v) { set((s: GameState) => ({ system: { ...s.system, hardcorePunished: v } })) },
        setXpBoostNext(v) { set((s: GameState) => ({ system: { ...s.system, xpBoostNext: v } })) },
        setPenaltyReduced(v) { set((s: GameState) => ({ system: { ...s.system, penaltyReduced: v } })) },
        removePenalty() { set((s: GameState) => ({ system: { ...s.system, hasPenalty: false, penaltyTriggered: false, penaltyQuests: [], penaltyBlockEnd: 0 } })); fireEvent('penalty_cleared', {}, ref) },
        deductGold(amount) { if (get().player.gold < amount) return false; set((s: GameState) => ({ player: { ...s.player, gold: s.player.gold - amount }, statistics: { ...s.statistics, totalGoldSpent: (s.statistics.totalGoldSpent ?? 0) + amount } })); return true },
        toggleBlockedApp(pkg) { set((s: GameState) => ({ system: { ...s.system, blockedApps: s.system.blockedApps.includes(pkg) ? s.system.blockedApps.filter(p => p !== pkg) : [...s.system.blockedApps, pkg] } })) },
        dismissAchievement() { set((s: GameState & GameActions) => ({ rewardsQueue: s.rewardsQueue.filter(r => r.type !== 'achievement') })) },
        addQuestDefinition(def) { set((s: GameState) => ({ questDictionary: [...s.questDictionary, def] })) },
        updateQuestDefinition(id, patch) { set((s: GameState) => ({ questDictionary: s.questDictionary.map(d => d.id === id ? { ...d, ...patch } : d) })) },
        setActiveTheme(themeId) { set((s: GameState) => ({ player: { ...s.player, activeThemeId: themeId } })) },
        deleteQuestDefinition(id) { set((s: GameState) => ({ questDictionary: s.questDictionary.filter(d => d.id !== id) })) },
        updateSettings(patch) { set((s: GameState) => ({ settings: { ...s.settings, ...patch } })) },
        saveQuestRecord(questId, time, note) { set((s: GameState & GameActions) => { const prev = s.questRecords[questId]; const bestTime = time > 0 && (!prev || time < prev.bestTime) ? time : prev?.bestTime ?? 0; const history = [...(prev?.history ?? [])]; history.push({ date: new Date().toISOString(), time, note }); return { questRecords: { ...s.questRecords, [questId]: { bestTime, lastNote: note, history } } } }) },
        dismissLevelUpReward() { set((s: GameState & GameActions) => ({ levelUpReward: null })) },
        dismissJobChangeReward() { set((s: GameState & GameActions) => ({ jobChangeReward: null })) },
        startMissionTimer(id) { set((s: GameState & GameActions) => { const t = s.activeMissionTimers[id]; if (t && !t.isPaused) return {}; return { activeMissionTimers: { ...s.activeMissionTimers, [id]: { startTime: Date.now(), accumulatedMs: t?.accumulatedMs ?? 0, isPaused: false } } } }) },
        pauseMissionTimer(id) { set((s: GameState) => { const t = s.activeMissionTimers[id]; if (!t || t.isPaused) return {}; return { activeMissionTimers: { ...s.activeMissionTimers, [id]: { startTime: 0, accumulatedMs: t.accumulatedMs + (Date.now() - t.startTime), isPaused: true } } } }) },
        clearMissionTimer(id) { set((s: GameState) => { const { [id]: _, ...rest } = s.activeMissionTimers; return { activeMissionTimers: rest } }) },
        dismissExtraction() { set((s: GameState & GameActions) => ({ rewardsQueue: s.rewardsQueue.filter(r => r.type !== 'shadow') })) },
        toggleActiveShadow(id) { set((s: GameState & GameActions) => { const active = s.player.activeShadowIds; const isActive = active.includes(id); const newActive = isActive ? active.filter(a => a !== id) : active.length < 3 ? [...active, id] : active; return { player: { ...s.player, activeShadowIds: newActive } } }) },
        setEventBossState(key, required, total) { set((s: GameState) => ({ system: { ...s.system, eventBossKey: key, eventBossCompletedIds: [], eventBossRequired: required, eventBossTotal: total, eventBossDefeated: false } })) },
        completeEventTrial(id, key, required, total) { let completed = 0; set((s: GameState & GameActions) => { const reset = s.system.eventBossKey !== key; const nextIds = (reset ? [] : s.system.eventBossCompletedIds).includes(id) ? (reset ? [] : s.system.eventBossCompletedIds) : [...(reset ? [] : s.system.eventBossCompletedIds), id]; completed = nextIds.length; return { system: { ...s.system, eventBossKey: key, eventBossCompletedIds: nextIds, eventBossRequired: required, eventBossTotal: total } } }); return { completed, required } },
        markEventBossDefeated(key) { set((s: GameState & GameActions) => ({ system: { ...s.system, eventBossKey: key, eventBossDefeated: true } })) },
        releaseShadow(id) { const { player, customShadows } = get(); const entry = player.shadows.find(e => e.id === id); if (!entry) return { gold: 0 }; const shadow = ({ ...SHADOW_MAP, ...Object.fromEntries(customShadows.map(sh => [sh.id, sh])) })[id]; const goldGained = shadow ? getShadowReleaseGold(shadow, entry.level) : 0; set((s: GameState & GameActions) => ({ player: { ...s.player, gold: s.player.gold + goldGained, shadows: s.player.shadows.filter(e => e.id !== id), activeShadowIds: s.player.activeShadowIds.filter(a => a !== id) }, customShadows: s.customShadows.filter(sh => sh.id !== id) })); return { gold: goldGained } },

        regenerateSingleDailyQuest(questId) {
          const { system, player, questDictionary, quests } = get()
          if (system.weeklyRegenCount >= 7) return { success: false, reason: 'Limite semanal atingido (7/7).' }
          const targetQuest = quests.find(q => q.id === questId)
          if (!targetQuest || targetQuest.done) return { success: false, reason: 'Missão inválida.' }
          const baseSeed = Date.now() + system.weeklyRegenCount
          let newQuest: Quest | undefined = undefined
          const activeIds = quests.map(q => q.id)
          for (let i = 0; i < 40; i++) {
            const candidates = createDailyQuests(player.level, questDictionary, get().settings.missionDifficulty, baseSeed + i)
            newQuest = candidates.find(q => !activeIds.includes(q.id))
            if (newQuest) break
          }
          if (!newQuest) return { success: false, reason: 'Não há outras missões disponíveis.' }
          set((s: GameState & GameActions) => ({ quests: quests.map(q => q.id === questId ? newQuest! : q), system: { ...s.system, weeklyRegenCount: s.system.weeklyRegenCount + 1 } }))
          return { success: true }
        },

        replaceExtraQuest(questId) {
          const { extraQuests, extraQuestRerolledIds, extraQuestUsedPoolIds, questDictionary, player } = get()
          if (extraQuestRerolledIds.includes(questId)) return { success: false, reason: 'Já substituída hoje.' }
          const target = extraQuests.find(q => q.id === questId)
          if (!target || target.done) return { success: false, reason: 'Inválida.' }
          const usedPoolIds = new Set([...extraQuestUsedPoolIds, ...extraQuests.filter(q => q.id !== questId).map(q => q.id.split('_').slice(1, -1).join('_')).filter(Boolean)])
          const available = questDictionary.filter(def => def.type === 'pool' && !usedPoolIds.has(def.id))
          if (available.length === 0) return { success: false, reason: 'Pool vazia.' }
          const chosen = available[Math.floor(Math.random() * available.length)]
          const base = defToQuest(chosen, player.level, getQuestTier(player.level))
          const newQ = { ...base, id: `extra_${chosen.id}_${Date.now()}`, xp: Math.round(base.xp * 1.5), gold: Math.round(base.gold * 1.5) }
          set((s: GameState) => ({ extraQuests: s.extraQuests.map(q => q.id === questId ? newQ : q), extraQuestRerolledIds: [...s.extraQuestRerolledIds, questId], extraQuestUsedPoolIds: [...s.extraQuestUsedPoolIds, chosen.id] }))
          return { success: true }
        },

        generateExtraQuests() {
          const { player, questDictionary, extraQuests, settings } = get()
          const targetLimit = getDailyMissionTarget(player.level, settings.missionDifficulty)
          if (extraQuests.length >= Math.min(3, targetLimit)) return { success: false, reason: 'Limite atingido.' }
          const usedIds = new Set(extraQuests.map(q => q.id))
          const available = questDictionary.filter(def => def.type === 'pool' && !usedIds.has(def.id))
          if (available.length === 0) return { success: false, reason: 'Pool vazia.' }
          const chosen = available[Math.floor(Math.random() * available.length)]
          const base = defToQuest(chosen, player.level, getQuestTier(player.level))
          const newQ = { ...base, id: `extra_${base.id}_${Date.now()}`, xp: Math.round(base.xp * 1.5), gold: Math.round(base.gold * 1.5) }
          set((s: GameState) => ({ extraQuests: [...s.extraQuests, newQ] }))
          return { success: true }
        },

        completeExtraQuest(id) {
          let leveledUp = false
          set((s: GameState & GameActions) => {
            const quest = s.extraQuests.find(q => q.id === id)
            if (!quest || quest.done) return {}
            const { xpBoost, goldBoost } = computeActivePassives(s.player.activeShadowIds, s.player.shadows, s.customShadows, s.activeBuffs)
            const xpGain = Math.round((s.system.xpBoostNext ? quest.xp * 2 : quest.xp) * (1 + xpBoost))
            const res = applyXP(s.player.xp, s.player.level, xpGain)
            leveledUp = res.leveledUp
            const isNewLevel = res.level > s.player.maxLevelReached
            return {
              extraQuests: s.extraQuests.map(q => q.id === id ? { ...q, done: true } : q), player: { ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + Math.round(quest.gold * (1 + goldBoost)), ...getAttrXpBoost(s.player, quest.type), maxLevelReached: Math.max(s.player.maxLevelReached, res.level) },
              ...(res.leveledUp && isNewLevel ? { levelUpReward: { level: res.level, items: [] } } : {}),
              system: { ...s.system, xpBoostNext: false }, statistics: { ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1 },
            }
          })
          fireEvent('quest_completed', { isLastQuest: false }, ref); 
          fireEvent('extra_quest_completed', {}, ref);
          const { extraQuests } = get()
          if (extraQuests.length > 0 && extraQuests.every(q => q.done)) {
            fireEvent('all_extra_quests_completed', {}, ref);
          }
          Vibration.vibrate(leveledUp ? [0, 150, 50, 150, 50, 300] : 50); 
          checkAndUnlockAchievements(ref)
          return { leveledUp }
        },

        restoreBackup(data) {
          if (!data || typeof data !== 'object') return
          const safe: Partial<GameState> = {}
          const allowed: Array<keyof GameState> = ['player', 'quests', 'extraQuests', 'sideQuests', 'questDictionary', 'customShadows', 'settings', 'statistics', 'system', 'lastResetDate', 'unlockedAchievements', 'achievementProgress', 'questRecords', 'questCompletions', 'activeMissionTimers']
          for (const key of allowed) if (key in data) (safe as any)[key] = (data as any)[key]
          set((s: GameState & GameActions) => ({ ...s, ...safe } as Partial<GameState & GameActions>))
        },

        extractShadow(shadowId: string) {
          const shadow = get().player.shadows?.find(s => s.id === shadowId)
          if (!shadow) return
          set((s: GameState & GameActions) => ({
            system: { ...s.system, extractionDoneToday: true }
          }))
        },

        checkDailyReset() {
          get().bootSystem()
        },

        checkDynamicPortalSpawn() {
          const now = Date.now()
          const s = get().system

          // Clear expired active portal.
          if (s.activeDungeonBreak && now >= s.activeDungeonBreak.expiresAt) {
            set((st: GameState) => ({ system: { ...st.system, activeDungeonBreak: null } }))
          }
          // Never roll while a portal is active.
          if (get().system.activeDungeonBreak && now < (get().system.activeDungeonBreak?.expiresAt ?? 0)) return
          // Respect cooldown after a finished portal.
          if ((s.portalCooldownEnd ?? 0) > now) return

          const d = new Date(now)
          const hourKey = `${d.toDateString()}-${d.getHours()}`
          if ((s.portalLastRollHourKey ?? '') === hourKey) return

          // Mark this hour as already rolled (success or fail).
          set((st: GameState) => ({ system: { ...st.system, portalLastRollHourKey: hourKey } }))

          const dailyCap = 3
          if ((get().system.portalDailyCount ?? 0) >= dailyCap) return
          if (Math.random() >= 0.30) return

          const questPool = get().questDictionary
            .filter(isPortalBossDefinition)
            .map(def => ({ source: 'quest' as const, bossId: def.id }))
          const breakPool = RAID_BOSSES
            .filter(b => b.id.startsWith('break_boss_'))
            .map(b => ({ source: 'break' as const, bossId: b.id }))

          const usedToday = new Set(get().system.completedNormalBossIds ?? [])
          const combined = [...questPool, ...breakPool]
          const available = combined.filter(p => !usedToday.has(p.bossId))
          const pool = available.length > 0 ? available : combined
          if (pool.length === 0) return

          const pick = pool[Math.floor(Math.random() * pool.length)]
          const durationMin = 30 * 60_000
          const durationMax = 3 * 60 * 60_000
          const duration = durationMin + Math.floor(Math.random() * (durationMax - durationMin + 1))
          const expiresAt = now + duration
          const cooldownMs = 45 * 60_000

          set((st: GameState) => ({
            system: {
              ...st.system,
              activeDungeonBreak: { bossId: pick.bossId, startsAt: now, expiresAt, source: pick.source },
              portalDailyCount: (st.system.portalDailyCount ?? 0) + 1,
              portalCooldownEnd: expiresAt + cooldownMs,
            },
          }))
        },

        checkAndUnlockAchievements() {
          checkAndUnlockAchievements(ref)
        },
      }
    },
    {
      name: 'solo-leveling-v3',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted: any, current: GameState & GameActions) => {
        const data = (persisted || {}) as any
        const rawPlayer = data.player ?? {}
        const rawShadows = rawPlayer.shadows ?? []
        const migratedShadows: ShadowEntry[] = rawShadows.map((s: any) => typeof s === 'string' ? { id: s, level: 1 } : s)
        const sXp = rawPlayer.strXp ?? Math.pow(Math.max(0, (rawPlayer.str ?? 10) - 10), 2) * 5
        const aXp = rawPlayer.agiXp ?? Math.pow(Math.max(0, (rawPlayer.agi ?? 10) - 10), 2) * 5
        const iXp = rawPlayer.intXp ?? Math.pow(Math.max(0, (rawPlayer.int ?? 10) - 10), 2) * 5
        const vXp = rawPlayer.vitXp ?? Math.pow(Math.max(0, (rawPlayer.vit ?? 10) - 10), 2) * 5
        return {
          ...current, ...data,
          player: { ...current.player, ...rawPlayer, strXp: sXp, agiXp: aXp, intXp: iXp, vitXp: vXp, str: attrLevelFromXP(sXp), agi: attrLevelFromXP(aXp), int: attrLevelFromXP(iXp), vit: attrLevelFromXP(vXp), shadows: migratedShadows, activeShadowIds: rawPlayer.activeShadowIds ?? [], dungeonKeys: getNewLevelKeys(rawPlayer.dungeonKeys ?? [], rawPlayer.level ?? 1) },
          system: { ...current.system, ...(data.system ?? {}) }, settings: { ...current.settings, ...(data.settings ?? {}) }, statistics: { ...current.statistics, ...(data.statistics ?? {}) }, questDictionary: data.questDictionary ?? current.questDictionary, customShadows: data.customShadows ?? current.customShadows, lastExtraction: data.lastExtraction ?? null, achievementProgress: Object.fromEntries(Object.entries(data.achievementProgress ?? {}).map(([id, val]) => [id, typeof val === 'number' ? { currentValue: val, currentTierIndex: 0 } : val])), questRecords: data.questRecords ?? {}, questCompletions: data.questCompletions ?? {}, activeMissionTimers: data.activeMissionTimers ?? {}, extraQuestRerolledIds: data.extraQuestRerolledIds ?? [], extraQuestUsedPoolIds: data.extraQuestUsedPoolIds ?? [], newAchievementIds: [],
        }
      },
      partialize: s => ({ player: s.player, quests: s.quests, sideQuests: s.sideQuests, extraQuests: s.extraQuests, questDictionary: s.questDictionary, customShadows: s.customShadows, settings: s.settings, system: { ...s.system, penaltyTriggered: false }, statistics: s.statistics, lastResetDate: s.lastResetDate, unlockedAchievements: s.unlockedAchievements, achievementProgress: s.achievementProgress, questRecords: s.questRecords, questCompletions: s.questCompletions, activeMissionTimers: s.activeMissionTimers, extraQuestRerolledIds: s.extraQuestRerolledIds, extraQuestUsedPoolIds: s.extraQuestUsedPoolIds }),
    }
  )
)

// ── Widget Synchronization ───────────────────────────────────────────────────
let lastWidgetSync = 0
const WIDGET_SYNC_THROTTLE = 5000

useGameStore.subscribe((state) => {
  const now = Date.now()
  if (now - lastWidgetSync < WIDGET_SYNC_THROTTLE) return
  lastWidgetSync = now
  try {
    if (!state || !state.player || !state.statistics || !state.system) return
    const rankObj = getRank(state.player.level, state.statistics.totalCompleted, state.system.bossesDefeated, state.statistics.questsByRank)
    const snapshot = {
      streak: state.player.currentStreak,
      dailyQuests: Array.isArray(state.quests) ? state.quests.map(q => ({ id: q.id, label: q.label, type: q.type, done: q.done })) : [],
      activeShadows: Array.isArray(state.player.activeShadowIds) ? state.player.activeShadowIds.map(id => {
        const entry = Array.isArray(state.player.shadows) ? state.player.shadows.find(s => s.id === id) : undefined
        const shDef = SHADOW_MAP[id] || (Array.isArray(state.customShadows) ? state.customShadows.find(s => s.id === id) : undefined)
        return { name: shDef?.name ?? id, level: entry?.level ?? 1 }
      }) : [],
      status: { name: state.player.name, level: state.player.level, xp: state.player.xp, rank: rankObj.rank, nextRankXp: xpForLevel(state.player.level), totalCompleted: state.statistics.totalCompleted || 0 }
    }
    if (SharedStorage?.setWidgetData) SharedStorage.setWidgetData(JSON.stringify(snapshot))
  } catch (err) { console.error('Failed to sync widget data:', err) }
})

export default useGameStore

const STOCKED_ITEMS = ['system_pass', 'lagrima_purificacao']
