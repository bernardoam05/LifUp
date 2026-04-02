import { Shadow } from './shadows_types';

// ── EVENT BOSS SHADOW DROPS ───────────────────────────────────────────────────
//
// Ranking philosophy (events are ONCE PER YEAR — this heavily inflates rarity):
//
//  Normal → at least Elite (any event happening 1x/year deserves respect)
//  Elite  → at least Knight
//  Knight → at least Commander
//  Commander → at least Marshal (if extreme effort OR Christmas/Halloween/etc.)
//
// Drop chance: undefined = 100% guaranteed (events reward the annual effort).
//
// Effort tiers used for ranking:
//   Light   (≤4h total / ≤4 trials / simple tasks) → Elite   + once/year
//   Medium  (4–6h total / 4–5 trials)              → Knight  + once/year
//   Hard    (6–9h total / 5–6 trials)              → Commander + once/year
//   Extreme (>9h total / 6 trials / hardest boss)  → Marshal + once/year

export const SHADOWS_BOSS_EVENT: Shadow[] = [
  // ── PÁSCOA (04/27 – 04/02) — required: 4 trials — GPS 7km + 70 reps mix ──
  // Effort: light-medium hybrid, but 1x/year → Knight (up from Normal)
  {
    id: 'easter_hare_shadow',
    name: 'Coelho das Sombras',
    rank: 'Knight', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'xp_boost', value: 0.06, description: '+6% XP em todas as missões' },
    lore: '\"Saltava entre os portais com agilidade sobrenatural. O Monarca venceu-o na sua própria corrida — e reclamou-o como sombra.\"',
    icon: 'rabbit', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'event_easter_hare', category: 'event' },
  },

  // ── PRIMAVERA (04/15 – 04/21) — required: 4 trials — 75 min foco × 4 ≈ 5h ──
  // Effort: medium, 1x/year → Knight (up from Normal)
  {
    id: 'mud_elemental',
    name: 'Elemental de Lama',
    rank: 'Knight', type: 'Elemental', dropRate: 0.10,
    passiveEffect: { type: 'daily_bonus', value: 10, description: '+10 XP grátis ao iniciar cada dia' },
    lore: '\"Nasceu da água e da terra do dungeon submerso. Agora carrega o peso do Monarca com silêncio e constância.\"',
    icon: 'water', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'event_spring_bloom', category: 'event' },
  },

  // ── SOLSTÍCIO DE INVERNO (12/20 – 12/27) — required: 6 trials — 100min × 6 ≈ 10h foco ──
  // Effort: extreme, hardest focus event, 1x/year → Marshal (up from Commander)
  {
    id: 'archlich_prime',
    name: 'Arqui-Lich Supremo',
    rank: 'Marshal', type: 'Undead', dropRate: 0.025,
    passiveEffect: { type: 'xp_boost', value: 0.25, description: '+25% XP em todas as missões' },
    lore: '\"Sacrificou a sua alma por imortalidade. Obteve-a. Passou milénios a acumular poder nos dungeons mais profundos. O Monarca reclamou tudo isso em sete minutos.\"',
    icon: 'coffin', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_winter_lich', category: 'event' },
  },

  // ── SOLSTÍCIO DE VERÃO (07/01 – 07/07) — required: 5 trials — 140 reps × 5 = 700 reps ──
  // Effort: hard-extreme physical, 1x/year → Marshal (up from Knight)
  {
    id: 'auto_titan',
    name: 'Titã de Sucata',
    rank: 'Marshal', type: 'Tank', dropRate: 0.05,
    passiveEffect: { type: 'gold_boost', value: 0.25, description: '+25% Gold em todas as missões' },
    lore: '\"Nasceu da fusão de centenas de autómatos quebrados. Uma montanha de metal que segue o Monarca de forma desajeitada mas letal.\"',
    icon: 'train-car', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_summer_titan', category: 'event' },
  },

  // ── BLACK FRIDAY (11/22 – 11/28) — required: 4 trials — 90min × 4 ≈ 6h foco ──
  // Effort: hard, 1x/year → Marshal (up from Commander)
  {
    id: 'auto_omega',
    name: 'Arma Ómega',
    rank: 'Marshal', type: 'Warrior', dropRate: 0.02,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.25, description: '+25% XP extra em Boss Raids' },
    lore: '\"A última linha de defesa dos velhos construtores. O Monarca desativou-a com força bruta. Agora, a aniquilação tem um novo mestre.\"',
    icon: 'nuke', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_black_friday_merchant', category: 'event' },
  },

  // ── ASTRAIS (eventos mais curtos) ──────────────────────────────────────────

  // VALENTIM (02/10 – 02/16) — required: 4 trials — 60min × 4 ≈ 4h foco
  // Effort: light-medium, 1x/year → Knight (up from Normal)
  {
    id: 'astral_wisp',
    name: 'Luz Estelar Moribunda',
    rank: 'Knight', type: 'Elemental', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.08, description: '+8% XP em todas as missões' },
    lore: '\"Uma faísca de uma galáxia morta, recolhida do vórtice astral. Dá calor silencioso.\"',
    icon: 'star-outline', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'event_valentine_oath', category: 'event' },
  },

  // CARNAVAL (02/28 – 03/06) — required: 5 trials — 6km GPS × 5 = 30km total
  // Effort: medium (GPS eventos são cansativos), 1x/year → Knight (up from Normal)
  {
    id: 'astral_echo',
    name: 'Eco do Cometa',
    rank: 'Knight', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'focus_mastery', value: 0.10, description: '-10% tempo de foco necessário' },
    lore: '\"O som residual de um impacto estelar que durou um milénio. Acalma a mente mortal.\"',
    icon: 'star-shooting', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'event_carnival_mask', category: 'event' },
  },

  // EQUINÓCIO (03/19 – 03/25) — required: 6 trials — 90min × 6 ≈ 9h foco
  // Effort: extreme focus total, 1x/year → Marshal (up from Elite)
  {
    id: 'astral_guardian',
    name: 'Vigia Orbital',
    rank: 'Marshal', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.20, description: '+20% Gold em todas as missões' },
    lore: '\"Pedaços gravitacionais de meteoritos servem como a sua armadura giratória. Um satélite de defesa perfeito.\"',
    icon: 'earth', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_equinox_guardian', category: 'event' },
  },

  // YULE/NATAL (12/24 – 12/31) — required: 6 trials — 100min × 6 ≈ 10h foco
  // Effort: extreme (Natal), 1x/year → Marshal (up from Commander)
  {
    id: 'god_seraphim',
    name: 'Lâmina Serafim Caído',
    rank: 'Marshal', type: 'Assassin', dropRate: 0.02,
    passiveEffect: { type: 'xp_boost', value: 0.30, description: '+30% XP em todas as missões' },
    lore: '\"Seis asas decepadas transmutadas em tendão escuro. Onde passava trazia luz cega. Onde vai, só cai sombra espessa e letal.\"',
    icon: 'sword', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_yule_seraph', category: 'event' },
  },

  // FESTIVAL (08/10 – 08/16) — required: 5 trials — 10km GPS × 5 = 50km total
  // Effort: extreme GPS (50km acumulados!), 1x/year → Marshal (up from Commander)
  {
    id: 'shadow_dragon',
    name: 'Filhote de Dragão Sombrio',
    rank: 'Marshal', type: 'Beast', dropRate: 0.02,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.30, description: '+30% XP extra em Boss Raids' },
    lore: '\"Um pálido eco do poder dracónico, mas cresce dia após dia no exército real do Monarca.\"',
    icon: 'dinosaur', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_festival_drake', category: 'event' },
  },

  // ── LEGIÃO DOS ESQUECIDOS ──────────────────────────────────────────────────

  // COLHEITA (09/15 – 09/21) — required: 6 trials — 150 reps × 6 = 900 reps
  // Effort: hard physical (900 reps total!), 1x/year → Commander (up from Normal)
  {
    id: 'hollow_peasant',
    name: 'Aldeão Vazio',
    rank: 'Commander', type: 'Undead', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.12, description: '+12% Gold em todas as missões' },
    lore: '\"Nunca segurou uma arma na vida. Na morte, o seu medo desapareceu.\"',
    icon: 'pitchfork', color: '#f59e0b',
    unlockMethod: { type: 'boss_drop', bossId: 'event_harvest_king', category: 'event' },
  },

  // ANO NOVO (01/01 – 01/07) — required: 5 trials — 80min × 5 ≈ 6.7h foco
  // Effort: hard, primeiro evento do ano, simbólico, 1x/year → Commander (up from Normal)
  {
    id: 'ash_specter',
    name: 'Espectro de Cinzas',
    rank: 'Commander', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'penalty_reduce', value: 0.15, description: '-15% na perda de XP por penalidade' },
    lore: '\"Nasceu das fogueiras de acampamentos de caçadores aniquilados.\"',
    icon: 'fire', color: '#f59e0b',
    unlockMethod: { type: 'boss_drop', bossId: 'event_new_year_ashen', category: 'event' },
  },

  // HALLOWEEN (10/24 – 10/31) — required: 6 trials — 90min × 6 ≈ 9h foco
  // Effort: extreme, evento mais iconic do ano, 1x/year → Marshal (up from Commander)
  {
    id: 'soul_reaper',
    name: 'Ceifeiro de Almas',
    rank: 'Marshal', type: 'Undead', dropRate: 0.02,
    passiveEffect: { type: 'focus_mastery', value: 0.30, description: '-30% tempo de foco necessário' },
    lore: '\"Rivalizava os Guias do Submundo. O Monarca usurpou a sua posição numa única batalha.\"',
    icon: 'sickle', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'event_halloween_reaper', category: 'event' },
  },

  // NOITES LONGAS (11/01 – 11/07) — required: 4 trials — 80min após meia-noite × 4 ≈ 5.3h
  // Effort: medium-hard (após meia-noite é desafio adicional), 1x/year → Commander (up from Knight)
  {
    id: 'midnight_specter',
    name: 'Espectro da Meia-Noite',
    rank: 'Commander', type: 'Undead', dropRate: 0.04,
    passiveEffect: { type: 'focus_mastery', value: 0.18, description: '-18% tempo de foco necessário' },
    lore: '\"Só emerge depois da meia-noite, quando o véu entre os mundos se afina ao máximo. O Monarca que caça à luz da lua é o único digno de a comandar.\"',
    icon: 'weather-night', color: '#f59e0b',
    unlockMethod: { type: 'boss_drop', bossId: 'event_midnight_wraith', category: 'event' },
  },
];
