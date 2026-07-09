import type { QuestDefinition, Quest, MissionDifficulty } from './types';
import { seededPick, getQuestTier, TIER_MULT, rankFromXP } from './helpers';
import type { PassiveEffectType } from '../data/shadows';

// ── Daily Misson Limits & Key Gates ──────────────────────────────────────────

export const LEVEL_GATED_KEYS = [
  { id: 'key_crypt', name: 'Chave da Cripta', color: '#ff4444', icon: 'key', unlockLevel: 5 },
  { id: 'key_astral', name: 'Chave do Eclipse', color: '#a855f7', icon: 'key', unlockLevel: 15 },
  { id: 'key_seraphim', name: 'Chave do Serafim', color: '#fbbf24', icon: 'key', unlockLevel: 30 },
];

export const BOX_KEY_META = [
  { id: 'key_goblin', name: 'Chave Goblin', color: '#10b981', icon: 'key' },
  { id: 'key_orc', name: 'Chave Orc de Fogo', color: '#f97316', icon: 'key' },
  { id: 'key_dragon', name: 'Chave do Dragão', color: '#8b5cf6', icon: 'key' },
];

export function getDailyMissionTarget(level: number, difficulty: MissionDifficulty, customTarget?: number): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'hard': return Math.min(4 + Math.floor(level / 8), 7);
    case 'custom': {
      const safe = Number.isFinite(customTarget) ? Math.round(customTarget as number) : 3;
      return Math.min(Math.max(safe, 1), 10);
    }
    case 'normal':
    default: return Math.min(3 + Math.floor(level / 12), 5);
  }
}

// ── Quest Conversion & Generation ────────────────────────────────────────────

export function defToQuest(def: QuestDefinition, level: number, tier: string): Quest {
  const mult = TIER_MULT[tier] || 1.0;
  const m = (n: number) => Math.round(n * mult);
  const amount = def.scalingAmount ?? (def as any).scalingPerLevel ?? 0;
  const interval = def.scalingInterval ?? 1;
  let targetRaw = def.baseTarget + Math.floor((level - 1) / interval) * (def.isDescending ? -amount : amount);

  // Dynamic scaling for elite/boss content
  if (def.dynamicScaling) {
    // Increase target by 5% every 5 levels
    const factor = 1 + (Math.floor(level / 5) * 0.05);
    targetRaw *= factor;
  }

  const target = Math.max(def.questType === 'forbidden' ? 0 : 1, Math.round(targetRaw));
  const detail = def.description
    .replace(/{target}/g, String(target))
    .replace(/{unit}/g, def.unit);

  const quest: Quest = {
    id: def.id,
    label: def.title,
    detail,
    xp: m(def.baseXP),
    gold: m(def.baseGold),
    type: def.questType,
    done: false,
    rank: def.rank ?? rankFromXP(def.baseXP),
    targetValue: target,
    unit: def.unit,
    rewards: def.rewards,
  };
  if (def.questType === 'focus') {
    const unit = def.unit?.toLowerCase() ?? 'min';
    const focusMinutes = unit.startsWith('h') ? target * 60 : target;
    quest.focusDuration = focusMinutes * 60_000;
  }
  if (def.questType === 'gps') {quest.gpsTarget = target;}
  if (def.questType === 'limit') {quest.currentValue = 0;}
  if (def.questType === 'pomodoro') { quest.pomodoroTarget = target; quest.currentValue = 0; }
  return quest;
}

export function createDailyQuests(
  level: number,
  questDictionary: QuestDefinition[],
  difficulty: MissionDifficulty = 'normal',
  customTarget?: number,
  overrideSeed?: number,
): Quest[] {
  const tier = getQuestTier(level);
  const dayOfWeek = new Date().getDay();
  const d = new Date();
  const seed = overrideSeed ?? (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());

  const coreDefs = questDictionary
    .filter(def => def.type === 'core')
    .filter(def => !def.daysOfWeek || def.daysOfWeek.includes(dayOfWeek));

  const poolDefs = questDictionary.filter(def => def.type === 'pool');
  const poolCount = getDailyMissionTarget(level, difficulty, customTarget);
  const picks = seededPick(poolCount, poolDefs.length, seed);

  return [
    ...coreDefs.map(def => defToQuest(def, level, tier)),
    ...picks.map(i => defToQuest(poolDefs[i], level, tier)),
  ];
}

export function generateSideQuestReward(): { rank: 'E' | 'D' | 'C'; xp: number; gold: number } {
  const roll = Math.random();
  if (roll < 0.60) {return { rank: 'E', xp: 10 + Math.floor(Math.random() * 21), gold: 3 + Math.floor(Math.random() * 6) };}
  if (roll < 0.90) {return { rank: 'D', xp: 30 + Math.floor(Math.random() * 31), gold: 8 + Math.floor(Math.random() * 8) };}
  return { rank: 'C', xp: 60 + Math.floor(Math.random() * 41), gold: 15 + Math.floor(Math.random() * 11) };
}

export function getCustomShadowPassive(questType: Quest['type']): { type: PassiveEffectType; value: number; description: string } {
  switch (questType) {
    case 'training': return { type: 'gold_boost', value: 0.02, description: '+2% Gold em missões de treino' };
    case 'knowledge': return { type: 'xp_boost', value: 0.02, description: '+2% XP em missões de conhecimento' };
    case 'focus': return { type: 'focus_mastery', value: 0.10, description: '-10% tempo de foco necessário' };
    case 'gps': return { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' };
    default: return { type: 'gold_boost', value: 0, description: '' };
  }
}

// ── Penalty Quests ───────────────────────────────────────────────────────────

export const PENALTY_QUEST_POOL: Quest[] = [
  { id: 'p_cardio', label: 'Penalização: Cardio', detail: '20 min de corrida contínua', xp: 0, gold: 0, type: 'training', done: false },
  { id: 'p_squat', label: 'Penalização: Agachamentos', detail: '50 agachamentos consecutivos', xp: 0, gold: 0, type: 'training', done: false },
  { id: 'p_focus', label: 'Penalização: Foco Forçado', detail: '30 min de foco sem interrupções', xp: 0, gold: 0, type: 'focus', unit: 'min', targetValue: 30, currentValue: 0, focusDuration: 30 * 60_000, done: false },
  { id: 'p_reading', label: 'Penalização: Leitura Disciplinar', detail: '15 páginas (livro não-ficção)', xp: 0, gold: 0, type: 'knowledge', done: false },
  { id: 'p_plank', label: 'Penalização: Prancha do Sistema', detail: '3 min de prancha (acumulados)', xp: 0, gold: 0, type: 'training', done: false },
  { id: 'p_pushups', label: 'Penalização: Flexões', detail: '30 flexões de execução lenta', xp: 0, gold: 0, type: 'training', done: false },
];

// ── Quest Dictionary ─────────────────────────────────────────────────────────

export const INITIAL_QUEST_DICTIONARY: QuestDefinition[] = [
  {
    id: 'core_pushups', title: 'Preparação Física: Força', description: 'Realiza {target} flexões.',
    type: 'core', questType: 'training', baseTarget: 15, scalingAmount: 2, scalingInterval: 5, unit: 'reps', baseXP: 50, baseGold: 10,
  },
  {
    id: 'core_squats', title: 'Preparação Física: Pernas', description: 'Realiza {target} agachamentos.',
    type: 'core', questType: 'training', baseTarget: 20, scalingAmount: 2, scalingInterval: 5, unit: 'reps', baseXP: 50, baseGold: 10,
  },
  {
    id: 'core_reading', title: 'Treino Mental: Leitura', description: 'Lê {target} páginas de um livro útil.',
    type: 'core', questType: 'knowledge', baseTarget: 10, scalingAmount: 1, scalingInterval: 10, unit: 'pages', baseXP: 40, baseGold: 10,
  },
  {
    id: 'core_water', title: 'Sobrevivência: Hidratação', description: 'Bebe {target} copos de água.',
    type: 'core', questType: 'training', baseTarget: 8, scalingAmount: 0, scalingInterval: 1, unit: 'glasses', baseXP: 10, baseGold: 5,
  },
  // Pool Quests
  { id: 'pool_run', title: 'Missão de Caçador: Corrida', description: 'Corre {target} km.', type: 'pool', questType: 'gps', baseTarget: 3, scalingAmount: 0.2, scalingInterval: 5, unit: 'km', baseXP: 100, baseGold: 30 },
  { id: 'pool_plank', title: 'Resistência Muscular', description: 'Mantém uma prancha por {target} s.', type: 'pool', questType: 'training', baseTarget: 60, scalingAmount: 5, scalingInterval: 5, unit: 's', baseXP: 60, baseGold: 15 },
  { id: 'pool_meditate', title: 'Treino de Mana', description: 'Medita em silêncio por {target} min.', type: 'pool', questType: 'focus', baseTarget: 10, scalingAmount: 1, scalingInterval: 10, unit: 'min', baseXP: 40, baseGold: 15 },
  { id: 'pool_social', title: 'Prova de Vontade', description: 'Zero redes sociais por {target} h.', type: 'pool', questType: 'forbidden', baseTarget: 4, scalingAmount: 0, scalingInterval: 1, unit: 'h', baseXP: 80, baseGold: 20 },
  { id: 'pool_sugar', title: 'Corpo Limpo', description: 'Não comer açúcar hoje.', type: 'pool', questType: 'forbidden', baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'day', baseXP: 70, baseGold: 20 },
  { id: 'pool_pullups', title: 'Elevações', description: 'Realiza {target} elevações.', type: 'pool', questType: 'training', baseTarget: 5, scalingAmount: 1, scalingInterval: 10, unit: 'reps', baseXP: 90, baseGold: 25 },
  { id: 'pool_screentime', title: 'Desintoxicação Digital', description: 'Limita o tempo de ecrã (lazer) a {target} h.', type: 'pool', questType: 'limit', baseTarget: 2, isDescending: true, scalingAmount: 0.1, scalingInterval: 10, unit: 'h', baseXP: 60, baseGold: 15 },
  { id: 'pool_stretching', title: 'Flexibilidade', description: 'Sessão de alongamentos por {target} min.', type: 'pool', questType: 'training', baseTarget: 15, scalingAmount: 1, scalingInterval: 10, unit: 'min', baseXP: 40, baseGold: 10 },
  { id: 'pool_deepwork', title: 'Trabalho Profundo', description: 'Trabalha focado por {target} min sem pausas.', type: 'pool', questType: 'focus', baseTarget: 60, scalingAmount: 5, scalingInterval: 10, unit: 'min', baseXP: 100, baseGold: 30 },
  { id: 'pool_coldshower', title: 'Banho Gelado', description: 'Toma um banho de água fria.', type: 'pool', questType: 'training', baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'shower', baseXP: 80, baseGold: 20 },
  { id: 'pool_walking', title: 'Patrulha Ligeira', description: 'Caminha {target} km hoje.', type: 'pool', questType: 'gps', baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'km', baseXP: 70, baseGold: 20 },
  { id: 'pool_language', title: 'Conhecimento Arcano', description: 'Estuda um idioma 15 min.', type: 'pool', questType: 'knowledge', baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'min', baseXP: 50, baseGold: 15 },
  {
    id: 'pool_burpees', title: 'Condicionamento Extremo', description: 'Realiza {target} burpees.',
    type: 'pool', questType: 'training', baseTarget: 15, scalingAmount: 1, scalingInterval: 5, unit: 'reps', baseXP: 80, baseGold: 25,
  },
  {
    id: 'pool_cook', title: 'Refeição de Caçador', description: 'Cozinha a tua própria refeição saudável.',
    type: 'pool', questType: 'training', baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'meal', baseXP: 60, baseGold: 15,
  },
  {
    id: 'pool_journal', title: 'Mente Clara', description: 'Escreve um diário/reflexão por 10 min.',
    type: 'pool', questType: 'focus', baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min', baseXP: 40, baseGold: 10,
  },
  // --- Pomodoro ---
  {
    id: 'pool_pomodoro_basic',
    title: 'Técnica de Caçador: Foco Cíclico',
    description: 'Completa {target} ciclos Pomodoro hoje.',
    type: 'pool', questType: 'pomodoro',
    baseTarget: 2, scalingAmount: 0, scalingInterval: 1, unit: 'ciclos',
    baseXP: 80, baseGold: 25,
  },
  {
    id: 'pool_pomodoro_adv',
    title: 'Técnica de Caçador: Maestria Temporal',
    description: 'Completa {target} ciclos Pomodoro hoje. A concentração é uma arma.',
    type: 'pool', questType: 'pomodoro',
    baseTarget: 4, scalingAmount: 0, scalingInterval: 1, unit: 'ciclos',
    baseXP: 160, baseGold: 50,
  },
  // --- Bosses ---
  {
    id: 'boss_pomodoro_marathon',
    title: 'Maratona Pomodoro: O Fluxo Eterno (A-Rank)',
    description: 'Completa {target} ciclos Pomodoro num único dia. O tempo curva-se para os que dominam o foco.',
    type: 'boss', questType: 'pomodoro',
    baseTarget: 6, scalingAmount: 0, scalingInterval: 1, unit: 'ciclos',
    baseXP: 700, baseGold: 250,
  },
  {
    id: 'boss_focus', title: 'O Rei do Tempo (S-Rank)',
    description: 'Modo Foco estrito durante {target} horas, sem falhas.',
    type: 'boss', questType: 'focus',
    baseTarget: 4, scalingAmount: 0, scalingInterval: 1, unit: 'h',
    baseXP: 1000, baseGold: 400,
  },
  {
    id: 'boss_gps', title: 'Lobo de Gelo Lycaon (A-Rank)',
    description: 'Corre uma meia-maratona ou distância longa: {target} km.',
    type: 'boss', questType: 'gps',
    baseTarget: 7, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 800, baseGold: 300,
  },
  // --- Normal Dungeons (Classic Bosses) ---
  {
    id: 'normal_boss_viper', title: 'Veneno da Víbora',
    description: 'Corre 5km ou pedala 15km sem parar. A serpente aguarda no final.',
    type: 'boss', questType: 'gps',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 500, baseGold: 200,
    dynamicScaling: true,
    rewards: ['viper_venom'],
  },
  {
    id: 'normal_boss_crimson_knight', title: 'O Voto do Cavaleiro Carmesim',
    description: '90 min de foco absoluto. O Cavaleiro Carmesim observa. Sem distrações.',
    type: 'boss', questType: 'focus',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 600, baseGold: 250,
    dynamicScaling: true,
    rewards: ['crimson_knight_soul'],
  },
  {
    id: 'normal_boss_cerberus', title: 'Rugido de Cerberus',
    description: '100 push-ups + 100 squats + 30 burpees. Paga com suor.',
    type: 'boss', questType: 'training',
    baseTarget: 100, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 600, baseGold: 250,
    dynamicScaling: true,
    rewards: ['cerberus_tooth'],
  },
  {
    id: 'alpha_wolf', title: 'Lobo do Trovão Alfa',
    description: 'Percorre {target} km em ritmo acelerado. O líder da matilha observa.',
    type: 'boss', questType: 'gps',
    baseTarget: 6, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 550, baseGold: 220,
    dynamicScaling: true,
  },
  {
    id: 'sea_king', title: 'Rei das Marés Profundas',
    description: '70 min de foco profundo. Sente a pressão do abismo.',
    type: 'boss', questType: 'focus',
    baseTarget: 70, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 580, baseGold: 240,
    dynamicScaling: true,
  },
  {
    id: 'dungeon_queen', title: 'Rainha da Masmorra Esquecida',
    description: '150 reps de exercício de força. Prova a tua resiliência.',
    type: 'boss', questType: 'training',
    baseTarget: 150, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 650, baseGold: 280,
    dynamicScaling: true,
  },
  {
    id: 'king_of_the_dead', title: 'Soberano dos Mortos-Vivos',
    description: '120 min de foco absoluto. O silêncio do túmulo é o teu aliado.',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 700, baseGold: 300,
    dynamicScaling: true,
  },
  {
    id: 'boss_training', title: 'Guardião Cerberus (A-Rank)',
    description: 'Batalha do corpo: {target} Flexões + {target} Agachamentos + {target}s Prancha.',
    type: 'boss', questType: 'training',
    baseTarget: 50, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 800, baseGold: 300,
  },
  {
    id: 'boss_crypt_omega', title: 'Aranha Ômega da Cripta (S-Rank)',
    description: 'Luta complexa: {target} reps de um exercício à escolha a cada 10 mins durante 1 hora.',
    type: 'boss', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 1200, baseGold: 500,
  },
  {
    id: 'boss_astral_eclipse', title: 'Espectro do Eclipse Astral (S-Rank)',
    description: 'Corrida noturna: percorre {target} km depois das 20:00.',
    type: 'boss', questType: 'gps',
    baseTarget: 7, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 1500, baseGold: 600,
  },
  {
    id: 'boss_seraphim', title: 'Serafim Caído (S-Rank)',
    description: 'Mente purificada: {target} min de leitura contínua (ficção ou filosofia).',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1800, baseGold: 800,
  },
  // Expanded daily bosses...
  {
    id: 'boss_kargal', title: 'Kargal, o Devorador de Mentes (A-Rank)',
    description: 'Elimina ruído: Fica longe de écrans/apps inúteis por {target} min seguidos antes de dormir.',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1300, baseGold: 550,
  },
  {
    id: 'boss_ignis', title: 'Titã de Gelo Ignis (S-Rank)',
    description: 'O contraste térmico quebra limites. Corre {target} km ao ar livre e termina com um banho frio de 1 min.',
    type: 'boss', questType: 'gps',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 1100, baseGold: 480,
  },
  {
    id: 'boss_abyss_mage', title: 'Arquimago do Abismo (A-Rank)',
    description: 'Desafia a mente: resolve 3 desafios de lógica/matemática em {target} min.',
    type: 'boss', questType: 'focus',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 750, baseGold: 220,
  },
  {
    id: 'boss_blood_knight', title: 'Cavaleiro de Sangue Sangreal (S-Rank)',
    description: 'Luta corpo a corpo pura. {target} repetições de levantamento de peso (Deadlift/Squats).',
    type: 'boss', questType: 'training',
    baseTarget: 150, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 1400, baseGold: 600,
  },
  {
    id: 'boss_hollow_king', title: 'O Rei Vazio (S-Rank)',
    description: 'Jejum intermitente: {target} min de foco total em trabalho ou estudo com o modo Foco ativo, sem beliscar. Hidratação apenas.',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1800, baseGold: 800,
  },
  {
    id: 'boss_cerberus_prime', title: 'Cerberus Primordial (A-Rank)',
    description: 'Controla a besta de 3 cabeças completando {target} km de corrida matinal.',
    type: 'boss', questType: 'gps',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 900, baseGold: 300,
  },
  {
    id: 'boss_wind_walker', title: 'Caminhante do Vento Silencioso (A-Rank)',
    description: 'Realiza {target} min de alongamentos dinâmicos contínuos (balanços de pernas, rotações de ombros, hip circles) sem pausas superiores a 30s. Modo Foco ativo.',
    type: 'boss', questType: 'focus',
    baseTarget: 45, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 680, baseGold: 210,
  },
  {
    id: 'boss_poison_monarch', title: 'Soberano do Veneno Quimera (S-Rank)',
    description: 'O veneno está no corpo. {target} burpees para suar e queimar o veneno de uma vez.',
    type: 'boss', questType: 'training',
    baseTarget: 80, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 1250, baseGold: 500,
  },
  {
    id: 'boss_goliath', title: 'Golias das Rochas Negras (A-Rank)',
    description: 'Isometria pesada: {target} min de wall-sit ou prancha (tempo acumulado). Modo Foco ativo durante o esforço.',
    type: 'boss', questType: 'focus',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 800, baseGold: 250,
  },
  {
    id: 'boss_shadow_blade', title: 'Lâmina Negra Assustadora (A-Rank)',
    description: 'Tática sombria: lê {target} páginas de estratégia (sem interrupções).',
    type: 'boss', questType: 'knowledge',
    baseTarget: 80, scalingAmount: 0, scalingInterval: 1, unit: 'páginas',
    baseXP: 700, baseGold: 230,
  },
  {
    id: 'boss_iron_jaw', title: 'O Quebra-Mandíbulas (A-Rank)',
    description: 'Shadowboxing: {target} rounds de 2 min cada, com descanso de 30–45s entre rounds.',
    type: 'boss', questType: 'training',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'rounds',
    baseXP: 600, baseGold: 190,
  },
  {
    id: 'boss_astral_drake', title: 'Dragão Astral (S-Rank)',
    description: 'Ativa o modo Foco por {target} min: realiza ciclos de respiração Wim Hof (30 respirações profundas + retenção do ar) e finaliza com 5 min de meditação silenciosa.',
    type: 'boss', questType: 'focus',
    baseTarget: 60, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1400, baseGold: 500,
  },
  {
    id: 'boss_lich_king', title: 'Rei Lich Esquecido (S-Rank)',
    description: 'Foco resistente: {target} min sentado e imóvel, sem distrações.',
    type: 'boss', questType: 'focus',
    baseTarget: 100, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1500, baseGold: 700,
  },
  {
    id: 'boss_tarantula', title: 'Tarântula Imperial (A-Rank)',
    description: 'Marcha controlada: percorre {target} km num percurso definido à partida (evita desvios), sem música nem telemóvel.',
    type: 'boss', questType: 'gps',
    baseTarget: 6, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 650, baseGold: 200,
  },
  {
    id: 'boss_fallen_monk', title: 'Monge Caído (A-Rank)',
    description: 'Jejum de estímulos: ativa o modo Foco por {target} min sem aceder a redes sociais, vídeos ou streaming — mantém a atenção numa única tarefa produtiva.',
    type: 'boss', questType: 'focus',
    baseTarget: 150, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 800, baseGold: 280,
  },
  {
    id: 'boss_swamp_wraith', title: 'Espectro do Pântano (A-Rank)',
    description: 'Autoanálise escrita: ativa o modo Foco por {target} min e escreve livremente sobre um desafio pessoal atual — o que está a acontecer, por que ainda não resolveste, e uma coisa concreta que podes fazer hoje.',
    type: 'boss', questType: 'focus',
    baseTarget: 40, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 720, baseGold: 230,
  },
  {
    id: 'boss_titan_ape', title: 'Primata Titânico (A-Rank)',
    description: 'Força bruta total: {target} reps alternadas de push-ups + squats.',
    type: 'boss', questType: 'training',
    baseTarget: 130, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 850, baseGold: 260,
  },
  {
    id: 'boss_astral_seer', title: 'Oráculo Astral (A-Rank)',
    description: 'Conhecimento profundo: lê {target} páginas de conteúdo técnico sem pausas longas.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 80, scalingAmount: 0, scalingInterval: 1, unit: 'páginas',
    baseXP: 780, baseGold: 240,
  },
  {
    id: 'boss_astral_hound', title: 'Cão Cósmico Errante (A-Rank)',
    description: 'Resistência em campo aberto: percorre {target} km em ritmo constante.',
    type: 'boss', questType: 'gps',
    baseTarget: 8, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 820, baseGold: 250,
  },
  {
    id: 'boss_archlich_prime', title: 'Arquilich Primordial (S-Rank)',
    description: 'Projeto com entregável: define um resultado concreto antes de começar (protótipo, esboço, plano detalhado ou artigo curto). Ativa o modo Foco por {target} min e termina com algo tangível para mostrar.',
    type: 'boss', questType: 'focus',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1600, baseGold: 720,
  },
  {
    id: 'boss_soul_reaper', title: 'Ceifeiro de Almas (S-Rank)',
    description: 'Resiliência mental: {target} min de trabalho criativo (escrita leve, desenho ou plano de projeto).',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1700, baseGold: 760,
  },
  {
    id: 'boss_astral_nebula', title: 'Rei Nebulosa (S-Rank)',
    description: 'Travessia cósmica: percorre {target} km em marcha longa e focada.',
    type: 'boss', questType: 'gps',
    baseTarget: 8, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 1750, baseGold: 780,
  },
  {
    id: 'boss_goblin_warlord', title: 'Senhor Goblin (A-Rank)',
    description: 'Tabata: completa {target} rounds de 20s de esforço máximo + 10s de repouso. Define um único exercício antes de começar (burpees, saltos ou sprints) e mantém a intensidade máxima em cada round.',
    type: 'boss', questType: 'training',
    baseTarget: 8, scalingAmount: 0, scalingInterval: 1, unit: 'rounds',
    baseXP: 680, baseGold: 220,
  },
  {
    id: 'boss_cave_spider_matriarch', title: 'Matriarca da Caverna (A-Rank)',
    description: 'Técnica Feynman: ativa o modo Foco por {target} min e explica por escrito (ou em voz alta gravada) um conceito que estás a aprender, como se ensinasses a um iniciante — sem consultar fontes durante a explicação.',
    type: 'boss', questType: 'focus',
    baseTarget: 35, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 700, baseGold: 230,
  },
  {
    id: 'boss_ant_worker_prime', title: 'Operária Primordial (A-Rank)',
    description: 'Rota de exploração: percorre {target} km num trajeto que nunca fizeste antes, escolhendo o caminho no momento (sem rota pré-definida). Nota 3 coisas novas que descobriste ao longo do percurso.',
    type: 'boss', questType: 'gps',
    baseTarget: 4, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 690, baseGold: 210,
  },
  {
    id: 'boss_stone_golem_shard', title: 'Fragmento do Golem (A-Rank)',
    description: 'Experimenta uma prática física nova (yoga, capoeira, calistenia, tai chi ou outra que nunca tentaste): segue um tutorial e pratica {target} min sem interrupção com modo Foco ativo. Repete os movimentos no final sem guia.',
    type: 'boss', questType: 'focus',
    baseTarget: 30, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 670, baseGold: 200,
  },
  {
    id: 'boss_stringsinger', title: 'O Cantor das Cordas (A-Rank)',
    description: 'Guitarra: {target} min de prática com metrónomo (3 acordes + 1 ritmo básico).',
    type: 'boss', questType: 'focus',
    baseTarget: 35, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 720, baseGold: 230,
  },
  {
    id: 'boss_polyglot_trial', title: 'Provação do Poliglota (A-Rank)',
    description: 'Idioma: aprende {target} palavras + escreve 5 frases usando-as.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 20, scalingAmount: 0, scalingInterval: 1, unit: 'palavras',
    baseXP: 740, baseGold: 240,
  },
  {
    id: 'boss_culinary_ritual', title: 'Ritual Culinário (A-Rank)',
    description: 'Cozinha: prepara 1 refeição saudável + 1 acompanhamento (do zero).',
    type: 'boss', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'refeição',
    baseXP: 760, baseGold: 250,
  },
  {
    id: 'boss_memory_labyrinth', title: 'Labirinto da Memória (A-Rank)',
    description: 'Memória: {target} min de foco para criar um palácio mental com 12 locais e rever as associações 2 vezes em silêncio.',
    type: 'boss', questType: 'focus',
    baseTarget: 30, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 780, baseGold: 260,
  },
  {
    id: 'boss_new_frontier', title: 'Fronteira Inédita (A-Rank)',
    description: 'Experimenta algo novo: 1 aula curta (20–30 min) + 3 notas do que aprendeste.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'aula',
    baseXP: 800, baseGold: 270,
  },
  {
    id: 'boss_artisan_trial', title: 'Prova do Artesão (A-Rank)',
    description: 'Constrói algo pequeno: 1 objeto útil (ex.: suporte, organizador, remendo).',
    type: 'boss', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'objeto',
    baseXP: 820, baseGold: 280,
  },
  {
    id: 'boss_storm_bringer', title: 'Invocador de Tempestades (S-Rank)',
    description: 'Skill sprint: define uma micro-skill específica que queres aprender. Estuda-a em modo Foco por {target} min e pratica-a imediatamente durante 15 min adicionais — sem avançar para outro tema antes de terminar.',
    type: 'boss', questType: 'focus',
    baseTarget: 45, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1700, baseGold: 760,
  },
  {
    id: 'boss_chrono_master', title: 'Senhor do Tempo (S-Rank)',
    description: 'Timeboxing: {target} min de foco (equivale a 3 blocos Pomodoro de 25 min). Executa com pausas de 5 min entre blocos.',
    type: 'boss', questType: 'focus',
    baseTarget: 75, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1800, baseGold: 820,
  },
  {
    id: 'boss_star_breaker', title: 'Quebrador de Estrelas (S-Rank)',
    description: 'Exploração documentada: percorre {target} km a pé num percurso nunca feito antes. Durante a marcha, identifica e regista (por escrito ou foto) pelo menos 3 elementos novos que nunca tinhas reparado.',
    type: 'boss', questType: 'gps',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 1900, baseGold: 880,
  },
  {
    id: 'boss_cold_philosopher', title: 'O Filósofo da Montanha (A-Rank)',
    description: 'Análise de problema real: define um problema pessoal concreto que estás a adiar. Pesquisa contexto e opiniões opostas durante {target} min (modo Foco ativo) e termina com uma decisão escrita.',
    type: 'boss', questType: 'focus',
    baseTarget: 50, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 760, baseGold: 245,
  },
  {
    id: 'boss_digital_craftsman', title: 'O Artesão Digital (A-Rank)',
    description: 'Constrói algo digital do zero em {target} min: uma página web simples, um script útil, uma apresentação estruturada ou um protótipo. O resultado tem de ser funcional ou apresentável no final.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 850, baseGold: 280,
  },
  {
    id: 'boss_stoic_challenge', title: 'A Prova do Estoico (A-Rank)',
    description: 'Desconforto voluntário: {target} min de treino físico num ambiente frio real (ao ar livre no frio, ou janelas abertas). Modo Foco ativo. Regista como te sentiste antes e depois.',
    type: 'boss', questType: 'focus',
    baseTarget: 20, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 700, baseGold: 220,
  },
];

/** Portais periódicos (rotação diária) — não entram na rotação semanal de bosses. */
const PORTAL_BOSS_IDS = new Set(['alpha_wolf', 'sea_king', 'dungeon_queen', 'king_of_the_dead']);

export function isPortalBossDefinition(def: Pick<QuestDefinition, 'type' | 'id'>): boolean {
  if (def.type !== 'boss') {return false;}
  if (def.id.startsWith('normal_boss_')) {return true;}
  return PORTAL_BOSS_IDS.has(def.id);
}

export function isWeeklyBossDefinition(def: Pick<QuestDefinition, 'type' | 'id'>): boolean {
  return def.type === 'boss' && !isPortalBossDefinition(def);
}

export function getQuestConfig(type: Quest['type']): { icon: string; colorKey: string } {
  switch (type) {
    case 'training': return { icon: 'arm-flex', colorKey: 'neonRed' };
    case 'knowledge': return { icon: 'book-open-variant', colorKey: 'neonBlue' };
    case 'focus': return { icon: 'timer-sand', colorKey: 'purple' };
    case 'forbidden': return { icon: 'lock-open-alert-outline', colorKey: 'gold' };
    case 'limit': return { icon: 'clock-alert-outline', colorKey: 'dimmed' };
    case 'gps': return { icon: 'map-marker-distance', colorKey: 'green' };
    default: return { icon: 'circle-outline', colorKey: 'dimmed' };
  }
}
