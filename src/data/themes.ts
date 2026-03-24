import { RankLetter } from '../store/useGameStore'

export type ThemeDef = {
  id: string
  name: string
  description: string
  unlockRank?: RankLetter // Unlocked automatically when reaching this rank
  isPremium?: boolean // Bought in shop
  colors: {
    bg: string
    panel: string
    border: string
    neonBlue: string // Primary accent (often blue, but can change color per theme)
    neonRed: string // Danger/Boss accent
    gold: string // Rewards/Premium accent
    purple: string // Epic/Shadow accent
    green: string // Success/Rest accent
    muted: string
    dimmed: string
  }
}

export const APP_THEMES: ThemeDef[] = [
  {
    id: 'theme_e_rank',
    name: 'E-Rank (Standard)',
    description: 'O tema base concedido a todos os Caçadores registados.',
    unlockRank: 'E',
    colors: {
      bg: '#050810',
      panel: '#0a0f1e',
      border: '#1e3a5f',
      neonBlue: '#00d4ff',
      neonRed: '#ef4444',
      gold: '#f59e0b',
      purple: '#a855f7',
      green: '#22c55e',
      muted: '#94a3b8',
      dimmed: '#64748b',
    }
  },
  {
    id: 'theme_d_rank',
    name: 'D-Rank (Verdejante)',
    description: 'Emana a energia da floresta das missões intermédias.',
    unlockRank: 'D',
    colors: {
      bg: '#020b06',
      panel: '#05160d',
      border: '#0f3c22',
      neonBlue: '#22c55e', // Primary becomes Green
      neonRed: '#ef4444',
      gold: '#f59e0b',
      purple: '#a855f7',
      green: '#10b981',
      muted: '#6ee7b7',
      dimmed: '#34d399',
    }
  },
  {
    id: 'theme_c_rank',
    name: 'C-Rank (Safira)',
    description: 'Frio e preciso como o gelo. Para caçadores táticos.',
    unlockRank: 'C',
    colors: {
      bg: '#020617',
      panel: '#0f172a',
      border: '#1e293b',
      neonBlue: '#3b82f6', // True Blue
      neonRed: '#ef4444',
      gold: '#fbbf24',
      purple: '#8b5cf6',
      green: '#10b981',
      muted: '#94a3b8',
      dimmed: '#475569',
    }
  },
  {
    id: 'theme_b_rank',
    name: 'B-Rank (Ametista)',
    description: 'A energia rúnica flui em abundância neste rank alto.',
    unlockRank: 'B',
    colors: {
      bg: '#110517',
      panel: '#1e0a29',
      border: '#3b124a',
      neonBlue: '#a855f7', // Primary becomes Purple
      neonRed: '#f43f5e',
      gold: '#fbbf24',
      purple: '#d946ef',
      green: '#22c55e',
      muted: '#d8b4e2',
      dimmed: '#a57cae',
    }
  },
  {
    id: 'theme_a_rank',
    name: 'A-Rank (Âmbar Solar)',
    description: 'Onde o ouro se transforma em poder. A Elite.',
    unlockRank: 'A',
    colors: {
      bg: '#170c02',
      panel: '#291705',
      border: '#5c3108',
      neonBlue: '#f59e0b', // Primary becomes Gold/Amber
      neonRed: '#dc2626',
      gold: '#fbbf24',
      purple: '#c084fc',
      green: '#16a34a',
      muted: '#fcd34d',
      dimmed: '#d97706',
    }
  },
  {
    id: 'theme_s_rank',
    name: 'S-Rank (Fúria Carmesim)',
    description: 'Apenas para aqueles cujo poder quebra a escala humana.',
    unlockRank: 'S',
    colors: {
      bg: '#140303',
      panel: '#260808',
      border: '#5c1010',
      neonBlue: '#ef4444', // Primary becomes Red
      neonRed: '#f87171',
      gold: '#f59e0b',
      purple: '#a855f7',
      green: '#22c55e',
      muted: '#fca5a5',
      dimmed: '#b91c1c',
    }
  },
  {
    id: 'theme_national',
    name: 'National (Limiar Divino)',
    description: 'A pura manifestação de energia que rivaliza com os governantes.',
    unlockRank: 'National',
    colors: {
      bg: '#000000',
      panel: '#0a0a0a',
      border: '#d4d4d4',
      neonBlue: '#ffffff', // Primary becomes White/Silver
      neonRed: '#ef4444',
      gold: '#fbbf24',
      purple: '#a855f7',
      green: '#22c55e',
      muted: '#a3a3a3',
      dimmed: '#525252',
    }
  },
  // PREMIUM THEMES
  {
    id: 'theme_monarch',
    name: 'Monarca das Sombras (Premium)',
    description: 'Ergue-te com o poder negro e roxo do governante dos mortos.',
    isPremium: true,
    colors: {
      bg: '#05010a',
      panel: '#0a0214',
      border: '#4c1d95',
      neonBlue: '#7c3aed',
      neonRed: '#b91c1c',
      gold: '#b45309',
      purple: '#6d28d9',
      green: '#047857',
      muted: '#a78bfa',
      dimmed: '#5b21b6',
    }
  },
  {
    id: 'theme_blood',
    name: 'Noite de Sangue (Premium)',
    description: 'Sedento e impiedoso. Um UI escarlate vibrante.',
    isPremium: true,
    colors: {
      bg: '#080000',
      panel: '#120000',
      border: '#7f1d1d',
      neonBlue: '#dc2626',
      neonRed: '#ea580c',
      gold: '#fcd34d',
      purple: '#db2777',
      green: '#16a34a',
      muted: '#fecaca',
      dimmed: '#991b1b',
    }
  }
]

export const THEME_MAP = Object.fromEntries(APP_THEMES.map(t => [t.id, t]))
