import { Shadow } from './shadows_types'

export const SHADOWS_BOSS_EVENT: Shadow[] = [
  {
        id: 'wolf_pup',
        name: 'Lobo das Sombras',
        rank: 'Normal', type: 'Beast', dropRate: 0.10,
        passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
        lore: '"Caçava em matilha no dungeon do norte. Agora caça sozinho — mas ao lado do Monarca, nunca está realmente só."',
        icon: 'dog', color: '#94a3b8',
        unlockMethod: { type: 'boss_drop', bossId: 'event_easter_hare', category: 'event' },
      },
  {
        id: 'mud_elemental',
        name: 'Elemental de Lama',
        rank: 'Normal', type: 'Elemental', dropRate: 0.10,
        passiveEffect: { type: 'daily_bonus', value: 5, description: '+5 XP grátis ao iniciar cada dia' },
        lore: '"Nasceu da água e da terra do dungeon submerso. Agora carrega o peso do Monarca com silêncio e constância."',
        icon: 'water', color: '#94a3b8',
        unlockMethod: { type: 'boss_drop', bossId: 'event_spring_bloom', category: 'event' },
      },
  {
        id: 'archlich_prime',
        name: 'Arqui-Lich Supremo',
        rank: 'Commander', type: 'Undead', dropRate: 0.025,
        passiveEffect: { type: 'xp_boost', value: 0.15, description: '+15% XP em todas as missões' },
        lore: '"Sacrificou a sua alma por imortalidade. Obteve-a. Passou milénios a acumular poder nos dungeons mais profundos. O Monarca reclamou tudo isso em sete minutos."',
        icon: 'coffin', color: '#f59e0b',
        unlockMethod: { type: 'boss_drop', bossId: 'event_winter_lich', category: 'event' },
      },
  {
        id: 'auto_titan', name: 'Titã de Sucata', rank: 'Knight', type: 'Tank', dropRate: 0.05,
        passiveEffect: { type: 'gold_boost', value: 0.08, description: '+8% Gold em todas as missões' },
        lore: '"Nasceu da fusão de centenas de autómatos quebrados. Uma montanha de metal que segue o Monarca de forma desajeitada mas letal."',
        icon: 'train-car-flatbed-tank', color: '#3b82f6',
        unlockMethod: { type: 'boss_drop', bossId: 'event_summer_titan', category: 'event' },
      },
  {
        id: 'auto_omega', name: 'Arma Ómega', rank: 'Commander', type: 'Warrior', dropRate: 0.02,
        passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
        lore: '"A última linha de defesa dos velhos construtores. O Monarca desativou-a com força bruta. Agora, a aniquilação tem um novo mestre."',
        icon: 'nuke', color: '#f59e0b',
        unlockMethod: { type: 'boss_drop', bossId: 'event_black_friday_merchant', category: 'event' },
      },
  // ── SOMBRAS ASTRAIS (Astral Shadows) ──
      {
        id: 'astral_wisp', name: 'Luz Estelar Moribunda', rank: 'Normal', type: 'Elemental', dropRate: 0.1,
        passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
        lore: '"Uma faísca de uma galáxia morta, recolhida do vórtice astral. Dá calor silencioso."',
        icon: 'star-outline', color: '#94a3b8',
        unlockMethod: { type: 'boss_drop', bossId: 'event_valentine_oath', category: 'event' },
      },
  {
        id: 'astral_echo', name: 'Eco do Cometa', rank: 'Normal', type: 'Magic', dropRate: 0.1,
        passiveEffect: { type: 'focus_mastery', value: 0.05, description: '-5% tempo de foco necessário' },
        lore: '"O som residual de um impacto estelar que durou um milénio. Acalma a mente mortal."',
        icon: 'comet', color: '#94a3b8',
        unlockMethod: { type: 'boss_drop', bossId: 'event_carnival_mask', category: 'event' },
      },
  {
        id: 'astral_guardian', name: 'Vigia Orbital', rank: 'Elite', type: 'Tank', dropRate: 0.08,
        passiveEffect: { type: 'gold_boost', value: 0.04, description: '+4% Gold em todas as missões' },
        lore: '"Pedaços gravitacionais de meteoritos servem como a sua armadura giratória. Um satélite de defesa perfeito."',
        icon: 'planet', color: '#22c55e',
        unlockMethod: { type: 'boss_drop', bossId: 'event_equinox_guardian', category: 'event' },
      },
  {
        id: 'god_seraphim', name: 'Lâmina Serafim Caído', rank: 'Commander', type: 'Assassin', dropRate: 0.02,
        passiveEffect: { type: 'xp_boost', value: 0.15, description: '+15% XP em todas as missões' },
        lore: '"Seis asas decepadas transmutadas em tendão escuro. Onde passava trazia luz cega. Onde vai, só cai sombra espessa e letal."',
        icon: 'sword', color: '#f59e0b',
        unlockMethod: { type: 'boss_drop', bossId: 'event_yule_seraph', category: 'event' },
      },
  {
        id: 'shadow_dragon', name: 'Filhote de Dragão Sombrio', rank: 'Commander', type: 'Beast', dropRate: 0.02,
        passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
        lore: '"Um pálido eco do poder dracónico, mas cresce dia após dia no exército real do Monarca."',
        icon: 'dragon', color: '#f59e0b',
        unlockMethod: { type: 'boss_drop', bossId: 'event_festival_drake', category: 'event' },
      },
  // ── TERCEIRA VAGA: LEGIÃO DOS ESQUECIDOS (Mais 30 Sombras) ──
      {
        id: 'hollow_peasant', name: 'Aldeão Vazio', rank: 'Normal', type: 'Undead', dropRate: 0.1,
        passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
        lore: '"Nunca segurou uma arma na vida. Na morte, o seu medo desapareceu."',
        icon: 'pitchfork', color: '#94a3b8',
        unlockMethod: { type: 'boss_drop', bossId: 'event_harvest_king', category: 'event' },
      },
  {
        id: 'ash_specter', name: 'Espectro de Cinzas', rank: 'Normal', type: 'Magic', dropRate: 0.1,
        passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
        lore: '"Nasceu das fogueiras de acampamentos de caçadores aniquilados."',
        icon: 'fire', color: '#94a3b8',
        unlockMethod: { type: 'boss_drop', bossId: 'event_new_year_ashen', category: 'event' },
      },
  {
        id: 'soul_reaper', name: 'Ceifeiro de Almas', rank: 'Commander', type: 'Undead', dropRate: 0.02,
        passiveEffect: { type: 'focus_mastery', value: 0.20, description: '-20% tempo de foco necessário' },
        lore: '"Rivalizava os Guias do Submundo. O Monarca usurpou a sua posição numa única batalha."',
        icon: 'sickle', color: '#f59e0b',
        unlockMethod: { type: 'boss_drop', bossId: 'event_halloween_reaper', category: 'event' },
      }
]
