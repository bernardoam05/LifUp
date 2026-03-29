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
    name:        'Tema: Monarca das Sombras',
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
]

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
    id:           'kasaka_venom',
    name:         'Veneno de Kasaka',
    description:  'Extraído da serpente Kasaka. Ativa buff: +15% XP em todas as missões durante 2 horas.',
    lore:         '"A peçonha da serpente não mata — transforma."',
    cost:         0,
    icon:         'snake',
    color:        '#16a34a',
    effect:       'material',
    buffStat:     'xp',
    buffMult:     0.15,
    buffDuration: 2 * 60 * 60_000,
  },
  {
    id:           'igris_fragment',
    name:         'Fragmento de Igris',
    description:  'Um fragmento da armadura do Cavaleiro das Sombras. Ativa buff: +20% XP em todas as missões durante 1 hora.',
    lore:         '"Igris serviu em silêncio. O seu fragmento serve ainda."',
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
    lore:         '"Três cabeças, um destino: servir o Monarca."',
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
    id:           'igris_soul_shard',
    name:         'Fragmento de Alma de Igris',
    description:  'Resquício da essência do Cavaleiro das Sombras. Ativa buff: +25% XP durante 2 horas.',
    lore:         '"Igris morreu de joelhos. O seu fragmento de alma serve de pé."',
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
]

export const CATALOG_MAP = Object.fromEntries(
  [...SHOP_CATALOG, ...BOSS_DROP_ITEMS].map(i => [i.id, i])
)

// ── Thematic Loot Table ───────────────────────────────────────────────────────
// Maps bossId → specific drops (thematic) + chance per drop.
// Generic drops (shadow_essence, blood_fallen) are always added on top.
export type LootEntry = { itemId: string; chance: number }
export const BOSS_LOOT_TABLE: Record<string, LootEntry[]> = {
  // ── Level-gated dungeon key bosses ────────────────────────────────────────
  kasaka_venom_fang:         [{ itemId: 'kasaka_venom',     chance: 0.40 }],
  baruka_ice_elf:            [{ itemId: 'iron_will_crystal',chance: 0.30 }],
  kargalgan_shaman:          [{ itemId: 'blood_fallen',     chance: 0.35 }],
  vulcan_greed_demon:        [{ itemId: 'blood_fallen',     chance: 0.30 }, { itemId: 'igris_fragment', chance: 0.20 }],
  metus_soul_guide:          [{ itemId: 'shadow_essence',   chance: 0.40 }],
  beru_ant_king:             [{ itemId: 'igris_fragment',   chance: 0.35 }],
  kamish_calamity:           [{ itemId: 'dragon_scale',     chance: 0.35 }],
  statue_of_god:             [{ itemId: 'iron_will_crystal',chance: 0.30 }, { itemId: 'lich_eye',       chance: 0.20 }],
  ashborn_shadow_monarch:    [{ itemId: 'dragon_scale',     chance: 0.40 }, { itemId: 'lich_eye',       chance: 0.30 }],
  // box-exclusive lore bosses
  dracula_vampire_lord:      [{ itemId: 'blood_fallen',     chance: 0.45 }],
  cthulhu_mad_god:           [{ itemId: 'lich_eye',         chance: 0.40 }, { itemId: 'shadow_essence', chance: 0.35 }],
  sauron_dark_lord:          [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  sun_wukong_celestial:      [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  kratos_ghost_sparta:       [{ itemId: 'blood_fallen',     chance: 0.40 }, { itemId: 'igris_fragment', chance: 0.25 }],

  // ── Key-gated bosses ──────────────────────────────────────────────────────
  key_boss_basilisk:              [{ itemId: 'kasaka_venom',     chance: 0.40 }],
  key_boss_manticore:             [{ itemId: 'cerberus_fang',    chance: 0.35 }],
  key_boss_phoenix_rebirth:       [{ itemId: 'iron_will_crystal',chance: 0.40 }],
  key_boss_beholder_eye:          [{ itemId: 'lich_eye',         chance: 0.40 }],
  key_boss_demon_prince_astaroth: [{ itemId: 'blood_fallen',     chance: 0.35 }],
  key_boss_undead_dragon_king:    [{ itemId: 'dragon_scale',     chance: 0.40 }],
  key_boss_titania_queen_dark:    [{ itemId: 'shadow_essence',   chance: 0.40 }],
  key_boss_anubis_guardian_soul:  [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  key_boss_cerberus_gate_final:   [{ itemId: 'cerberus_fang',    chance: 0.55 }],
  key_boss_medusa_queen_gaze:     [{ itemId: 'kasaka_venom',     chance: 0.45 }],
  key_boss_hydra_ancient_world:   [{ itemId: 'kasaka_venom',     chance: 0.35 }, { itemId: 'blood_fallen', chance: 0.30 }],
  key_boss_fenrir_wolf_star:      [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  key_boss_odin_simulation_valhalla: [{ itemId: 'iron_will_crystal', chance: 0.40 }, { itemId: 'lich_eye', chance: 0.25 }],
  key_boss_zeus_simulation_olympus:  [{ itemId: 'iron_will_crystal', chance: 0.40 }],
  key_boss_cthulhu_spawn_outer:   [{ itemId: 'lich_eye',         chance: 0.40 }, { itemId: 'shadow_essence', chance: 0.35 }],

  // ── Raid bosses — Rank B ─────────────────────────────────────────────────
  steel_fanged_lycan:        [{ itemId: 'blood_fallen',     chance: 0.25 }],
  hobgoblin_chieftain:       [{ itemId: 'blood_fallen',     chance: 0.25 }],
  twin_headed_ogre:          [{ itemId: 'blood_fallen',     chance: 0.30 }],
  undead_legionnaire:        [{ itemId: 'shadow_essence',   chance: 0.25 }],
  mountain_troll_brute:      [{ itemId: 'blood_fallen',     chance: 0.25 }],
  inferno_hound_alpha:       [{ itemId: 'blood_fallen',     chance: 0.25 }],
  cave_horror_spider:        [{ itemId: 'blood_fallen',     chance: 0.20 }],

  // ── Raid bosses — Rank A ─────────────────────────────────────────────────
  giant_ice_bear:            [{ itemId: 'iron_will_crystal',chance: 0.25 }],
  high_orc_guard:            [{ itemId: 'blood_fallen',     chance: 0.25 }],
  naga_general:              [{ itemId: 'kasaka_venom',     chance: 0.30 }],
  high_orc_raider:           [{ itemId: 'blood_fallen',     chance: 0.25 }],
  dark_elf_assassin_leader:  [{ itemId: 'shadow_essence',   chance: 0.25 }],
  harpy_matriarch:           [{ itemId: 'shadow_essence',   chance: 0.25 }],
  chimera_of_waste:          [{ itemId: 'kasaka_venom',     chance: 0.30 }],

  // ── Raid bosses — Rank S ─────────────────────────────────────────────────
  demon_king_baran:          [{ itemId: 'iron_will_crystal',chance: 0.35 }, { itemId: 'lich_eye',       chance: 0.20 }],
  monarch_querehsha:         [{ itemId: 'shadow_essence',   chance: 0.35 }, { itemId: 'blood_fallen',   chance: 0.25 }],
  monarch_silad:             [{ itemId: 'iron_will_crystal',chance: 0.30 }],
  architect_system:          [{ itemId: 'iron_will_crystal',chance: 0.35 }, { itemId: 'lich_eye',       chance: 0.25 }],
  rathalos_sky:              [{ itemId: 'dragon_scale',     chance: 0.30 }],
  kurama_spirit:             [{ itemId: 'blood_fallen',     chance: 0.30 }],
  vampire_noble_valerius:    [{ itemId: 'blood_fallen',     chance: 0.35 }],
  archdemon_malphas:         [{ itemId: 'blood_fallen',     chance: 0.30 }, { itemId: 'shadow_essence', chance: 0.20 }],
  abyssal_kraken_tentacle:   [{ itemId: 'kasaka_venom',     chance: 0.30 }],
  ancient_guardian_statue:   [{ itemId: 'iron_will_crystal',chance: 0.30 }],
  spectral_lich_king_shadow: [{ itemId: 'lich_eye',         chance: 0.35 }],

  // ── Raid bosses — National / Monarchs ────────────────────────────────────
  monarch_rakan:             [{ itemId: 'dragon_scale',     chance: 0.30 }],
  monarch_legia:             [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  monarch_antares:           [{ itemId: 'dragon_scale',     chance: 0.40 }],
  malenia_blade:             [{ itemId: 'blood_fallen',     chance: 0.35 }, { itemId: 'iron_will_crystal', chance: 0.25 }],
  lich_king_arthas:          [{ itemId: 'lich_eye',         chance: 0.40 }, { itemId: 'iron_will_crystal', chance: 0.25 }],
  sephiroth_angel:           [{ itemId: 'shadow_essence',   chance: 0.35 }, { itemId: 'iron_will_crystal', chance: 0.25 }],
  acnologia_chaos:           [{ itemId: 'dragon_scale',     chance: 0.40 }, { itemId: 'iron_will_crystal', chance: 0.20 }],
  morgoth_abyss:             [{ itemId: 'dragon_scale',     chance: 0.40 }, { itemId: 'lich_eye',         chance: 0.30 }],
  monarch_yogumun_giant:     [{ itemId: 'iron_will_crystal',chance: 0.30 }],
  monarch_silad_true:        [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  national_hunter_thomas:    [{ itemId: 'iron_will_crystal',chance: 0.40 }],
  dragon_monarch_general_1:  [{ itemId: 'dragon_scale',     chance: 0.35 }],
  abyssal_void_walker:       [{ itemId: 'shadow_essence',   chance: 0.35 }],
  seraphim_fallen_angel:     [{ itemId: 'iron_will_crystal',chance: 0.35 }],
  monarch_of_beginnings:     [{ itemId: 'dragon_scale',     chance: 0.45 }, { itemId: 'lich_eye', chance: 0.40 }, { itemId: 'iron_will_crystal', chance: 0.35 }],

  // ── Discovered dungeon bosses ─────────────────────────────────────────────
  alpha_wolf:        [{ itemId: 'blood_fallen',      chance: 0.35 }],
  sea_king:          [{ itemId: 'kasaka_venom',      chance: 0.40 }],
  dungeon_queen:     [{ itemId: 'shadow_essence',    chance: 0.40 }],
  king_of_the_dead:  [{ itemId: 'lich_eye',          chance: 0.40 }, { itemId: 'shadow_essence',    chance: 0.30 }],
  boss_crypt_omega:  [{ itemId: 'shadow_essence',    chance: 0.35 }, { itemId: 'lich_eye',          chance: 0.25 }],
  boss_seraphim:     [{ itemId: 'iron_will_crystal', chance: 0.40 }, { itemId: 'lich_eye',          chance: 0.25 }],

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
}

// Generic drops that always roll independently for every boss
export const GENERIC_BOSS_DROPS: LootEntry[] = [
  { itemId: 'shadow_essence', chance: 0.45 },
  { itemId: 'blood_fallen',   chance: 0.18 },
]
