export type ItemEffect =
  | 'skip_quest'
  | 'add_xp'
  | 'reduce_penalty'
  | 'remove_penalty'
  | 'xp_boost_next'
  | 'break_hardcore'
  | 'open_loot_box'
  | 'material'
  | 'cosmetic'

export type ShopItem = {
  id:           string
  name:         string
  description:  string
  lore:         string       // flavour text
  cost:         number
  icon:         string       // MaterialCommunityIcons name
  color:        string
  effect:       ItemEffect
  effectValue?: number       // XP amount, skip count, etc.
  effectGold?:  number       // Gold amount (for items that grant gold alongside XP)
  buffStat?:    'xp' | 'gold'  // Which stat the buff applies to
  buffMult?:    number          // Buff multiplier (e.g. 0.25 = +25%)
  buffDuration?: number         // Buff duration in milliseconds
  weeklyStock?: number       // max purchasable per week (undefined = unlimited)
}

export const SHOP_CATALOG: ShopItem[] = [
  {
    id:          'system_pass',
    name:        'Passe do Sistema',
    description: 'Completa automaticamente uma Missão Diária à tua escolha.',
    lore:        '"O Sistema concede dispensa. Mas o corpo não esquece."',
    cost:        3000,
    icon:        'ticket-confirmation-outline',
    color:       '#f59e0b',
    effect:      'skip_quest',
    weeklyStock: 1,
  },
  {
    id:          'xp_crystal',
    name:        'Cristal de XP',
    description: 'Absorves a energia do cristal. +100 XP imediato.',
    lore:        '"Vestígio de um dungeon esquecido. Brilha com poder latente."',
    cost:        300,
    icon:        'crystal-ball',
    color:       '#a855f7',
    effect:      'add_xp',
    effectValue: 100,
  },
  {
    id:          'health_potion',
    name:        'Poção de Recuperação',
    description: 'Restaura a motivação. Concede +30 XP e +10 Gold imediatamente.',
    lore:        '"Sabe a determinação. Bebe-a quando as forças faltarem."',
    cost:        80,
    icon:        'flask-round-bottom',
    color:       '#ef4444',
    effect:      'add_xp',
    effectValue: 30,
    effectGold:  10,
  },
  {
    id:          'rest_scroll',
    name:        'Pergaminho de Repouso',
    description: 'Reduz a penalização do dia seguinte em 50%.',
    lore:        '"Até os grandes Hunters precisam de descanso estratégico."',
    cost:        350,
    icon:        'script-text-outline',
    color:       '#22c55e',
    effect:      'reduce_penalty',
  },
  {
    id:          'lagrima_purificacao',
    name:        'Lágrima da Purificação',
    description: 'Remove imediatamente o debuff de penalização ativo.',
    lore:        '"Destilada da dor e da redenção. Uma segunda chance que o Sistema raramente concede."',
    cost:        1500,
    icon:        'water-outline',
    color:       '#38bdf8',
    effect:      'remove_penalty',
    weeklyStock: 1,
  },
  {
    id:          'relogio_ampulheta',
    name:        'Relógio de Ampulheta',
    description: 'A próxima Missão concluída concede o dobro de XP.',
    lore:        '"O tempo dobra-se para quem é digno. Mas apenas uma vez."',
    cost:        400,
    icon:        'timer-sand-complete',
    color:       '#fbbf24',
    effect:      'xp_boost_next',
  },
  {
    id:          'quebra_feiticos',
    name:        'Quebra-Feitiços',
    description: 'Permite abandonar o Hardcore Focus Mode sem custo adicional.',
    lore:        '"Forjado nas profundezas do dungeon mais sombrio. Quebra qualquer juramento... por um preço já pago."',
    cost:        2000,
    icon:        'shield-off-outline',
    color:       '#ef4444',
    effect:      'break_hardcore',
  },
  {
    id:          'loot_box',
    name:        'Cofre Misterioso',
    description: 'Um cofre trancado por magia do Sistema. Pode conter Gold, XP ou Chaves Raras.',
    lore:        '"O que está lá dentro? Apenas o Sistema decide."',
    cost:        500,
    icon:        'muffin', // using 'muffin' as it looks like a box/bag in some icon sets, or maybe 'bag-personal'
    color:       '#fbbf24',
    effect:      'open_loot_box',
  },
  {
    id:          'theme_monarch',
    name:        'Tema: Soberano das Sombras',
    description: 'Um visual UI negro e roxo profundo que reflete o poder absoluto.',
    lore:        '"Ergue-te com a coroa que governa os mortos."',
    cost:        8000,
    icon:        'palette-outline',
    color:       '#a855f7',
    effect:      'cosmetic',
  },
  {
    id:          'theme_blood',
    name:        'Tema: Noite de Sangue',
    description: 'Um UI focado em escarlate escuro para os caçadores implacáveis.',
    lore:        '"Sedento. Impiedoso. Carniceiro."',
    cost:        8000,
    icon:        'water-pump',
    color:       '#ef4444',
    effect:      'cosmetic',
  },
  // ── Evolution materials (also sold in shop) ──────────────────────────────────
  {
    id:          'evolution_shard_common',
    name:        'Fragmento de Evolução',
    description: 'Material básico para evoluir qualquer unidade. Necessário em todos os upgrades.',
    lore:        '"A matéria-prima do crescimento. Cada fragmento carrega o eco de uma batalha."',
    cost:        200,
    icon:        'rhombus-split',
    color:       '#94a3b8',
    effect:      'material',
    weeklyStock: 10,
  },
  {
    id:          'void_crystal',
    name:        'Cristal do Vazio',
    description: 'Cristal raro das fissuras dimensionais. Necessário para evoluir unidades Knight+ ou em marcos de nível (×10).',
    lore:        '"Existe entre dimensões. O Vazio olha para ti através dele."',
    cost:        1500,
    icon:        'hexagon-outline',
    color:       '#6366f1',
    effect:      'material',
    weeklyStock: 2,
  },
  {
    id:          'beast_core',
    name:        'Núcleo de Fera',
    description: 'Núcleo extraído de criaturas bestiais. Amplifica unidades do tipo Fera ou Inseto.',
    lore:        '"A essência bruta do predador. Pulsa com um instinto impossível de domesticar."',
    cost:        1200,
    icon:        'paw-outline',
    color:       '#f59e0b',
    effect:      'material',
    weeklyStock: 2,
  },
  {
    id:          'phantom_essence',
    name:        'Essência Fantasma',
    description: 'Destilada de almas do dungeon. Necessária para evoluir sombras Morto-Vivo, Fantasma ou Demônio.',
    lore:        '"Não é a morte que assusta — é o que fica depois dela."',
    cost:        1200,
    icon:        'ghost',
    color:       '#a855f7',
    effect:      'material',
    weeklyStock: 2,
  },
];

// ── Evolution materials (drop-only definitions — also appear in SHOP_CATALOG above) ──────────────
export const EVOLUTION_ITEMS: ShopItem[] = [
  {
    id: 'evolution_shard_common', name: 'Fragmento de Evolução',
    description: 'Material básico para evoluir qualquer unidade.',
    lore: '"A matéria-prima do crescimento."',
    cost: 0, icon: 'rhombus-split', color: '#94a3b8', effect: 'material',
  },
  {
    id: 'void_crystal', name: 'Cristal do Vazio',
    description: 'Para unidades Knight+ ou marcos de nível (×10).',
    lore: '"O Vazio olha para ti através dele."',
    cost: 0, icon: 'hexagon-outline', color: '#6366f1', effect: 'material',
  },
  {
    id: 'beast_core', name: 'Núcleo de Fera',
    description: 'Amplifica unidades Fera/Inseto.',
    lore: '"Pulsa com instinto impossível de domesticar."',
    cost: 0, icon: 'paw-outline', color: '#f59e0b', effect: 'material',
  },
  {
    id: 'phantom_essence', name: 'Essência Fantasma',
    description: 'Para sombras Morto-Vivo, Fantasma ou Demônio.',
    lore: '"Não é a morte que assusta — é o que fica."',
    cost: 0, icon: 'ghost', color: '#a855f7', effect: 'material',
  },
];

// ── Boss drop materials (not purchasable, but must be defined for inventory rendering) ──────────
export const BOSS_DROP_ITEMS: ShopItem[] = [
  {
    id:          'shadow_essence',
    name:        'Essência das Sombras',
    description: 'Essência concentrada de sombras capturadas. Reseta o limite de extração de sombras do dia, permitindo nova extração.',
    lore:        '"A escuridão tem um preço. E às vezes, ela paga-te de volta."',
    cost:        0,
    icon:        'ghost-outline',
    color:       '#6366f1',
    effect:      'material',
  },
  {
    id:           'blood_fallen',
    name:         'Sangue dos Caídos',
    description:  'Recolhido dos caçadores que tombaram. Ativa buff: +25% Gold em todas as missões durante 3 horas.',
    lore:         '"O sangue dos fracos fertiliza o caminho dos fortes."',
    cost:         0,
    icon:         'water',
    color:        '#dc2626',
    effect:       'material',
    buffStat:     'gold',
    buffMult:     0.25,
    buffDuration: 3 * 60 * 60_000,
  },
  {
    id:           'viper_venom',
    name:         'Veneno da Víbora',
    description:  'Extraído da Serpente Venenosa. Ativa buff: +15% XP em todas as missões durante 2 horas.',
    lore:         '"A peçonha da víbora não mata — transforma."',
    cost:         0,
    icon:         'snake',
    color:        '#16a34a',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     0.15,
    buffDuration: 2 * 60 * 60_000,
  },
  {
    id:           'crimson_knight_shard',
    name:         'Fragmento do Cavaleiro Carmesim',
    description:  'Um fragmento da armadura do Cavaleiro Carmesim. Ativa buff: +20% XP em todas as missões durante 1 hora.',
    lore:         '"O Cavaleiro Carmesim serviu em silêncio. O seu fragmento serve ainda."',
    cost:         0,
    icon:         'shield-sword',
    color:        '#7c3aed',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     0.20,
    buffDuration: 1 * 60 * 60_000,
  },
  {
    id:           'cerberus_fang',
    name:         'Presa de Cerberus',
    description:  'Dente do guardião do abismo. Ativa buff: +20% Gold em todas as missões durante 2 horas.',
    lore:         '"Três cabeças, um destino: servir o Soberano."',
    cost:         0,
    icon:         'tooth-outline',
    color:        '#b45309',
    effect:       'material',
    buffStat:     'gold',
    buffMult:     0.20,
    buffDuration: 2 * 60 * 60_000,
  },
  {
    id:           'iron_will_crystal',
    name:         'Cristal Vontade de Ferro',
    description:  'Cristalização de determinação pura. Ativa buff: +50% XP em todas as missões durante 30 minutos.',
    lore:         '"A vontade do guerreiro, tornada pedra."',
    cost:         0,
    icon:         'diamond-stone',
    color:        '#0ea5e9',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     0.50,
    buffDuration: 30 * 60_000,
  },
  {
    id:           'lich_eye',
    name:         'Olho do Lich',
    description:  'O olho que vê além da morte. Ativa buff: +100% XP (dobro) em todas as missões durante 1 hora.',
    lore:         '"Aquele que olha para a morte de frente torna-se mais forte."',
    cost:         0,
    icon:         'eye-outline',
    color:        '#a21caf',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     1.00,
    buffDuration: 1 * 60 * 60_000,
  },
  {
    id:           'dragon_scale',
    name:         'Escama de Dragão',
    description:  'Armadura natural do rei dos monstros. Ativa buff: +30% XP em todas as missões durante 4 horas.',
    lore:         '"Nem o fogo derrete o que foi forjado no fogo."',
    cost:         0,
    icon:         'star-david',
    color:        '#ca8a04',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     0.30,
    buffDuration: 4 * 60 * 60_000,
  },
  {
    id:           'crimson_knight_soul',
    name:         'Alma do Cavaleiro Carmesim',
    description:  'Resquício da essência do Cavaleiro Carmesim. Ativa buff: +25% XP durante 2 horas.',
    lore:         '"O Cavaleiro Carmesim morreu de joelhos. A sua alma serve de pé."',
    cost:         0,
    icon:         'sword',
    color:        '#7c3aed',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     0.25,
    buffDuration: 2 * 60 * 60_000,
  },
  {
    id:           'cerberus_tooth',
    name:         'Dente de Cerberus',
    description:  'Arrancado do guardião do abismo de três cabeças. Ativa buff: +25% Gold durante 2 horas.',
    lore:         '"Três cabeças, um fim. Os seus dentes guardam o segredo do Averno."',
    cost:         0,
    icon:         'tooth',
    color:        '#b45309',
    effect:       'material',
    buffStat:     'gold',
    buffMult:     0.25,
    buffDuration: 2 * 60 * 60_000,
  },
];

export const CATALOG_MAP = Object.fromEntries(
  [...SHOP_CATALOG, ...BOSS_DROP_ITEMS, ...EVOLUTION_ITEMS].map(i => [i.id, i])
);

// ── Thematic Loot Table ───────────────────────────────────────────────────────
// Maps bossId → specific drops (thematic) + chance per drop.
// Generic drops (shadow_essence, blood_fallen) are always added on top.
export type LootEntry = { itemId: string; chance: number }
export const BOSS_LOOT_TABLE: Record<string, LootEntry[]> = {
  // ── Level-gated dungeon key bosses ────────────────────────────────────────
  swamp_viper:         [{ itemId: 'viper_venom',     chance: 0.40 }],
  ice_elf_lord:            [{ itemId: 'iron_will_crystal',chance: 0.30 }],
  orc_high_shaman:          [{ itemId: 'blood_fallen',     chance: 0.35 }],
  vulcan_greed_demon:        [{ itemId: 'blood_fallen',     chance: 0.30 }, { itemId: 'crimson_knight_shard', chance: 0.20 }],
  soul_guide_boss:          [{ itemId: 'shadow_essence',   chance: 0.40 }],
  swarm_sovereign:             [{ itemId: 'crimson_knight_shard',   chance: 0.35 }],
  calamity_drake:           [{ itemId: 'dragon_scale',     chance: 0.35 }],
  ancient_trial_guardian:             [{ itemId: 'iron_will_crystal',chance: 0.30 }, { itemId: 'lich_eye',       chance: 0.20 }],
  void_monarch:    [{ itemId: 'dragon_scale',     chance: 0.40 }, { itemId: 'lich_eye',       chance: 0.30 }],
  // box-exclusive lore bosses
  dracula_vampire_lord:      [{ itemId: 'blood_fallen',     chance: 0.45 }],
  cthulhu_mad_god:           [{ itemId: 'lich_eye',         chance: 0.40 }, { itemId: 'shadow_essence', chance: 0.35 }],
  sauron_dark_lord:          [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  sun_wukong_celestial:      [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  sparta_warrior:       [{ itemId: 'blood_fallen',     chance: 0.40 }, { itemId: 'crimson_knight_shard', chance: 0.25 }],

  // ── Key-gated bosses ──────────────────────────────────────────────────────
  key_boss_basilisk:              [{ itemId: 'viper_venom',     chance: 0.40 }],
  key_boss_manticore:             [{ itemId: 'cerberus_fang',    chance: 0.35 }],
  key_boss_phoenix_rebirth:       [{ itemId: 'iron_will_crystal',chance: 0.40 }],
  key_boss_beholder_eye:          [{ itemId: 'lich_eye',         chance: 0.40 }],
  key_boss_demon_prince_astaroth: [{ itemId: 'blood_fallen',     chance: 0.35 }],
  key_boss_undead_dragon_king:    [{ itemId: 'dragon_scale',     chance: 0.40 }],
  key_boss_titania_queen_dark:    [{ itemId: 'shadow_essence',   chance: 0.40 }],
  key_boss_goblin_king:           [{ itemId: 'shadow_essence',   chance: 0.30 }],
  key_boss_anubis_guardian_soul:  [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  key_boss_cerberus_gate_final:   [{ itemId: 'cerberus_fang',    chance: 0.55 }],
  key_boss_medusa_queen_gaze:     [{ itemId: 'viper_venom',     chance: 0.45 }],
  key_boss_hydra_ancient_world:   [{ itemId: 'viper_venom',     chance: 0.35 }, { itemId: 'blood_fallen', chance: 0.30 }],
  key_boss_fenrir_wolf_star:      [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  key_boss_dragon_wyvern:         [{ itemId: 'dragon_scale',     chance: 0.30 }],
  key_boss_odin_simulation_valhalla: [{ itemId: 'iron_will_crystal', chance: 0.40 }, { itemId: 'lich_eye', chance: 0.25 }],
  key_boss_zeus_simulation_olympus:  [{ itemId: 'iron_will_crystal', chance: 0.40 }],
  key_boss_cthulhu_spawn_outer:   [{ itemId: 'lich_eye',         chance: 0.40 }, { itemId: 'shadow_essence', chance: 0.35 }],

  // ── Raid bosses — Rank B ─────────────────────────────────────────────────
  steel_fanged_lycan:        [{ itemId: 'blood_fallen',          chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.60 }, { itemId: 'beast_core', chance: 0.25 }],
  hobgoblin_chieftain:       [{ itemId: 'blood_fallen',          chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.60 }],
  twin_headed_ogre:          [{ itemId: 'blood_fallen',          chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.60 }, { itemId: 'beast_core', chance: 0.20 }],
  undead_legionnaire:        [{ itemId: 'shadow_essence',        chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.60 }, { itemId: 'phantom_essence', chance: 0.25 }],
  mountain_troll_brute:      [{ itemId: 'blood_fallen',          chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.60 }, { itemId: 'beast_core', chance: 0.20 }],
  inferno_hound_alpha:       [{ itemId: 'blood_fallen',          chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.60 }, { itemId: 'beast_core', chance: 0.25 }],
  cave_horror_spider:        [{ itemId: 'blood_fallen',          chance: 0.20 }, { itemId: 'evolution_shard_common', chance: 0.55 }, { itemId: 'beast_core', chance: 0.20 }],

  // ── Raid bosses — Rank A ─────────────────────────────────────────────────
  giant_ice_bear:            [{ itemId: 'iron_will_crystal',     chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }, { itemId: 'beast_core', chance: 0.30 }],
  high_orc_guard:            [{ itemId: 'blood_fallen',          chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }],
  naga_general:              [{ itemId: 'viper_venom',           chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.70 }, { itemId: 'beast_core', chance: 0.25 }],
  high_orc_raider:           [{ itemId: 'blood_fallen',          chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }],
  dark_elf_assassin_leader:  [{ itemId: 'shadow_essence',        chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }, { itemId: 'phantom_essence', chance: 0.30 }],
  harpy_matriarch:           [{ itemId: 'shadow_essence',        chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }, { itemId: 'beast_core', chance: 0.25 }],
  chimera_of_waste:          [{ itemId: 'viper_venom',           chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.70 }, { itemId: 'beast_core', chance: 0.30 }],

  // ── Raid bosses — Rank S ─────────────────────────────────────────────────
  infernal_monarch:          [{ itemId: 'iron_will_crystal',     chance: 0.35 }, { itemId: 'lich_eye',    chance: 0.20 }, { itemId: 'void_crystal', chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  plague_sovereign:          [{ itemId: 'shadow_essence',        chance: 0.35 }, { itemId: 'blood_fallen',chance: 0.25 }, { itemId: 'phantom_essence', chance: 0.35 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  frost_sovereign:           [{ itemId: 'iron_will_crystal',     chance: 0.30 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  architect_system:          [{ itemId: 'iron_will_crystal',     chance: 0.35 }, { itemId: 'lich_eye',    chance: 0.25 }, { itemId: 'void_crystal', chance: 0.35 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  rathalos_sky:              [{ itemId: 'dragon_scale',          chance: 0.30 }, { itemId: 'beast_core',  chance: 0.40 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  primal_fox_deity:          [{ itemId: 'blood_fallen',          chance: 0.30 }, { itemId: 'beast_core',  chance: 0.35 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  vampire_noble_valerius:    [{ itemId: 'blood_fallen',          chance: 0.35 }, { itemId: 'phantom_essence', chance: 0.40 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  archdemon_malphas:         [{ itemId: 'blood_fallen',          chance: 0.30 }, { itemId: 'shadow_essence', chance: 0.20 }, { itemId: 'phantom_essence', chance: 0.35 }, { itemId: 'void_crystal', chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  abyssal_kraken_tentacle:   [{ itemId: 'viper_venom',           chance: 0.30 }, { itemId: 'beast_core',  chance: 0.35 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  ancient_guardian_statue:   [{ itemId: 'iron_will_crystal',     chance: 0.30 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.80 }],
  spectral_lich_king_shadow: [{ itemId: 'lich_eye',              chance: 0.35 }, { itemId: 'phantom_essence', chance: 0.40 }, { itemId: 'void_crystal', chance: 0.35 }, { itemId: 'evolution_shard_common', chance: 0.80 }],

  // ── Raid bosses — National / Monarchs ────────────────────────────────────
  beast_sovereign:           [{ itemId: 'dragon_scale',      chance: 0.30 }, { itemId: 'beast_core',  chance: 0.50 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  giant_sovereign:           [{ itemId: 'iron_will_crystal', chance: 0.35 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  void_sovereign:            [{ itemId: 'dragon_scale',      chance: 0.40 }, { itemId: 'void_crystal', chance: 0.50 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  malenia_blade:             [{ itemId: 'blood_fallen',      chance: 0.35 }, { itemId: 'iron_will_crystal', chance: 0.25 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  frozen_throne_king:        [{ itemId: 'lich_eye',          chance: 0.40 }, { itemId: 'iron_will_crystal', chance: 0.25 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  dark_wing_herald:          [{ itemId: 'shadow_essence',    chance: 0.35 }, { itemId: 'iron_will_crystal', chance: 0.25 }, { itemId: 'phantom_essence', chance: 0.45 }, { itemId: 'void_crystal', chance: 0.40 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  void_dragon_chaos:         [{ itemId: 'dragon_scale',      chance: 0.40 }, { itemId: 'iron_will_crystal', chance: 0.20 }, { itemId: 'void_crystal', chance: 0.50 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  primordial_abyss_lord:     [{ itemId: 'dragon_scale',      chance: 0.40 }, { itemId: 'lich_eye',    chance: 0.30 }, { itemId: 'void_crystal', chance: 0.50 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  stone_giant_sovereign:     [{ itemId: 'iron_will_crystal', chance: 0.30 }, { itemId: 'void_crystal', chance: 0.40 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  frost_sovereign_true:      [{ itemId: 'iron_will_crystal', chance: 0.35 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  titan_champion_sim:        [{ itemId: 'iron_will_crystal', chance: 0.40 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  void_dragon_general:       [{ itemId: 'dragon_scale',      chance: 0.35 }, { itemId: 'void_crystal', chance: 0.40 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  abyssal_void_walker:       [{ itemId: 'shadow_essence',    chance: 0.35 }, { itemId: 'phantom_essence', chance: 0.40 }, { itemId: 'void_crystal', chance: 0.40 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  seraphim_fallen_angel:     [{ itemId: 'iron_will_crystal', chance: 0.35 }, { itemId: 'phantom_essence', chance: 0.35 }, { itemId: 'void_crystal', chance: 0.45 }, { itemId: 'evolution_shard_common', chance: 1.0 }],
  monarch_of_beginnings:     [{ itemId: 'dragon_scale',      chance: 0.45 }, { itemId: 'lich_eye',    chance: 0.40 }, { itemId: 'iron_will_crystal', chance: 0.35 }, { itemId: 'void_crystal', chance: 0.60 }, { itemId: 'evolution_shard_common', chance: 1.0 }],

  // ── Discovered dungeon bosses ─────────────────────────────────────────────
  alpha_wolf:        [{ itemId: 'blood_fallen',      chance: 0.35 }, { itemId: 'beast_core',  chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.65 }],
  sea_king:          [{ itemId: 'viper_venom',        chance: 0.40 }, { itemId: 'beast_core',  chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.65 }],
  dungeon_queen:     [{ itemId: 'shadow_essence',     chance: 0.40 }, { itemId: 'phantom_essence', chance: 0.30 }, { itemId: 'evolution_shard_common', chance: 0.65 }],
  king_of_the_dead:  [{ itemId: 'lich_eye',           chance: 0.40 }, { itemId: 'shadow_essence', chance: 0.30 }, { itemId: 'phantom_essence', chance: 0.35 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }],
  boss_crypt_omega:  [{ itemId: 'shadow_essence',     chance: 0.35 }, { itemId: 'lich_eye',    chance: 0.25 }, { itemId: 'phantom_essence', chance: 0.30 }, { itemId: 'void_crystal', chance: 0.20 }, { itemId: 'evolution_shard_common', chance: 0.70 }],
  boss_seraphim:     [{ itemId: 'iron_will_crystal',  chance: 0.40 }, { itemId: 'lich_eye',    chance: 0.25 }, { itemId: 'void_crystal', chance: 0.25 }, { itemId: 'evolution_shard_common', chance: 0.70 }],

  // ── Dungeon Break bosses ──────────────────────────────────────────────────
  break_boss_lich_servant_vanguard:     [{ itemId: 'shadow_essence',   chance: 0.25 }],
  break_boss_giant_worm_abyss:          [{ itemId: 'blood_fallen',     chance: 0.20 }],
  break_boss_dark_knight_traitor:       [{ itemId: 'blood_fallen',     chance: 0.25 }],
  break_boss_succubus_scout_night:      [{ itemId: 'blood_fallen',     chance: 0.30 }],
  break_boss_gargoyle_watcher_stone:    [{ itemId: 'iron_will_crystal',chance: 0.20 }],
  break_boss_orc_shaman_ritual_corrupt: [{ itemId: 'blood_fallen',     chance: 0.25 }],
  break_boss_ice_troll_frost_bite:      [{ itemId: 'iron_will_crystal',chance: 0.25 }],
  break_boss_fire_spirit_ember:         [{ itemId: 'iron_will_crystal',chance: 0.25 }],
  break_boss_void_wraith_silent:        [{ itemId: 'shadow_essence',   chance: 0.30 }],
  break_boss_corrupted_monk_temple:     [{ itemId: 'iron_will_crystal',chance: 0.25 }, { itemId: 'shadow_essence', chance: 0.20 }],
  break_boss_abyssal_beast_chimera:     [{ itemId: 'blood_fallen',     chance: 0.30 }],
  break_boss_chaos_reaper_final:        [{ itemId: 'lich_eye',         chance: 0.30 }, { itemId: 'iron_will_crystal', chance: 0.20 }],
  break_boss_ancient_machine_core:      [{ itemId: 'iron_will_crystal',chance: 0.30 }],
  break_boss_star_spawn_void:           [{ itemId: 'lich_eye',         chance: 0.35 }, { itemId: 'shadow_essence', chance: 0.30 }],
  break_boss_monarch_shadow_clone_sim:  [{ itemId: 'dragon_scale',     chance: 0.35 }, { itemId: 'lich_eye', chance: 0.30 }],
};

// Generic drops that always roll independently for every boss
export const GENERIC_BOSS_DROPS: LootEntry[] = [
  { itemId: 'shadow_essence',        chance: 0.45 },
  { itemId: 'blood_fallen',          chance: 0.18 },
  { itemId: 'evolution_shard_common',chance: 0.50 },
];
