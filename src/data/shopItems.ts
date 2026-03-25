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
    cost:        200,
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
    cost:        800,
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

export const CATALOG_MAP = Object.fromEntries(SHOP_CATALOG.map(i => [i.id, i]))
