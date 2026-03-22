export type RaidBossRank = 'B' | 'A' | 'S' | 'National'

export type RaidBossDef = {
  id: string
  name: string
  rank: RaidBossRank
  baseHp: number
  durationDays: number
  icon: string
  color: string
}

export const RAID_BOSSES: RaidBossDef[] = [
  // ── RANK B ────────────────────────────────────────────────────────────────
  {
    id: 'steel_fanged_lycan',
    name: 'Lobo de Presas de Aço',
    rank: 'B',
    baseHp: 1800,
    durationDays: 3,
    icon: 'wolf',
    color: '#94a3b8'
  },
  {
    id: 'hobgoblin_chieftain',
    name: 'Chefe Hobgoblin',
    rank: 'B',
    baseHp: 2200,
    durationDays: 3,
    icon: 'skull',
    color: '#84cc16'
  },
  {
    id: 'twin_headed_ogre',
    name: 'Ogre de Duas Cabeças',
    rank: 'B',
    baseHp: 2800,
    durationDays: 4,
    icon: 'account-multiple',
    color: '#b91c1c'
  },

  // ── RANK A ────────────────────────────────────────────────────────────────
  {
    id: 'giant_ice_bear',
    name: 'Tank, o Urso de Gelo Gigante',
    rank: 'A',
    baseHp: 5000,
    durationDays: 4,
    icon: 'bear',
    color: '#38bdf8'
  },
  {
    id: 'high_orc_guard',
    name: 'Guarda Real de Elite High Orc',
    rank: 'A',
    baseHp: 6000,
    durationDays: 4,
    icon: 'sword',
    color: '#ef4444'
  },
  {
    id: 'naga_general',
    name: 'General Naga do Abismo',
    rank: 'A',
    baseHp: 7500,
    durationDays: 5,
    icon: 'water',
    color: '#0ea5e9'
  },

  // ── RANK S ────────────────────────────────────────────────────────────────
  {
    id: 'demon_king_baran',
    name: 'Baran, o Rei dos Demónios',
    rank: 'S',
    baseHp: 18000,
    durationDays: 5,
    icon: 'fire',
    color: '#ea580c'
  },
  {
    id: 'monarch_querehsha',
    name: 'Querehsha, Monarca das Pragas',
    rank: 'S',
    baseHp: 22000,
    durationDays: 6,
    icon: 'bug',
    color: '#a855f7'
  },
  {
    id: 'monarch_silad',
    name: 'Silad, o Monarca do Gelo',
    rank: 'S',
    baseHp: 30000,
    durationDays: 7,
    icon: 'snowflake',
    color: '#60a5fa'
  },
  {
    id: 'architect_system',
    name: 'O Arquiteto do Sistema',
    rank: 'S',
    baseHp: 40000,
    durationDays: 7,
    icon: 'chess-king',
    color: '#fbbf24'
  },

  // ── NATIONAL / MONARCHS ───────────────────────────────────────────────────
  {
    id: 'monarch_rakan',
    name: 'Rakan, o Monarca das Bestas',
    rank: 'National',
    baseHp: 70000,
    durationDays: 8,
    icon: 'paw',
    color: '#f97316'
  },
  {
    id: 'monarch_legia',
    name: 'Legia, o Monarca dos Gigantes',
    rank: 'National',
    baseHp: 90000,
    durationDays: 10,
    icon: 'weight-lifter',
    color: '#dc2626'
  },
  {
    id: 'monarch_antares',
    name: 'Antares, o Monarca da Destruição',
    rank: 'National',
    baseHp: 150000,
    durationDays: 14,
    icon: 'fire-circle',
    color: '#991b1b'
  },

  // ── LEGION OF LEGENDS (Crossover Easter Eggs) ──────────────────────────────
  {
    id: 'rathalos_sky',
    name: 'O Soberano dos Céus Escarlates',
    rank: 'S',
    baseHp: 35000,
    durationDays: 6,
    icon: 'dragon',
    color: '#b91c1c'
  },
  {
    id: 'kurama_spirit',
    name: 'Divindade do Ódio Primordial',
    rank: 'S',
    baseHp: 45000,
    durationDays: 7,
    icon: 'fox',
    color: '#ea580c'
  },
  {
    id: 'malenia_blade',
    name: 'A Lâmina da Podridão Escarlate',
    rank: 'National',
    baseHp: 100000,
    durationDays: 9,
    icon: 'sword-cross',
    color: '#7c2d12'
  },
  {
    id: 'lich_king_arthas',
    name: 'O Senhor do Trono Congelante',
    rank: 'National',
    baseHp: 140000,
    durationDays: 12,
    icon: 'crown',
    color: '#0ea5e9'
  },
  {
    id: 'sephiroth_angel',
    name: 'O Arauto da Asa Negra',
    rank: 'National',
    baseHp: 180000,
    durationDays: 14,
    icon: 'feather',
    color: '#475569'
  },
  {
    id: 'acnologia_chaos',
    name: 'O Vórtice do Apocalipse Dracónico',
    rank: 'National',
    baseHp: 250000,
    durationDays: 18,
    icon: 'volcano',
    color: '#1e293b'
  },
  {
    id: 'morgoth_abyss',
    name: 'O Primeiro Senhor do Abismo',
    rank: 'National',
    baseHp: 400000,
    durationDays: 25,
    icon: 'skull-crossbones',
    color: '#000000'
  },
]
