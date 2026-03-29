import type { Shadow, PassiveEffectType, ShadowRank } from '../data/shadows'
import type { AchievementProg, EventTrigger } from '../data/achievements'

// ── XP / Rank ──────────────────────────────────────────────────────────────────

export type RankLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'National'
export type RankKey = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

// ── Job Class ─────────────────────────────────────────────────────────────
export type JobClass = { name: string; color: string; minLevel: number }

// ── Quest & SideQuest types ────────────────────────────────────────────────────

export type Quest = {
  id: string
  label: string
  detail: string
  xp: number
  gold: number
  type: 'training' | 'knowledge' | 'focus' | 'gps' | 'forbidden' | 'limit' | 'pomodoro'
  failed?: boolean
  currentValue?: number
  targetValue?: number
  done: boolean
  focusDuration?: number
  gpsTarget?: number
  pomodoroTarget?: number
  xpGained?: number
  goldGained?: number
  rank?: RankKey  // intrinsic quest difficulty — set at creation time
  rewards?: string[]
}

export type SideQuest = {
  id: string
  title: string
  done: boolean
  createdDate: string
  note?: string
}

export type PunishmentIntensity = 'light' | 'medium' | 'hardcore'
export type MissionDifficulty = 'easy' | 'normal' | 'hard'

export type GameSettings = {
  notifications: boolean
  sound: boolean
  punishmentIntensity: PunishmentIntensity
  missionDifficulty: MissionDifficulty
  restDay: boolean   // user-activated rest day for today
  lastFocusDuration: { hours: number; minutes: number }
  dynamicTheme: boolean // Rank-based theme colors
  autoBlockApps: boolean // Toggle automatic app blocking during penalties
  sideQuestPenalize: boolean // Whether uncompleted side quests trigger penalties
}

export const INITIAL_SETTINGS: GameSettings = {
  notifications: true,
  sound: true,
  punishmentIntensity: 'medium',
  missionDifficulty: 'normal',
  restDay: false,
  lastFocusDuration: { hours: 0, minutes: 25 },
  dynamicTheme: true,
  autoBlockApps: false,
  sideQuestPenalize: false,
}

export const INITIAL_SHOP_STOCKS: Record<string, number> = {
  system_pass: 5,
  lagrima_purificacao: 3,
}

export const INITIAL_PLAYER: Player = {
  name: 'Hunter',
  level: 1,
  xp: 0,
  gold: 0,
  strXp: 0, agiXp: 0, intXp: 0, vitXp: 0,
  str: 10, agi: 10, int: 10, vit: 10,
  inventory: [],
  currentStreak: 0,
  highestStreak: 0,
  shadows: [],
  activeShadowIds: [],
  dungeonKeys: [],
  maxLevelReached: 1,
  unlockedThemes: ['theme_e_rank'],
  activeThemeId: 'theme_e_rank',
}

// ── Shadow entry (owned shadow with level) ────────────────────────────────────

export type ShadowEntry = {
  id: string
  level: number
  isFavorite?: boolean
}

// ── Quest Definition (user-editable) ──────────────────────────────────────────
// {target} and {unit} are optional placeholders in `description`

export type QuestDefinition = {
  id: string
  title: string
  description: string
  /** Boss semanal: type boss e id sem prefixo normal_boss_. Portais periódicos: type boss e id normal_boss_* ou alpha_wolf / sea_king / … */
  type: 'core' | 'pool' | 'boss'
  questType: Quest['type']
  isDescending?: boolean
  baseTarget: number
  /** How much target increases per interval */
  scalingAmount: number
  /** Every how many levels the target increases (default 1) */
  scalingInterval: number
  /** For dynamic difficulty: a multiplier that increases based on level */
  dynamicScaling?: boolean
  /** @deprecated use scalingAmount + scalingInterval */
  scalingPerLevel?: number
  unit: string
  baseXP: number
  baseGold: number
  daysOfWeek?: number[]   // 0=Sun … 6=Sat; undefined = all days
  // Explicit difficulty rank override (auto-derived from XP if absent)
  rank?: RankKey
  rewards?: string[]
  // Boss-only fields
  bossClass?: 'A' | 'S' | 'Event' | 'Raid'
  shadowName?: string
  shadowIcon?: string
}

// ── Statistics ─────────────────────────────────────────────────────────────────

export type Statistics = {
  questsByRank: Record<RankKey, number>
  totalFocusMinutes: number
  perfectDays: number
  perfectDaysStreak: number
  totalCompleted: number
  totalGoldSpent: number
  sideQuestsCompletedToday: number
  /** Bosses completed — counted in questsByRank['A'] or ['S'] */
  totalBossesCompleted: number
  /** Side quests completed — counted in questsByRank by side quest rank */
  totalSideCompleted: number
  /** Pomodoro cycles completed today (resets at midnight) */
  pomodoroSessionsToday: number
  /** Total Pomodoro cycles ever completed */
  totalPomodoroSessions: number
}

export const INITIAL_STATS: Statistics = {
  questsByRank: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 },
  totalFocusMinutes: 0,
  perfectDays: 0,
  perfectDaysStreak: 0,
  totalCompleted: 0,
  totalGoldSpent: 0,
  sideQuestsCompletedToday: 0,
  totalBossesCompleted: 0,
  totalSideCompleted: 0,
  pomodoroSessionsToday: 0,
  totalPomodoroSessions: 0,
}

// ── Player ─────────────────────────────────────────────────────────────────────

export type InventoryEntry = { itemId: string; quantity: number }

export type Player = {
  rank?: RankLetter
  name: string
  level: number
  xp: number
  gold: number
  // Attribute XP (accumulated from quest completions)
  strXp: number
  agiXp: number
  intXp: number
  vitXp: number
  // Derived display values — always computed from xp fields via attrLevelFromXP()
  str: number
  agi: number
  int: number
  vit: number
  inventory: InventoryEntry[]
  currentStreak: number
  highestStreak: number
  shadows: ShadowEntry[]   // shadow entries with levels
  activeShadowIds: string[]        // ids of equipped (vanguard) shadows (max 3)
  dungeonKeys: string[]            // ids of unlocked dungeon master keys
  maxLevelReached: number          // anti-exploit: highest level ever attained
  unlockedThemes: string[]
  activeThemeId: string
}

export type ExtractionResult = {
  shadow: Shadow
  isLevelUp: boolean
  newLevel: number
  goldReward?: number
  success?: boolean
}

// ── System State ───────────────────────────────────────────────────────────────

export type SystemState = {
  focusModeActive: boolean
  hardcoreFocusMode: boolean
  hardcorePunished: boolean   // true = hardcore locked for the day (punishment)
  xpBoostNext: boolean
  hasPenalty: boolean
  penaltyReduced: boolean
  penaltyTriggered: boolean
  penaltyQuests: Quest[]
  blockedApps: string[]
  focusEndTime?: number
  weeklyTrainingCount: number
  weeklyRegenCount: number
  weeklyResetDate: string
  weeklyBossIds: string[]
  normalBossIds: string[]
  normalBossRotationDate: string
  bossDefeatedThisWeek: boolean
  weeklyDefeatedBossId?: string
  bossesDefeated: number
  shopStocks: Record<string, number>
  blockedAttemptTimestamps: number[]   // for spam detection
  extractionDoneToday: boolean
  penaltyBlockStart?: number  // ms timestamp when block starts (0/undefined = immediate or no block)
  penaltyBlockEnd: number     // ms timestamp when block lifts (0 = no timed block)
  eventBossKey: string
  eventBossCompletedIds: string[]
  eventBossRequired: number
  eventBossTotal: number
  eventBossDefeated: boolean
  lastPenaltyInfo?: {
    intensity: PunishmentIntensity
    failedCount: number
    totalCount: number
    xpLost: number
    goldLost?: number
  }
  tutorialPhase: 0 | 1 | 2   // 0=intro pending, 1=tab tour done, 2=level-10 done
  activeRaidBoss?: {
    defId: string
    maxHp: number
    currentHp: number
    endDate: number // epoch ms
  } | null
  consecutiveFails: number         // days failed in a row
  penaltyMissionsOwed: number      // pending missions the player must clear
  activeDungeonBreak?: {
    bossId: string
    startsAt?: number // epoch ms (optional legacy-safe)
    expiresAt: number // epoch ms
    source?: 'quest' | 'break'
  } | null
  portalDailyCount?: number
  portalLastRollHourKey?: string
  portalCooldownEnd?: number
  /** Map of passive skill type to last used timestamp (for weekly cooldowns) */
  usedShadowSkills?: Record<string, number>
  completedNormalBossIds: string[]
  pendingRaidExtractionId?: string
  pendingKeyId?: string | null  // key the player wants to use (set from Inventory, cleared by QuestScreen)
  keyLastUsedAt?: Record<string, number>  // keyId → epoch ms of last dungeon entry (for 24h cooldown)
  receivedKeyIds?: string[]  // box-exclusive key ids already received (prevents duplicate drops)
}

// ── Level Up Reward ────────────────────────────────────────────────────────────

export type LevelUpReward = {
  level: number
  items: string[]   // item IDs granted automatically
}

// ── Game State ─────────────────────────────────────────────────────────────────

export type GameState = {
  player: Player
  quests: Quest[]
  extraQuests: Quest[]
  sideQuests: SideQuest[]
  questDictionary: QuestDefinition[]
  customShadows: Shadow[]
  system: SystemState
  settings: GameSettings
  statistics: Statistics
  lastResetDate: string
  unlockedAchievements: string[]
  achievementProgress: Record<string, AchievementProg>
  questRecords: Record<string, { bestTime: number; lastNote: string; history?: Array<{ date: string; time: number; note: string }> }>
  questCompletions: Record<string, number>   // total times each quest was completed
  levelUpReward: LevelUpReward | null     // pending level-up item reward to show
  levelUpToast: number | null             // simple toast for every level-up (just the level number)
  jobChangeReward: JobClass | null        // pending job change reward to show
  lastExtraction: { shadow: Shadow; isLevelUp: boolean; newLevel: number } | null
  activeMissionTimers: Record<string, { startTime: number; accumulatedMs: number; isPaused: boolean }>
  rewardsQueue: { type: 'achievement' | 'shadow' | 'level_up' | 'job_change' | 'boss_defeated'; id: string; isLevelUp?: boolean; newLevel?: number; data?: any }[]
  extraQuestRerolledIds: string[]    // extra quest IDs (extra_…) that have been rerolled today
  extraQuestUsedPoolIds: string[]    // pool def IDs used in extra quests today (to avoid picking same def again)
  activeBuffs: {             // consumable-activated buffs with expiry
    id: string
    label: string
    multiplier: number       // e.g. 1.15 for +15%
    stat: 'xp' | 'gold'
    expiresAt: number        // epoch ms
  }[]
  newAchievementIds: string[]
  currentLootReward: { type: string; title: string; gold: number; xp: number; items: string[] } | null
}

export type TriggerPayload = Record<string, unknown>

export type GameActions = {
  rankUp: () => void
  bootSystem: () => void
  dismissPenaltyModal: () => void
  setPenaltyTriggered: (value: boolean) => void
  advanceTutorialPhase: () => void
  spawnRaidBoss: () => void
  dealRaidBossDamage: (dmg: number) => void
  checkRaidBoss: () => void
  clearExtraction: () => void
  completeQuest: (id: string) => { leveledUp: boolean }
  failQuest: (id: string) => void
  updateQuestValue: (id: string, value: number) => void
  skipQuest: (id: string) => void
  undoQuest: (id: string) => void
  addSideQuest: (title: string) => void
  completeSideQuest: (id: string) => { leveledUp: boolean }
  startSideQuest: (id: string, durationMinutes: number) => void
  updateSideQuestNote: (id: string, note: string) => void
  removeSideQuest: (id: string) => void
  toggleFavoriteShadow: (id: string) => void
  recordFocusTime: (minutes: number) => void
  recordPomodoroSession: () => void
  addXP: (amount: number) => { leveledUp: boolean }
  purchaseItem: (itemId: string, cost: number) => boolean
  purchaseShadow: (shadowId: string, cost: number) => boolean
  useInventoryItem: (itemId: string) => void
  addToInventory: (itemId: string, qty?: number) => void
  toggleBlockedApp: (pkg: string) => void
  setFocusModeActive: (v: boolean, endTimeMs?: number) => void
  setHardcoreFocusMode: (v: boolean) => void
  setHardcorePunished: (v: boolean) => void
  setXpBoostNext: (v: boolean) => void
  setPenaltyReduced: (v: boolean) => void
  removePenalty: () => void
  deductGold: (amount: number) => boolean
  defeatDungeonBoss: (shadowId: string, customDef?: { name: string; icon: string; questType: Quest['type'] }) => { xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean, isNew?: boolean }
  checkAndUnlockAchievements: () => void
  /** Triggered by useDayWatcher to handle midnight reset without reload */
  checkDailyReset: () => void
  /** Periodic dynamic portal roll: 30%/hour, no overlap, cooldown, daily cap */
  checkDynamicPortalSpawn: () => void
  triggerEvent: (event: EventTrigger, payload?: TriggerPayload, value?: number) => void
  emitEvent: (event: EventTrigger, value?: number) => void
  recordBlockedAttempt: () => void
  addQuestDefinition: (def: QuestDefinition) => void
  updateQuestDefinition: (id: string, def: Partial<QuestDefinition>) => void
  setActiveTheme: (themeId: string) => void
  deleteQuestDefinition: (id: string) => void
  regenerateSingleDailyQuest: (questId: string) => { success: boolean; reason?: string }
  replaceExtraQuest: (questId: string) => { success: boolean; reason?: string }
  generateExtraQuests: () => { success: boolean; reason?: string }
  completeExtraQuest: (id: string) => { leveledUp: boolean }
  updateSettings: (patch: Partial<GameSettings>) => void
  saveQuestRecord: (questId: string, time: number, note: string) => void
  dismissLevelUpReward: () => void
  dismissLevelUpToast: () => void
  dismissLootReward: () => void
  dismissJobChangeReward: () => void
  startMissionTimer: (id: string) => void
  pauseMissionTimer: (id: string) => void
  clearMissionTimer: (id: string) => void
  toggleActiveShadow: (id: string) => void
  releaseShadow: (id: string) => { gold: number }
  dismissExtraction: () => void
  setEventBossState: (key: string, required: number, total: number) => void
  completeEventTrial: (id: string, key: string, required: number, total: number) => { completed: number; required: number }
  markEventBossDefeated: (key: string) => void
  restoreBackup: (data: Partial<GameState>) => void
  popReward: () => void
  extractShadow: (shadowId: string) => void
  openLootBox: () => boolean
  enterDungeon: (keyId: string) => boolean
  applyBuff: (buff: { id: string; label: string; multiplier: number; stat: 'xp' | 'gold' }, duration: number) => void
  clearPendingRaidExtraction: () => void
  setPendingKeyMission: (keyId: string) => void
  clearPendingKeyMission: () => void
  clearActiveDungeonBreak: () => void
  resetExtraction: () => void
  dismissAchievement: () => void
}

// ── StoreRef (used by achievement helpers) ─────────────────────────────────────

export type StoreRef = {
  get: () => GameState & GameActions
  set: (fn: (s: GameState & GameActions) => Partial<GameState>) => void
}
