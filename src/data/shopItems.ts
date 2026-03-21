export type ItemEffect = 'skip_quest' | 'add_xp' | 'reduce_penalty' | 'cosmetic'

export type ShopItem = {
  id:          string
  name:        string
  description: string
  lore:        string       // flavour text
  cost:        number
  icon:        string       // MaterialCommunityIcons name
  color:       string
  effect:      ItemEffect
  effectValue?: number      // XP amount, skip count, etc.
}

export const SHOP_CATALOG: ShopItem[] = [
  {
    id:          'system_pass',
    name:        'Passe do Sistema',
    description: 'Completa automaticamente uma Missão Diária à tua escolha.',
    lore:        '"O Sistema concede dispensa. Mas o corpo não esquece."',
    cost:        500,
    icon:        'ticket-confirmation-outline',
    color:       '#f59e0b',
    effect:      'skip_quest',
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
    icon:        'scroll',
    color:       '#22c55e',
    effect:      'reduce_penalty',
  },
]

export const CATALOG_MAP = Object.fromEntries(SHOP_CATALOG.map(i => [i.id, i]))
