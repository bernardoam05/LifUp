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
    icon: 'dog',
    color: '#94a3b8',
  },
  {
    id: 'hobgoblin_chieftain',
    name: 'Chefe Hobgoblin',
    rank: 'B',
    baseHp: 2200,
    durationDays: 3,
    icon: 'skull',
    color: '#84cc16',
  },
  {
    id: 'twin_headed_ogre',
    name: 'Ogre de Duas Cabeças',
    rank: 'B',
    baseHp: 2800,
    durationDays: 4,
    icon: 'account-multiple',
    color: '#b91c1c',
  },

  // ── RANK A ────────────────────────────────────────────────────────────────
  {
    id: 'giant_ice_bear',
    name: 'Tank, o Urso de Gelo Gigante',
    rank: 'A',
    baseHp: 5000,
    durationDays: 4,
    icon: 'dog',
    color: '#38bdf8',
  },
  {
    id: 'high_orc_guard',
    name: 'Guarda Real de Elite High Orc',
    rank: 'A',
    baseHp: 6000,
    durationDays: 4,
    icon: 'sword',
    color: '#ef4444',
  },
  {
    id: 'naga_general',
    name: 'General Naga do Abismo',
    rank: 'A',
    baseHp: 7500,
    durationDays: 5,
    icon: 'water',
    color: '#0ea5e9',
  },

  // ── RANK S ────────────────────────────────────────────────────────────────
  {
    id: 'infernal_monarch',
    name: 'Monarca Infernal',
    rank: 'S',
    baseHp: 18000,
    durationDays: 5,
    icon: 'fire',
    color: '#ea580c',
  },
  {
    id: 'plague_sovereign',
    name: 'Soberana das Pragas',
    rank: 'S',
    baseHp: 22000,
    durationDays: 6,
    icon: 'bug',
    color: '#a855f7',
  },
  {
    id: 'frost_sovereign',
    name: 'Soberano do Gelo Eterno',
    rank: 'S',
    baseHp: 30000,
    durationDays: 7,
    icon: 'snowflake',
    color: '#60a5fa',
  },
  {
    id: 'architect_system',
    name: 'O Arquiteto do Sistema',
    rank: 'S',
    baseHp: 40000,
    durationDays: 7,
    icon: 'chess-king',
    color: '#fbbf24',
  },

  // ── NATIONAL / MONARCHS ───────────────────────────────────────────────────
  {
    id: 'beast_sovereign',
    name: 'Soberano das Feras',
    rank: 'National',
    baseHp: 70000,
    durationDays: 8,
    icon: 'paw',
    color: '#f97316',
  },
  {
    id: 'giant_sovereign',
    name: 'Soberano dos Gigantes',
    rank: 'National',
    baseHp: 90000,
    durationDays: 10,
    icon: 'weight-lifter',
    color: '#dc2626',
  },
  {
    id: 'void_sovereign',
    name: 'Soberano da Destruição Total',
    rank: 'National',
    baseHp: 150000,
    durationDays: 14,
    icon: 'fire-circle',
    color: '#991b1b',
  },

  // ── LEGION OF LEGENDS (Crossover Easter Eggs) ──────────────────────────────
  {
    id: 'rathalos_sky',
    name: 'O Soberano dos Céus Escarlates',
    rank: 'S',
    baseHp: 35000,
    durationDays: 6,
    icon: 'dinosaur',
    color: '#b91c1c',
  },
  {
    id: 'primal_fox_deity',
    name: 'Divindade do Ódio Primordial',
    rank: 'S',
    baseHp: 45000,
    durationDays: 7,
    icon: 'dog-side',
    color: '#ea580c',
  },
  {
    id: 'malenia_blade',
    name: 'A Lâmina da Podridão Escarlate',
    rank: 'National',
    baseHp: 100000,
    durationDays: 9,
    icon: 'sword-cross',
    color: '#7c2d12',
  },
  {
    id: 'frozen_throne_king',
    name: 'O Senhor do Trono Congelante',
    rank: 'National',
    baseHp: 140000,
    durationDays: 12,
    icon: 'crown',
    color: '#0ea5e9',
  },
  {
    id: 'dark_wing_herald',
    name: 'O Arauto da Asa Negra',
    rank: 'National',
    baseHp: 180000,
    durationDays: 14,
    icon: 'feather',
    color: '#475569',
  },
  {
    id: 'void_dragon_chaos',
    name: 'O Vórtice do Apocalipse Dracónico',
    rank: 'National',
    baseHp: 250000,
    durationDays: 18,
    icon: 'fire-alert',
    color: '#1e293b',
  },
  {
    id: 'primordial_abyss_lord',
    name: 'O Primeiro Senhor do Abismo',
    rank: 'National',
    baseHp: 400000,
    durationDays: 25,
    icon: 'skull-crossbones',
    color: '#000000',
  },
  // ── NEW RAID BOSSES (BATCH 1) ──────────────────────────────────────────────
  {
    id: 'undead_legionnaire',
    name: 'Legionário Morto-Vivo',
    rank: 'B', baseHp: 2400, durationDays: 3, icon: 'skull-outline', color: '#94a3b8',
  },
  {
    id: 'mountain_troll_brute',
    name: 'Troll da Montanha Enfurecido',
    rank: 'B', baseHp: 3000, durationDays: 3, icon: 'mace', color: '#94a3b8',
  },
  {
    id: 'inferno_hound_alpha',
    name: 'Cão Infernal Alfa',
    rank: 'B', baseHp: 2100, durationDays: 3, icon: 'dog-side', color: '#94a3b8',
  },
  {
    id: 'cave_horror_spider',
    name: 'Horror das Cavernas',
    rank: 'B', baseHp: 2600, durationDays: 4, icon: 'spider', color: '#94a3b8',
  },
  {
    id: 'high_orc_raider',
    name: 'Saqueador High Orc',
    rank: 'A', baseHp: 5500, durationDays: 4, icon: 'axe', color: '#ef4444',
  },
  {
    id: 'dark_elf_assassin_leader',
    name: 'Líder Assassino Elfo Negro',
    rank: 'A', baseHp: 6500, durationDays: 4, icon: 'knife-military', color: '#38bdf8',
  },
  {
    id: 'harpy_matriarch',
    name: 'Matriarca Harpia',
    rank: 'A', baseHp: 5800, durationDays: 4, icon: 'feather', color: '#a855f7',
  },
  {
    id: 'chimera_of_waste',
    name: 'Quimera do Ermo',
    rank: 'A', baseHp: 7800, durationDays: 5, icon: 'snake', color: '#f59e0b',
  },
  {
    id: 'vampire_noble_valerius',
    name: 'Nobre Vampiro Valerius',
    rank: 'S', baseHp: 19000, durationDays: 5, icon: 'bat', color: '#ef4444',
  },
  {
    id: 'archdemon_malphas',
    name: 'Malphas, o Arquidemónio',
    rank: 'S', baseHp: 25000, durationDays: 6, icon: 'emoticon-devil', color: '#b91c1c',
  },
  {
    id: 'abyssal_kraken_tentacle',
    name: 'Tentáculo do Kraken Abissal',
    rank: 'S', baseHp: 21000, durationDays: 5, icon: 'water-percent', color: '#0ea5e9',
  },
  {
    id: 'ancient_guardian_statue',
    name: 'Estátua do Guardião Ancestral',
    rank: 'S', baseHp: 35000, durationDays: 7, icon: 'controller-classic-outline', color: '#fbbf24',
  },
  {
    id: 'spectral_lich_king_shadow',
    name: 'Rei Lich Espectral',
    rank: 'S', baseHp: 32000, durationDays: 6, icon: 'ghost-outline', color: '#a855f7',
  },
  {
    id: 'stone_giant_sovereign',
    name: 'Soberano Ancestral dos Gigantes',
    rank: 'National', baseHp: 85000, durationDays: 9, icon: 'weight-lifter', color: '#dc2626',
  },
  {
    id: 'frost_sovereign_true',
    name: 'Soberano do Gelo (Forma Verdadeira)',
    rank: 'National', baseHp: 110000, durationDays: 10, icon: 'snowflake-alert', color: '#60a5fa',
  },
  {
    id: 'titan_champion_sim',
    name: 'Campeão Titã (Simulação)',
    rank: 'National', baseHp: 160000, durationDays: 12, icon: 'arm-flex', color: '#facc15',
  },
  {
    id: 'void_dragon_general',
    name: 'General Draconiano do Vazio',
    rank: 'National', baseHp: 130000, durationDays: 11, icon: 'dinosaur-variant', color: '#991b1b',
  },
  {
    id: 'abyssal_void_walker',
    name: 'Caminhante do Vazio Primordial',
    rank: 'National', baseHp: 200000, durationDays: 15, icon: 'eye-off-outline', color: '#1e293b',
  },
  {
    id: 'seraphim_fallen_angel',
    name: 'Serafim, o Anjo Caído',
    rank: 'National', baseHp: 220000, durationDays: 16, icon: 'alpha-s-circle', color: '#fbbf24',
  },
  {
    id: 'monarch_of_beginnings',
    name: 'Monarca dos Primórdios',
    rank: 'National', baseHp: 500000, durationDays: 30, icon: 'infinity', color: '#000000',
  },
  // ── NEW KEY-GATED BOSSES (BATCH 2) ─────────────────────────────────────────
  {
    id: 'key_boss_basilisk',
    name: 'Basilisco das Sombras',
    rank: 'A', baseHp: 7000, durationDays: 4, icon: 'snake', color: '#84cc16',
  },
  {
    id: 'key_boss_manticore',
    name: 'Manticora do Abismo',
    rank: 'A', baseHp: 8000, durationDays: 5, icon: 'cat', color: '#ef4444',
  },
  {
    id: 'key_boss_phoenix_rebirth',
    name: 'Fénix da Renascença Sombria',
    rank: 'S', baseHp: 22000, durationDays: 6, icon: 'fire', color: '#ea580c',
  },
  {
    id: 'key_boss_beholder_eye',
    name: 'Observador do Caos',
    rank: 'S', baseHp: 26000, durationDays: 6, icon: 'eye', color: '#a855f7',
  },
  {
    id: 'key_boss_demon_prince_astaroth',
    name: 'Príncipe Demónio Astaroth',
    rank: 'S', baseHp: 30000, durationDays: 7, icon: 'emoticon-devil', color: '#b91c1c',
  },
  {
    id: 'key_boss_undead_dragon_king',
    name: 'Rei Dragão Morto-Vivo',
    rank: 'S', baseHp: 45000, durationDays: 8, icon: 'dinosaur', color: '#475569',
  },
  {
    id: 'key_boss_titania_queen_dark',
    name: 'Rainha das Fadas Corrompida',
    rank: 'S', baseHp: 28000, durationDays: 7, icon: 'butterfly', color: '#fb7185',
  },
  {
    id: 'key_boss_anubis_guardian_soul',
    name: 'Anúbis, Guardião das Almas',
    rank: 'S', baseHp: 35000, durationDays: 7, icon: 'head-snowflake-outline', color: '#fbbf24',
  },
  {
    id: 'key_boss_cerberus_gate_final',
    name: 'Cérbero, o Porteiro do Inferno',
    rank: 'S', baseHp: 38000, durationDays: 8, icon: 'dog-side', color: '#dc2626',
  },
  {
    id: 'key_boss_medusa_queen_gaze',
    name: 'Medusa, a Rainha das Serpentes',
    rank: 'S', baseHp: 32000, durationDays: 7, icon: 'snake', color: '#22c55e',
  },
  {
    id: 'key_boss_hydra_ancient_world',
    name: 'Hidra Ancestral Proibida',
    rank: 'National', baseHp: 120000, durationDays: 12, icon: 'waves', color: '#0ea5e9',
  },
  {
    id: 'key_boss_fenrir_wolf_star',
    name: 'Fenrir, o Devorador de Estrelas',
    rank: 'National', baseHp: 180000, durationDays: 14, icon: 'dog-side', color: '#f97316',
  },
  {
    id: 'key_boss_odin_simulation_valhalla',
    name: 'Odin (Simulação do Sistema)',
    rank: 'National', baseHp: 250000, durationDays: 18, icon: 'eye-circle-outline', color: '#fbbf24',
  },
  {
    id: 'key_boss_zeus_simulation_olympus',
    name: 'Zeus (Simulação do Sistema)',
    rank: 'National', baseHp: 280000, durationDays: 20, icon: 'lightning-bolt-circle', color: '#60a5fa',
  },
  {
    id: 'key_boss_cthulhu_spawn_outer',
    name: 'Prole do Infinito (Spawn de Cthulhu)',
    rank: 'National', baseHp: 400000, durationDays: 25, icon: 'octagram-outline', color: '#047857',
  },
  // ── NEW DUNGEON BREAK BOSSES (BATCH 3) ─────────────────────────────────────
  {
    id: 'break_boss_lich_servant_vanguard',
    name: 'Vanguarda do Rei Lich',
    rank: 'B', baseHp: 2800, durationDays: 3, icon: 'skull-scan', color: '#94a3b8',
  },
  {
    id: 'break_boss_giant_worm_abyss',
    name: 'Verme Gigante do Abismo',
    rank: 'B', baseHp: 3200, durationDays: 3, icon: 'caterpillar', color: '#94a3b8',
  },
  {
    id: 'break_boss_dark_knight_traitor',
    name: 'Cavaleiro Negro Traidor',
    rank: 'B', baseHp: 3500, durationDays: 4, icon: 'sword-cross', color: '#94a3b8',
  },
  {
    id: 'break_boss_succubus_scout_night',
    name: 'Batedora Succubus da Noite',
    rank: 'A', baseHp: 6000, durationDays: 4, icon: 'heart-broken', color: '#fb7185',
  },
  {
    id: 'break_boss_gargoyle_watcher_stone',
    name: 'Gárgula Vigia de Pedra',
    rank: 'A', baseHp: 7000, durationDays: 4, icon: 'mace', color: '#94a3b8',
  },
  {
    id: 'break_boss_orc_shaman_ritual_corrupt',
    name: 'Xamã Orc Corrompido',
    rank: 'A', baseHp: 6500, durationDays: 4, icon: 'flash', color: '#b91c1c',
  },
  {
    id: 'break_boss_ice_troll_frost_bite',
    name: 'Troll de Gelo (Mordida Gélida)',
    rank: 'A', baseHp: 7500, durationDays: 5, icon: 'snowflake', color: '#38bdf8',
  },
  {
    id: 'break_boss_fire_spirit_ember',
    name: 'Espírito de Brasas Infernais',
    rank: 'A', baseHp: 8000, durationDays: 5, icon: 'fire', color: '#ea580c',
  },
  {
    id: 'break_boss_void_wraith_silent',
    name: 'Wraith do Vazio Silencioso',
    rank: 'S', baseHp: 24000, durationDays: 6, icon: 'ghost', color: '#64748b',
  },
  {
    id: 'break_boss_corrupted_monk_temple',
    name: 'Monge Corrompido do Templo',
    rank: 'S', baseHp: 28000, durationDays: 7, icon: 'hands-pray', color: '#fbbf24',
  },
  {
    id: 'break_boss_abyssal_beast_chimera',
    name: 'Besta Abissal (Quimera Negra)',
    rank: 'S', baseHp: 35000, durationDays: 7, icon: 'dog-side', color: '#ef4444',
  },
  {
    id: 'break_boss_chaos_reaper_final',
    name: 'Ceifador do Caos Final',
    rank: 'S', baseHp: 40000, durationDays: 8, icon: 'skull', color: '#b91c1c',
  },
  {
    id: 'break_boss_ancient_machine_core',
    name: 'Núcleo da Máquina Ancestral',
    rank: 'S', baseHp: 42000, durationDays: 8, icon: 'engine', color: '#94a3b8',
  },
  {
    id: 'break_boss_star_spawn_void',
    name: 'Prole das Estrelas (Vazio)',
    rank: 'National', baseHp: 150000, durationDays: 12, icon: 'star-four-points', color: '#a855f7',
  },
  {
    id: 'break_boss_monarch_shadow_clone_sim',
    name: 'Clone Sombrio do Monarca (Simulação)',
    rank: 'National', baseHp: 300000, durationDays: 20, icon: 'account-question', color: '#000000',
  },
];

// ── Quest & Event Types ───────────────────────────────────────────────────────

import { Quest } from '../store/useGameStore';

export type DungeonMission = {
  id: string
  label: string
  detail: string
  type: Quest['type']
  gpsTarget?: number
  focusDuration?: number
  shadowHint: string
  icon: string
  color: string
  eventName?: string
  eventKey?: string
  isEventTrial?: boolean
  isEventBoss?: boolean
  category?: 'dungeon' | 'dungeon_break' | 'event' | 'key' | 'raid'
  // For custom bosses created in Forge
  customShadow?: { name: string; icon: string; questType: Quest['type'] }
}

export const getDailyBossMissions = (C: any, now: Date = new Date()): DungeonMission[] => {
  const [m, d, y] = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
  const base = new Date(y, m - 1, d);
  const dayIndex = Math.floor(base.getTime() / 86400000);

  const boss = RAID_BOSSES[dayIndex % RAID_BOSSES.length];
  const focusMap: Record<string, number> = { B: 45, A: 60, S: 90, National: 120 };
  const duration = focusMap[boss.rank] || 30;

  // Deterministic creative description per boss/rank
  const detailByRank: Record<string, string[]> = {
    B: [
      `${duration} min de foco contínuo para fechar este portal. ${boss.name} não espera que estejas "a ganhar disposição".`,
      `Sessão de trabalho de ${duration} min sem desvios. O portal de Rank B testa a tua consistência diária.`,
      `${duration} min de concentração ininterrupta. Fecha o portal de ${boss.name} antes que colapse para o mundo real.`,
    ],
    A: [
      `${duration} min de imersão total. ${boss.name} comanda este portal de Rank A — foco de elite, sem pausas.`,
      `Sessão de deep work de ${duration} min. Sem notificações. Sem pausas. O portal de ${boss.name} não aceita meias medidas.`,
      `${duration} min de trabalho profundo no teu projeto mais importante. O portal de ${boss.name} fecha com disciplina, não com intenção.`,
    ],
    S: [
      `${duration} min de trabalho de máxima intensidade. ${boss.name} é S-Rank — o teu esforço deve ser também.`,
      `Imersão absoluta por ${duration} min. Define um entregável concreto antes de começar — o portal S-Rank exige resultados.`,
      `${duration} min de foco total no teu desafio mais difícil do dia. ${boss.name} mede-se em execução, não em intenções.`,
    ],
    National: [
      `${duration} min de foco de Nível Nacional. ${boss.name} representa a mais alta ameaça — o teu melhor é o mínimo aceite.`,
      `Imersão de ${duration} min: define o objetivo, elimina tudo o resto. O Monarca não perdoa distrações.`,
      `${duration} min de deep work de elite. ${boss.name} aguarda — apenas uma mente inabalável fecha este portal.`,
    ],
  };
  const pool = detailByRank[boss.rank] ?? detailByRank.A;
  let hash = 0;
  for (let i = 0; i < boss.id.length; i++) {hash = (hash * 31 + boss.id.charCodeAt(i)) >>> 0;}
  const detail = pool[hash % pool.length];

  return [{
    id: `daily_boss_${boss.id}`,
    label: `Portal de ${boss.name}`,
    detail,
    type: 'focus',
    focusDuration: duration * 60_000,
    shadowHint: boss.id,
    icon: boss.icon || 'skull',
    color: boss.color || C.neonRed,
    category: 'raid',
    customShadow: { name: `Sombra de ${boss.name}`, icon: boss.icon || 'ghost', questType: 'focus' },
  }];
};

export type EventWindow = {
  name: string
  start: string // MM-DD
  end: string // MM-DD
}

export type EventBossDef = {
  id: string
  label: string
  detail: string
  type: Quest['type']
  gpsTarget?: number
  focusDuration?: number
  shadowHint: string
  icon: string
  color: string
  event: EventWindow
  required: number
  /**
   * Scales trial template difficulty for this event.
   * 1.0 = default (light events), 1.2 = medium, 1.4 = hard, 1.6 = extreme.
   * Applied to minutes, km, and reps in EVENT_TRIAL_TEMPLATES.
   */
  trialScale?: number
}

export const EVENT_BOSS_DEFS: EventBossDef[] = [
  // EXTREME (trialScale 1.6): Halloween, Winter Lich, Equinox, Yule, Festival
  // HARD    (trialScale 1.4): New Year, Harvest, Summer Titan
  // MEDIUM  (trialScale 1.2): Spring, Carnival, Black Friday, Long Nights
  // LIGHT   (trialScale 1.0): Valentine, Easter
  {

    id: 'event_halloween_reaper',
    label: 'Ceifador de Outono',
    detail: 'Evento Halloween — 90 min de foco absoluto em silêncio total.',
    type: 'focus', focusDuration: 90 * 60_000, shadowHint: 'soul_reaper',
    icon: 'ghost', color: '#f97316',
    event: { name: 'HALLOWEEN', start: '10-24', end: '10-31' },
    required: 6, trialScale: 1.6,
  },
  {
    id: 'event_winter_lich',
    label: 'Arquilich do Solstício',
    detail: 'Evento Inverno — 100 min de foco profundo em estudo denso.',
    type: 'focus', focusDuration: 100 * 60_000, shadowHint: 'archlich_prime',
    icon: 'snowflake', color: '#60a5fa',
    event: { name: 'SOLSTÍCIO DE INVERNO', start: '12-20', end: '12-27' },
    required: 6, trialScale: 1.6,
  },
  {
    id: 'event_summer_titan',
    label: 'Titã Solar',
    detail: 'Evento Verão — 160 repetições (Flexões/Agachamentos/Abdominais) em treino contínuo.',
    type: 'training', shadowHint: 'auto_titan',
    icon: 'weather-sunny', color: '#f59e0b',
    event: { name: 'SOLSTÍCIO DE VERÃO', start: '07-01', end: '07-07' },
    required: 5, trialScale: 1.4,
  },
  {
    id: 'event_new_year_ashen',
    label: 'Fénix das Cinzas',
    detail: 'Evento Ano Novo — 80 min de foco para reescrever o teu destino.',
    type: 'focus', focusDuration: 80 * 60_000, shadowHint: 'ash_specter',
    icon: 'fire', color: '#f97316',
    event: { name: 'ANO NOVO', start: '01-01', end: '01-07' },
    required: 5, trialScale: 1.4,
  },
  {
    id: 'event_valentine_oath',
    label: 'Voto Rubro',
    detail: 'Evento Valentim — 60 min de foco absoluto NO que mais amas fazer.',
    type: 'focus', focusDuration: 60 * 60_000, shadowHint: 'astral_wisp',
    icon: 'star', color: '#fb7185',
    event: { name: 'VALENTIM', start: '02-10', end: '02-16' },
    required: 4, trialScale: 1.0,
  },
  {
    id: 'event_carnival_mask',
    label: 'Máscara do Caos',
    detail: 'Evento Carnaval — 7 km de marcha rápida entre distrações.',
    type: 'gps', gpsTarget: 7, shadowHint: 'astral_echo',
    icon: 'star', color: '#a855f7',
    event: { name: 'CARNAVAL', start: '02-28', end: '03-06' },
    required: 5, trialScale: 1.2,
  },
  {
    id: 'event_equinox_guardian',
    label: 'Guardião do Equinócio',
    detail: 'Evento Equinócio — 90 min de foco equilibrado sem quebras.',
    type: 'focus', focusDuration: 90 * 60_000, shadowHint: 'astral_guardian',
    icon: 'shield-check', color: '#22c55e',
    event: { name: 'EQUINÓCIO', start: '03-19', end: '03-25' },
    required: 6, trialScale: 1.6,
  },
  {
    id: 'event_easter_hare',
    label: 'Lebre do Sistema',
    detail: 'Evento Páscoa — 7 km em ritmo estável e 70 reps rápidas.',
    type: 'gps', gpsTarget: 7, shadowHint: 'easter_hare_shadow',
    icon: 'star-circle-outline', color: '#facc15',
    event: { name: 'PÁSCOA', start: '03-27', end: '04-02' },
    required: 4, trialScale: 1.0,
  },
  {
    id: 'event_spring_bloom',
    label: 'Flor da Renascença',
    detail: 'Evento Primavera — 75 min de foco com estudo leve e contínuo.',
    type: 'focus', focusDuration: 75 * 60_000, shadowHint: 'mud_elemental',
    icon: 'feather', color: '#34d399',
    event: { name: 'PRIMAVERA', start: '04-15', end: '04-21' },
    required: 4, trialScale: 1.2,
  },
  {
    id: 'event_harvest_king',
    label: 'Rei da Colheita',
    detail: 'Evento Colheita — 150 reps de treino com cadência perfeita.',
    type: 'training', shadowHint: 'hollow_peasant',
    icon: 'trophy', color: '#f59e0b',
    event: { name: 'COLHEITA', start: '09-15', end: '09-21' },
    required: 6, trialScale: 1.4,
  },
  {
    id: 'event_black_friday_merchant',
    label: 'Mercador da Sombra',
    detail: 'Evento Black Friday — 90 min de foco em tarefas económicas/planeamento.',
    type: 'focus', focusDuration: 90 * 60_000, shadowHint: 'auto_omega',
    icon: 'cash-multiple', color: '#0ea5e9',
    event: { name: 'BLACK FRIDAY', start: '11-22', end: '11-28' },
    required: 4, trialScale: 1.2,
  },
  {
    id: 'event_yule_seraph',
    label: 'Serafim do Yule',
    detail: 'Evento Yule — 100 min de foco em silêncio com luz baixa.',
    type: 'focus', focusDuration: 100 * 60_000, shadowHint: 'god_seraphim',
    icon: 'star', color: '#93c5fd',
    event: { name: 'YULE', start: '12-24', end: '12-31' },
    required: 6, trialScale: 1.6,
  },
  {
    id: 'event_midnight_wraith',
    label: 'Wraith da Meia-Noite',
    detail: 'Evento Noites Longas — 80 min de foco após as 00:00.',
    type: 'focus', focusDuration: 80 * 60_000, shadowHint: 'midnight_specter',
    icon: 'skull', color: '#64748b',
    event: { name: 'NOITES LONGAS', start: '11-01', end: '11-07' },
    required: 4, trialScale: 1.2,
  },
  {
    id: 'event_festival_drake',
    label: 'Drake do Festival',
    detail: 'Evento Festival — 10 km de marcha e 140 reps no total.',
    type: 'gps', gpsTarget: 10, shadowHint: 'shadow_dragon',
    icon: 'flag', color: '#f97316',
    event: { name: 'FESTIVAL', start: '08-10', end: '08-16' },
    required: 5, trialScale: 1.6,
  },
];

export const EVENT_TRIAL_TEMPLATES: Array<{
  key: string
  label: string
  type: Quest['type']
  minutes?: number
  km?: number
  reps?: number
}> = [
  { key: 'focus_ritual', label: 'Ritual de Foco', type: 'focus', minutes: 45 },
  { key: 'focus_vow', label: 'Voto de Silêncio', type: 'focus', minutes: 60 },
  { key: 'gps_pilgrimage', label: 'Peregrinação', type: 'gps', km: 5 },
  { key: 'training_burst', label: 'Explosão Física', type: 'training', reps: 120 },
  { key: 'gps_march', label: 'Marcha Ritual', type: 'gps', km: 7 },
  { key: 'focus_sigil', label: 'Selo Mental', type: 'focus', minutes: 75 },
  { key: 'training_endurance', label: 'Resistência', type: 'training', reps: 150 },
];

import { isDateInWindow } from '../utils/time';

export function getActiveEventBossMissions(now = new Date()): DungeonMission[] {
  return EVENT_BOSS_DEFS
    .filter(def => isDateInWindow(now, def.event.start, def.event.end))
    .map(def => ({
      id: def.id,
      label: def.label,
      detail: `${def.detail} [${def.event.name}]`,
      type: def.type,
      gpsTarget: def.gpsTarget,
      focusDuration: def.focusDuration,
      shadowHint: def.shadowHint,
      icon: def.icon,
      color: def.color,
      eventName: def.event.name,
      eventKey: `${def.id}-${now.getFullYear()}`,
      isEventBoss: true,
      category: 'event',
    }));
}

export function buildEventTrials(def: EventBossDef, C: any, now = new Date()): DungeonMission[] {
  const eventKey = `${def.id}-${now.getFullYear()}`;
  const scale = def.trialScale ?? 1.0;
  return EVENT_TRIAL_TEMPLATES.map((t, idx) => {
    // Scale trial values based on event difficulty tier
    const scaledMinutes = t.minutes ? Math.round(t.minutes * scale) : undefined;
    const scaledKm = t.km ? Math.round(t.km * scale * 10) / 10 : undefined;
    const scaledReps = t.reps ? Math.round(t.reps * scale) : undefined;
    return {
      id: `trial_${def.id}_${t.key}`,
      label: `${t.label} ${idx + 1}`,
      detail: `${def.event.name} — ${t.type === 'focus'
        ? `${scaledMinutes} min de foco absoluto`
        : t.type === 'gps'
          ? `${scaledKm} km em marcha contínua`
          : `${scaledReps} reps sem pausas longas`}`,
      type: t.type,
      gpsTarget: scaledKm,
      focusDuration: scaledMinutes ? scaledMinutes * 60_000 : undefined,
      shadowHint: def.shadowHint,
      icon: t.type === 'focus' ? 'timer-outline' : t.type === 'gps' ? 'run-fast' : 'arm-flex',
      color: t.type === 'focus' ? C.neonBlue : t.type === 'gps' ? C.green : C.neonRed,
      eventName: def.event.name,
      eventKey,
      isEventTrial: true,
      category: 'event',
    };
  });
}
