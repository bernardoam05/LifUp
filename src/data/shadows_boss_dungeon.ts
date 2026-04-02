import { Shadow } from './shadows_types';

// ── DISCOVERED DUNGEON BOSS SHADOW DROPS ─────────────────────────────────────
//
// These bosses appear in the dynamic portal rotation (daily/weekly).
// Drop chance: 45% — free access, no key required, repeatable.
// Higher-rank shadows have lower drop chance within this category.

export const SHADOWS_BOSS_DUNGEON: Shadow[] = [
  {
    id: 'thunder_wolf',
    name: 'Lobo do Trovão',
    rank: 'Elite', type: 'Beast', dropRate: 0, dropChance: 0.45,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '\"O líder da alcateia do dungeon da tempestade. O seu uivo chamava relâmpagos. Agora o único trovão que importa é o passo do Monarca.\"',
    icon: 'lightning-bolt', color: '#22c55e',
    unlockMethod: { type: 'boss_drop', bossId: 'alpha_wolf', category: 'dungeon' },
  },
  {
    id: 'sea_serpent',
    name: 'Serpente dos Abismos',
    rank: 'Elite', type: 'Beast', dropRate: 0, dropChance: 0.45,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '\"Governava os corredores alagados do dungeon subaquático. A sua pele era um mapa de cicatrizes. Cada uma contava uma história de vitória.\"',
    icon: 'wave', color: '#22c55e',
    unlockMethod: { type: 'boss_drop', bossId: 'sea_king', category: 'dungeon' },
  },
  {
    id: 'medusa',
    name: 'Medusa Sombria',
    rank: 'Knight', type: 'Magic', dropRate: 0, dropChance: 0.38,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '\"O seu olhar petrificava qualquer ser vivo. Em sombra, o olhar ainda paralisa — não o corpo, mas o tempo. A streak nunca congela enquanto ela guarda.\"',
    icon: 'eye', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'dungeon_queen', category: 'dungeon' },
  },
  {
    id: 'death_wraith',
    name: 'Espectro da Morte',
    rank: 'Knight', type: 'Undead', dropRate: 0, dropChance: 0.38,
    passiveEffect: { type: 'penalty_immunity', value: 1, description: 'Imunidade completa a 1 penalidade por semana' },
    lore: '\"Era o arauto do Rei dos Mortos. Anunciava a punição antes que chegasse. Agora anuncia a chegada do Monarca — e as penalidades recuam.\"',
    icon: 'ghost-outline', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'king_of_the_dead', category: 'dungeon' },
  },
  {
    id: 'spider_omega',
    name: 'Aranha Ômega da Cripta',
    rank: 'Commander', type: 'Beast', dropRate: 0.02, dropChance: 0.28,
    passiveEffect: { type: 'xp_boost', value: 0.15, description: '+15% XP em todas as missões' },
    lore: '\"A governante das profundezas da Cripta. As suas teias são feitas de desespero solidificado.\"',
    icon: 'spider', color: '#f59e0b',
    unlockMethod: { type: 'boss_drop', bossId: 'boss_crypt_omega', category: 'dungeon' },
  },
  {
    id: 'fallen_seraphim',
    name: 'Asa da Condenação',
    rank: 'Commander', type: 'Assassin', dropRate: 0.02, dropChance: 0.28,
    passiveEffect: { type: 'penalty_immunity', value: 1, description: 'Imunidade completa a 1 penalidade por semana' },
    lore: '\"Desafiou o Sistema na sua forma pura e pagou o preço. As suas asas não caíram — foram arrancadas. O que sobreviveu ao julgamento serve agora com uma fúria que a redenção nunca apagará.\"',
    icon: 'feather', color: '#a855f7',
    unlockMethod: { type: 'boss_drop', bossId: 'boss_seraphim', category: 'dungeon' },
  },
];
