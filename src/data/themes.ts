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
    // Semantic tokens for dynamic theming
    surface: {
      base: string
      elevated: string
      overlay: string
    }
    state: {
      warningBg: string
      successBg: string
      errorBg: string
    }
    text: {
      primary: string
      secondary: string
      muted: string
      inverse: string
    }
  }
}

export const APP_THEMES: ThemeDef[] = [
  {
    id: 'theme_e_rank',
    name: 'E-Rank (Standard)',
    description: 'O tema base concedido a todos os Caçadores registados.',
    unlockRank: 'E',
    colors: {
      bg: '#12121A',
      panel: '#1E1E28',
      border: '#2A2A3A',
      neonBlue: '#00d4ff',
      neonRed: '#E63946',
      gold: '#f59e0b',
      purple: '#7B2CBF',
      green: '#22c55e',
      muted: '#8E8E9F',
      dimmed: '#5A5A6E',
      // Semantic tokens
      surface: {
        base: '#1E1E28',
        elevated: '#252535',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#E6394620'
      },
      text: {
        primary: '#E0E0E6',
        secondary: '#8E8E9F',
        muted: '#8E8E9F',
        inverse: '#12121A'
      }
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
      muted: '#94a3b8',
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#05160d',
        elevated: '#064e3b',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#f0fdf4',
        secondary: '#dcfce7',
        muted: '#94a3b8',
        inverse: '#020b06'
      }
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
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#0f172a',
        elevated: '#1e293b',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#f8fafc',
        secondary: '#e2e8f0',
        muted: '#94a3b8',
        inverse: '#020617'
      }
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
      muted: '#94a3b8',
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#1e0a29',
        elevated: '#581c87',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#faf5ff',
        secondary: '#f3e8ff',
        muted: '#94a3b8',
        inverse: '#110517'
      }
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
      muted: '#94a3b8',
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#291705',
        elevated: '#78350f',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#fef3c7',
        secondary: '#fde68a',
        muted: '#94a3b8',
        inverse: '#170c02'
      }
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
      muted: '#94a3b8',
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#260808',
        elevated: '#7f1d1d',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#fef2f2',
        secondary: '#fee2e2',
        muted: '#94a3b8',
        inverse: '#140303'
      }
    }
  },
  {
    id: 'theme_national',
    name: 'National (Limiar Divino)',
    description: 'A pura manifestação de energia que rivaliza com os governantes.',
    unlockRank: 'National',
    colors: {
      bg: '#0D0D12',
      panel: '#181820',
      border: '#d4d4d4',
      neonBlue: '#e8e8f0', // Primary becomes Silver-White (softer than pure white)
      neonRed: '#ef4444',
      gold: '#fbbf24',
      purple: '#a855f7',
      green: '#22c55e',
      muted: '#8E8E9F',
      dimmed: '#5A5A6E',
      // Semantic tokens
      surface: {
        base: '#181820',
        elevated: '#22222E',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#E0E0E6',
        secondary: '#8E8E9F',
        muted: '#8E8E9F',
        inverse: '#0D0D12'
      }
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
      muted: '#94a3b8',
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#0a0214',
        elevated: '#1e1b4b',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#faf5ff',
        secondary: '#ede9fe',
        muted: '#94a3b8',
        inverse: '#05010a'
      }
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
      muted: '#94a3b8',
      dimmed: '#64748b',
      // Semantic tokens
      surface: {
        base: '#120000',
        elevated: '#450a0a',
        overlay: '#00000099'
      },
      state: {
        warningBg: '#f59e0b20',
        successBg: '#22c55e20',
        errorBg: '#ef444420'
      },
      text: {
        primary: '#fef2f2',
        secondary: '#fee2e2',
        muted: '#94a3b8',
        inverse: '#080000'
      }
    }
  }
]

export const THEME_MAP = Object.fromEntries(APP_THEMES.map(t => [t.id, t]))
