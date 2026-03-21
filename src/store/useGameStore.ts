import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── XP / Rank helpers ──────────────────────────────────────────────────────────

/** XP needed to level up from L to L+1  = 100 × L */
export function xpForLevel(level: number): number {
  return 100 * level
}

const RANKS = [
  { minLevel: 1,  rank: 'E', label: 'E-Rank', color: '#94a3b8' },
  { minLevel: 6,  rank: 'D', label: 'D-Rank', color: '#22c55e' },
  { minLevel: 11, rank: 'C', label: 'C-Rank', color: '#3b82f6' },
  { minLevel: 16, rank: 'B', label: 'B-Rank', color: '#a855f7' },
  { minLevel: 21, rank: 'A', label: 'A-Rank', color: '#f59e0b' },
  { minLevel: 26, rank: 'S', label: 'S-Rank', color: '#ef4444' },
]

export function getRank(level: number) {
  return [...RANKS].reverse().find(r => level >= r.minLevel) ?? RANKS[0]
}

function getQuestTier(level: number): 'E' | 'D' | 'C' | 'S' {
  if (level >= 21) return 'S'
  if (level >= 11) return 'C'
  if (level >= 6)  return 'D'
  return 'E'
}

// ── Quest generation ───────────────────────────────────────────────────────────

export type Quest = {
  id:            string
  label:         string
  detail:        string
  xp:            number
  gold:          number
  type:          'training' | 'knowledge' | 'focus' | 'gps'
  done:          boolean
  focusDuration?: number
  gpsTarget?:    number
}

const TIER_MULT: Record<string, number> = { E: 1, D: 1.5, C: 2.3, S: 3.5 }

function createDailyQuests(level: number): Quest[] {
  const tier = getQuestTier(level)
  const mult = TIER_MULT[tier]
  const m    = (n: number) => Math.round(n * mult)

  return [
    { id: 't1', label: 'Missão de Força',       detail: `${m(30)} push-ups + ${m(30)} squats`,             xp: m(40), gold: m(10), type: 'training',  done: false },
    { id: 't2', label: 'Missão de Resistência',  detail: `Prancha ${m(60)}s + ${m(20)} burpees`,            xp: m(35), gold: m(8),  type: 'training',  done: false },
    { id: 'k1', label: 'Missão de Conhecimento', detail: `Lê ${m(20)} páginas de um livro técnico`,         xp: m(30), gold: m(12), type: 'knowledge', done: false },
    { id: 'k2', label: 'Estudo Focado',          detail: `Deep work — ${m(30)} minutos`,                    xp: m(50), gold: m(20), type: 'focus',     done: false, focusDuration: m(30) * 60_000 },
    { id: 't3', label: 'Missão de Agilidade',    detail: `${m(10)} min saltos à corda / sprint`,            xp: m(25), gold: m(6),  type: 'training',  done: false },
    { id: 't4', label: 'Corrida do Sistema',     detail: `Corre ${(1.5 * mult).toFixed(1)} km`,             xp: m(60), gold: m(25), type: 'gps',       done: false, gpsTarget: parseFloat((1.5 * mult).toFixed(2)) },
  ]
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type RankKey = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

export type Statistics = {
  questsByRank:      Record<RankKey, number>
  totalFocusMinutes: number
  perfectDays:       number
  totalCompleted:    number
}

const INITIAL_STATS: Statistics = {
  questsByRank:      { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 },
  totalFocusMinutes: 0,
  perfectDays:       0,
  totalCompleted:    0,
}

export type InventoryEntry = { itemId: string; quantity: number }

export type Player = {
  name:      string
  level:     number
  xp:        number
  gold:      number
  str:       number
  agi:       number
  int:       number
  vit:       number
  inventory: InventoryEntry[]
}

export type SystemState = {
  focusModeActive:  boolean
  hasPenalty:       boolean
  penaltyReduced:   boolean  // Rest Scroll effect
  penaltyTriggered: boolean  // true = show scary modal this session
  penaltyQuests:    Quest[]
  blockedApps:      string[]
}

type GameState = {
  player:        Player
  quests:        Quest[]
  system:        SystemState
  statistics:    Statistics
  lastResetDate: string
}

type GameActions = {
  bootSystem:         () => void
  dismissPenaltyModal:() => void
  completeQuest:      (id: string) => { leveledUp: boolean }
  skipQuest:          (id: string) => void        // System Pass
  undoQuest:          (id: string) => void
  recordFocusTime:    (minutes: number) => void
  addXP:              (amount: number) => { leveledUp: boolean }
  purchaseItem:       (itemId: string, cost: number) => boolean
  useInventoryItem:   (itemId: string) => void
  addToInventory:     (itemId: string, qty?: number) => void
  toggleBlockedApp:   (pkg: string) => void
  setFocusModeActive: (v: boolean) => void
  setPenaltyReduced:  (v: boolean) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function applyXP(xp: number, level: number, amount: number) {
  const newXp    = xp + amount
  const xpNeeded = xpForLevel(level)
  if (newXp >= xpNeeded) {
    return { xp: newXp - xpNeeded, level: level + 1, leveledUp: true }
  }
  return { xp: newXp, level, leveledUp: false }
}

// ── Store ──────────────────────────────────────────────────────────────────────

const INITIAL_PLAYER: Player = {
  name: 'Hunter', level: 1, xp: 0, gold: 0,
  str: 10, agi: 10, int: 10, vit: 10, inventory: [],
}

const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      player:     INITIAL_PLAYER,
      quests:     createDailyQuests(1),
      statistics: INITIAL_STATS,
      system: {
        focusModeActive:  false,
        hasPenalty:       false,
        penaltyReduced:   false,
        penaltyTriggered: false,
        penaltyQuests:    [],
        blockedApps:      [],
      },
      lastResetDate: '',

      // ── Boot & penalty check ────────────────────────────────────────────────
      bootSystem() {
        const today = new Date().toDateString()
        const { lastResetDate, quests, player, system } = get()
        if (lastResetDate === today) return

        const allDone    = quests.length > 0 && quests.every(q => q.done)
        const hadPenalty = !allDone && lastResetDate !== ''

        let newXp    = player.xp
        let newLevel = player.level
        let penaltyTriggered = false

        if (hadPenalty) {
          // Deduct 20% XP (50% if Rest Scroll was used)
          const pct    = system.penaltyReduced ? 0.10 : 0.20
          const xpLost = Math.max(Math.floor(player.xp * pct), 10)
          newXp        = Math.max(player.xp - xpLost, 0)
          penaltyTriggered = true
        }

        set(s => ({
          quests:        createDailyQuests(s.player.level),
          lastResetDate: today,
          statistics: allDone
            ? { ...s.statistics, perfectDays: s.statistics.perfectDays + 1 }
            : s.statistics,
          player: {
            ...s.player,
            xp:    newXp,
            level: newLevel,
          },
          system: {
            ...s.system,
            hasPenalty:       hadPenalty,
            penaltyTriggered,
            penaltyReduced:   false,    // reset Rest Scroll effect each day
            penaltyQuests: hadPenalty
              ? [{ id: 'p1', label: 'Penalização: Cardio', detail: '20 min corrida contínua', xp: 0, gold: 0, type: 'training', done: false }]
              : [],
          },
        }))
      },

      dismissPenaltyModal() {
        set(s => ({ system: { ...s.system, penaltyTriggered: false } }))
      },

      // ── Complete quest ──────────────────────────────────────────────────────
      completeQuest(id) {
        let leveledUp = false
        set(s => {
          const quest = s.quests.find(q => q.id === id)
          if (!quest || quest.done) return {}

          const quests = s.quests.map(q => q.id === id ? { ...q, done: true } : q)
          const res    = applyXP(s.player.xp, s.player.level, quest.xp)
          leveledUp    = res.leveledUp

          const player: Player = {
            ...s.player,
            xp:    res.xp,
            level: res.level,
            gold:  s.player.gold + quest.gold,
            str:   s.player.str + (res.leveledUp ? 1 : 0),
            agi:   s.player.agi + (res.leveledUp ? 1 : 0),
            int:   s.player.int + (res.leveledUp ? 1 : 0),
            vit:   s.player.vit + (res.leveledUp ? 1 : 0),
          }

          const rank = getRank(s.player.level).rank as RankKey
          return {
            quests,
            player,
            statistics: {
              ...s.statistics,
              totalCompleted: s.statistics.totalCompleted + 1,
              questsByRank: { ...s.statistics.questsByRank, [rank]: s.statistics.questsByRank[rank] + 1 },
            },
          }
        })
        return { leveledUp }
      },

      // ── Skip quest (System Pass) ────────────────────────────────────────────
      skipQuest(id) {
        set(s => {
          const quest = s.quests.find(q => q.id === id)
          if (!quest || quest.done) return {}
          // Grants full XP/Gold as if normally completed
          const quests = s.quests.map(q => q.id === id ? { ...q, done: true } : q)
          const res    = applyXP(s.player.xp, s.player.level, quest.xp)
          return {
            quests,
            player: {
              ...s.player,
              xp:    res.xp,
              level: res.level,
              gold:  s.player.gold + quest.gold,
              str:   s.player.str + (res.leveledUp ? 1 : 0),
              agi:   s.player.agi + (res.leveledUp ? 1 : 0),
              int:   s.player.int + (res.leveledUp ? 1 : 0),
              vit:   s.player.vit + (res.leveledUp ? 1 : 0),
            },
            statistics: {
              ...s.statistics,
              totalCompleted: s.statistics.totalCompleted + 1,
            },
          }
        })
      },

      // ── Undo quest ──────────────────────────────────────────────────────────
      undoQuest(id) {
        set(s => {
          const quest = s.quests.find(q => q.id === id)
          if (!quest?.done) return {}
          const quests = s.quests.map(q => q.id === id ? { ...q, done: false } : q)

          const intel  = s.player.int
          let { xp, level, gold, str, agi, vit } = s.player
          gold = Math.max(gold - quest.gold, 0)

          let newXp = xp - quest.xp
          let newLevel = level
          let leveledDown = false
          if (newXp < 0 && newLevel > 1) {
            newLevel--
            newXp       = xpForLevel(newLevel) + newXp
            leveledDown = true
          }

          return {
            quests,
            statistics: { ...s.statistics, totalCompleted: Math.max(s.statistics.totalCompleted - 1, 0) },
            player: {
              ...s.player,
              xp:    Math.max(newXp, 0),
              level: newLevel,
              gold,
              str:   leveledDown ? Math.max(str   - 1, 10) : str,
              agi:   leveledDown ? Math.max(agi   - 1, 10) : agi,
              int:   leveledDown ? Math.max(intel - 1, 10) : intel,
              vit:   leveledDown ? Math.max(vit   - 1, 10) : vit,
            },
          }
        })
      },

      // ── Add XP (item effect) ────────────────────────────────────────────────
      addXP(amount) {
        let leveledUp = false
        set(s => {
          const res = applyXP(s.player.xp, s.player.level, amount)
          leveledUp = res.leveledUp
          return {
            player: {
              ...s.player,
              xp:    res.xp,
              level: res.level,
              str:   s.player.str + (res.leveledUp ? 1 : 0),
              agi:   s.player.agi + (res.leveledUp ? 1 : 0),
              int:   s.player.int + (res.leveledUp ? 1 : 0),
              vit:   s.player.vit + (res.leveledUp ? 1 : 0),
            },
          }
        })
        return { leveledUp }
      },

      // ── Focus stats ─────────────────────────────────────────────────────────
      recordFocusTime(minutes) {
        set(s => ({
          statistics: { ...s.statistics, totalFocusMinutes: s.statistics.totalFocusMinutes + minutes },
        }))
      },

      // ── Inventory / Shop ────────────────────────────────────────────────────
      purchaseItem(itemId, cost) {
        if (get().player.gold < cost) return false
        set(s => {
          const inv = [...s.player.inventory]
          const idx = inv.findIndex(e => e.itemId === itemId)
          if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + 1 }
          else          inv.push({ itemId, quantity: 1 })
          return { player: { ...s.player, gold: s.player.gold - cost, inventory: inv } }
        })
        return true
      },

      useInventoryItem(itemId) {
        set(s => {
          const inv = s.player.inventory
            .map(e => e.itemId === itemId ? { ...e, quantity: e.quantity - 1 } : e)
            .filter(e => e.quantity > 0)
          return { player: { ...s.player, inventory: inv } }
        })
      },

      addToInventory(itemId, qty = 1) {
        set(s => {
          const inv = [...s.player.inventory]
          const idx = inv.findIndex(e => e.itemId === itemId)
          if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + qty }
          else          inv.push({ itemId, quantity: qty })
          return { player: { ...s.player, inventory: inv } }
        })
      },

      // ── System ──────────────────────────────────────────────────────────────
      setFocusModeActive(v) {
        set(s => ({ system: { ...s.system, focusModeActive: v } }))
      },

      setPenaltyReduced(v) {
        set(s => ({ system: { ...s.system, penaltyReduced: v } }))
      },

      toggleBlockedApp(pkg) {
        set(s => {
          const apps = s.system.blockedApps.includes(pkg)
            ? s.system.blockedApps.filter(p => p !== pkg)
            : [...s.system.blockedApps, pkg]
          return { system: { ...s.system, blockedApps: apps } }
        })
      },
    }),
    {
      name:    'solo-leveling-v3',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist everything relevant — quests are intentionally session-only
      // (reset daily), but player, stats, system config must survive restarts
      partialize: s => ({
        player:        s.player,
        system:        {
          ...s.system,
          penaltyTriggered: false,   // never persist the modal-trigger flag
        },
        statistics:    s.statistics,
        lastResetDate: s.lastResetDate,
      }),
    }
  )
)

export default useGameStore
