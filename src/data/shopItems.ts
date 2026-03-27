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
    description: 'Restaura a motivação. +30 XP e +10 Gold.',
    lore:        '"Sabe a determinação. Bebe-a quando as forças faltarem."',
    cost:        80,
    icon:        'flask-round-bottom',
    color:       '#ef4444',
    effect:      'add_xp',
    effectValue: 30,
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
    description: 'Essência concentrada de sombras capturadas. Reseta a extração de sombras do dia.',
    lore:        '"A escuridão tem um preço. E às vezes, ela paga-te de volta."',
    cost:        0,
    icon:        'ghost-outline',
    color:       '#6366f1',
    effect:      'material',
  },
  {
    id:          'blood_fallen',
    name:        'Sangue dos Caídos',
    description: 'Recolhido dos caçadores que tombaram. Aumenta Gold ganho em +25% por 3 horas.',
    lore:        '"O sangue dos fracos fertiliza o caminho dos fortes."',
    cost:        0,
    icon:        'water',
    color:       '#dc2626',
    effect:      'material',
  },
  {
    id:          'kasaka_venom',
    name:        'Veneno de Kasaka',
    description: 'Extraído da serpente Kasaka. Aumenta XP ganho em +15% por 2 horas.',
    lore:        '"A peçonha da serpente não mata — transforma."',
    cost:        0,
    icon:        'snake',
    color:       '#16a34a',
    effect:      'material',
  },
  {
    id:          'igris_fragment',
    name:        'Fragmento de Igris',
    description: 'Um fragmento da armadura do Cavaleiro das Sombras. XP +20% por 1 hora.',
    lore:        '"Igris serviu em silêncio. O seu fragmento serve ainda."',
    cost:        0,
    icon:        'shield-sword',
    color:       '#7c3aed',
    effect:      'material',
  },
  {
    id:          'cerberus_fang',
    name:        'Presa de Cerberus',
    description: 'Dente do guardião do abismo. Aumenta Gold ganho em +20% por 2 horas.',
    lore:        '"Três cabeças, um destino: servir o Monarca."',
    cost:        0,
    icon:        'tooth-outline',
    color:       '#b45309',
    effect:      'material',
  },
  {
    id:          'iron_will_crystal',
    name:        'Cristal Vontade de Ferro',
    description: 'Cristalização de determinação pura. XP +50% pelos próximos 30 minutos.',
    lore:        '"A vontade do guerreiro, tornada pedra."',
    cost:        0,
    icon:        'diamond-stone',
    color:       '#0ea5e9',
    effect:      'material',
  },
  {
    id:          'lich_eye',
    name:        'Olho do Lich',
    description: 'O olho que vê além da morte. XP +100% durante 1 hora.',
    lore:        '"Aquele que olha para a morte de frente torna-se mais forte."',
    cost:        0,
    icon:        'eye-outline',
    color:       '#a21caf',
    effect:      'material',
  },
  {
    id:          'dragon_scale',
    name:        'Escama de Dragão',
    description: 'Armadura natural do rei dos monstros. XP +30% por 4 horas.',
    lore:        '"Nem o fogo derrete o que foi forjado no fogo."',
    cost:        0,
    icon:        'star-david',
    color:       '#ca8a04',
    effect:      'material',
  },
]

export const CATALOG_MAP = Object.fromEntries(
  [...SHOP_CATALOG, ...BOSS_DROP_ITEMS].map(i => [i.id, i])
)
