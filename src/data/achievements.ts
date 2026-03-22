// ── Achievement types ─────────────────────────────────────────────────────────

export type AchievementCategory =
  | 'streak'
  | 'focus'
  | 'boss'
  | 'level'
  | 'quests'
  | 'economy'
  | 'clutch'
  | 'rebellion'
  | 'time'
  | 'shadow'
  | 'secret'

export type EventTrigger =
  // ── Quest events
  | 'quest_completed'
  | 'all_quests_completed'
  | 'quest_late_night'
  | 'quest_at_midnight_edge'
  | 'quest_undo_then_redo'
  | 'quest_skipped_via_pass'
  // ── Focus events
  | 'focus_session_started'
  | 'focus_session_completed'
  | 'focus_started_after_1am'
  | 'focus_total_hours'
  | 'hardcore_cancel_attempt'
  // ── Boss events
  | 'boss_defeated'
  | 'boss_gps_completed'
  | 'boss_focus_completed'
  | 'boss_training_completed'
  // ── Streak events
  | 'streak_updated'
  | 'streak_protected'
  // ── Economy events
  | 'item_purchased'
  | 'lagrima_used_during_penalty'
  | 'reloj_used'
  | 'gold_total_earned'
  | 'gold_spent_total'
  | 'shop_visited'
  // ── Side quest events
  | 'side_quest_added'
  | 'side_quest_c_rank'
  | 'side_quest_completed'
  // ── Shadow / Level events
  | 'shadow_collected'
  | 'level_up'
  // ── Rebellion events
  | 'blocked_app_attempt'
  | 'blocked_app_spam'
  // ── Penalty events
  | 'penalty_triggered'
  | 'penalty_cleared'
  // ── Daily login events
  | 'daily_login'
  | 'login_streak_achieved'

// A single progression step within a tiered achievement.
export type AchievementTier = {
  rank:        'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Lendário'
  targetValue: number
  rewardGold:  number
  rewardXP?:   number
}

export type Achievement = {
  id:            string
  title:         string
  description:   string
  category:      AchievementCategory
  conditionType: EventTrigger        // primary event that triggers this
  icon:          string
  color:         string
  isSecret:      boolean
  // Reward for non-tiered (instant) achievements:
  rewardGold:    number
  rewardXP?:     number
  // Internal tiers — if present, the achievement evolves instead of unlocking once:
  tiers?:        AchievementTier[]
}

// ── Tier rank colours ─────────────────────────────────────────────────────────

export const TIER_COLORS: Record<NonNullable<AchievementTier['rank']>, string> = {
  Bronze:   '#b45309',
  Prata:    '#94a3b8',
  Ouro:     '#f59e0b',
  Platina:  '#e2e8f0',
  Lendário: '#f97316',
}

// ── Progress helpers ──────────────────────────────────────────────────────────

export type AchievementProg = { currentValue: number; currentTierIndex: number }

/** Index of the tier currently being worked on (= number of completed tiers). */
export function getTierIndex(prog: AchievementProg | undefined): number {
  return prog?.currentTierIndex ?? 0
}

/** True when every tier is done (or the achievement is fully unlocked). */
export function isAchievementMaxed(a: Achievement, prog: AchievementProg | undefined): boolean {
  if (!a.tiers) return false
  return getTierIndex(prog) >= a.tiers.length
}

/** Tier currently in progress (undefined = maxed or no tiers). */
export function getActiveTier(a: Achievement, prog: AchievementProg | undefined): AchievementTier | undefined {
  if (!a.tiers) return undefined
  const idx = getTierIndex(prog)
  return idx < a.tiers.length ? a.tiers[idx] : undefined
}

/** Last completed tier (undefined = none completed yet). */
export function getCompletedTier(a: Achievement, prog: AchievementProg | undefined): AchievementTier | undefined {
  if (!a.tiers) return undefined
  const idx = getTierIndex(prog)
  return idx > 0 ? a.tiers[idx - 1] : undefined
}

// ── Achievement Catalog — 42 unique concepts ──────────────────────────────────

export const ACHIEVEMENTS_CATALOG: Achievement[] = [

  // ── STREAK ──────────────────────────────────────────────────────────────────

  {
    id: 'streak_chain', title: 'Chama do Caçador',
    description: 'Mantém o streak de missões diárias. A chama do Monarca não deve apagar-se.',
    category: 'streak', conditionType: 'streak_updated',
    icon: 'fire', color: '#f97316', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',   targetValue: 3,   rewardGold: 30 },
      { rank: 'Prata',    targetValue: 7,   rewardGold: 75 },
      { rank: 'Ouro',     targetValue: 30,  rewardGold: 300 },
      { rank: 'Platina',  targetValue: 100, rewardGold: 1000 },
      { rank: 'Lendário', targetValue: 365, rewardGold: 5000, rewardXP: 100 },
    ],
  },
  {
    id: 'streak_phoenix', title: 'Fénix das Cinzas',
    description: 'Perdeste um streak de mais de 10 dias e voltaste a atingir 3 dias de novo.',
    category: 'streak', conditionType: 'streak_updated',
    icon: 'feather', color: '#ef4444', isSecret: true, rewardGold: 100,
  },
  {
    id: 'streak_scroll_save', title: 'Estrategista',
    description: 'Usa o Pergaminho de Repouso para proteger um streak de 7+ dias.',
    category: 'streak', conditionType: 'streak_protected',
    icon: 'script-text-outline', color: '#22c55e', isSecret: false, rewardGold: 80,
  },

  // ── FOCUS ────────────────────────────────────────────────────────────────────

  {
    id: 'focus_hours', title: 'Fortaleza Mental',
    description: 'Acumula horas em modo de foco. A mente do Monarca não conhece limites.',
    category: 'focus', conditionType: 'focus_total_hours',
    icon: 'brain', color: '#a855f7', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',  targetValue: 600,   rewardGold: 50 },    // 10h
      { rank: 'Prata',   targetValue: 3000,  rewardGold: 200 },   // 50h
      { rank: 'Ouro',    targetValue: 12000, rewardGold: 750 },   // 200h
      { rank: 'Platina', targetValue: 30000, rewardGold: 2000, rewardXP: 50 }, // 500h
    ],
  },
  {
    id: 'focus_sessions', title: 'Disciplina de Ferro',
    description: 'Completa sessões de Focus Mode. O Monarca treina a mente sem parar.',
    category: 'focus', conditionType: 'focus_session_completed',
    icon: 'timer-outline', color: '#3b82f6', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze', targetValue: 10,  rewardGold: 60 },
      { rank: 'Prata',  targetValue: 50,  rewardGold: 250 },
      { rank: 'Ouro',   targetValue: 200, rewardGold: 1000, rewardXP: 30 },
    ],
  },
  {
    id: 'focus_night_owl', title: 'Coruja da Noite',
    description: 'Inicia o Focus Mode depois da 01:00 da manhã.',
    category: 'time', conditionType: 'focus_started_after_1am',
    icon: 'weather-night', color: '#6366f1', isSecret: false, rewardGold: 40,
  },
  {
    id: 'focus_hardcore_surrender', title: 'Arrependimento Frio',
    description: 'Tentaste sair do Hardcore Focus Mode, mas voltaste atrás no modal de confirmação.',
    category: 'clutch', conditionType: 'hardcore_cancel_attempt',
    icon: 'undo-variant', color: '#06b6d4', isSecret: true, rewardGold: 35,
  },
  {
    id: 'focus_igris', title: 'Trono Conquistado',
    description: 'Completa o desafio Boss "O Trono de Igris" (90 min de foco).',
    category: 'boss', conditionType: 'boss_focus_completed',
    icon: 'timer-sand', color: '#a855f7', isSecret: false, rewardGold: 120,
  },
  {
    id: 'focus_long_session', title: 'Ultra Foco',
    description: 'Completa uma sessão de Focus Mode com 2 ou mais horas de duração.',
    category: 'focus', conditionType: 'focus_session_completed',
    icon: 'flash', color: '#f59e0b', isSecret: true, rewardGold: 100,
  },

  // ── BOSS RAIDS ────────────────────────────────────────────────────────────────

  {
    id: 'boss_slayer', title: 'Terror das Masmorras',
    description: 'Derrota Boss Raids. A lenda do Monarca das Sombras espalha-se por todo o reino.',
    category: 'boss', conditionType: 'boss_defeated',
    icon: 'castle', color: '#ef4444', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',  targetValue: 5,   rewardGold: 100 },
      { rank: 'Prata',   targetValue: 20,  rewardGold: 500 },
      { rank: 'Ouro',    targetValue: 50,  rewardGold: 1500 },
      { rank: 'Platina', targetValue: 100, rewardGold: 5000, rewardXP: 50 },
    ],
  },
  {
    id: 'boss_runner', title: 'O Veneno Não Me Alcança',
    description: 'Completa o Boss "Veneno de Kasaka" (5km GPS run).',
    category: 'boss', conditionType: 'boss_gps_completed',
    icon: 'run-fast', color: '#22c55e', isSecret: false, rewardGold: 130,
  },
  {
    id: 'boss_cerberus', title: 'Mais Forte que Três',
    description: 'Completa o Boss "Rugido de Cerberus" (100+100+30 físico).',
    category: 'boss', conditionType: 'boss_training_completed',
    icon: 'dog', color: '#ef4444', isSecret: false, rewardGold: 110,
  },
  {
    id: 'boss_omega_slayer', title: 'Curto-Circuito',
    description: 'Completa o Boss "Arma Ómega (S-Rank)" provando a tua resistência insana.',
    category: 'boss', conditionType: 'boss_gps_completed',
    icon: 'nuke', color: '#f59e0b', isSecret: false, rewardGold: 300,
  },
  {
    id: 'boss_eclipse_survivor', title: 'Sobrevivente do Vazio',
    description: 'Completa o Boss "Eclipse Cósmico (S-Rank)". Absorveste conhecimento puro sob tensão.',
    category: 'boss', conditionType: 'boss_focus_completed',
    icon: 'moon-new', color: '#a855f7', isSecret: true, rewardGold: 500,
  },
  {
    id: 'boss_seraph_fall', title: 'Anjo Dourado Quebrado',
    description: 'Completa o Boss "Lâmina Serafim Caído (S-Rank)". Dobraste a luz sagrada com a tua Sombra.',
    category: 'boss', conditionType: 'boss_focus_completed',
    icon: 'sword-cross', color: '#facc15', isSecret: true, rewardGold: 450,
  },
  {
    id: 'boss_archlich_prime', title: 'Coroa do Arquilich',
    description: 'Completa o Boss "Arquilich Primordial (S-Rank)". O ritual antigo agora obedece ao Monarca.',
    category: 'boss', conditionType: 'boss_focus_completed',
    icon: 'skull-crossbones', color: '#a855f7', isSecret: true, rewardGold: 500,
  },
  {
    id: 'boss_soul_reaper', title: 'Ceifador do Vazio',
    description: 'Completa o Boss "Ceifeiro de Almas (S-Rank)". Nenhuma essência te escapa.',
    category: 'boss', conditionType: 'boss_focus_completed',
    icon: 'skull', color: '#ef4444', isSecret: true, rewardGold: 520,
  },
  {
    id: 'boss_astral_nebula', title: 'Rei das Nebulosas',
    description: 'Completa o Boss "Rei Nebulosa (S-Rank)". Caminhaste entre estrelas sem vacilar.',
    category: 'boss', conditionType: 'boss_gps_completed',
    icon: 'star-four-points', color: '#38bdf8', isSecret: true, rewardGold: 480,
  },

  // ── EVENT BOSSES ──────────────────────────────────────────────────────────────
  {
    id: 'event_halloween_reaper', title: 'Ceifador de Outono',
    description: 'Derrota o Boss de evento do Halloween. A névoa abre caminho para o Monarca.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'ghost', color: '#f97316', isSecret: true, rewardGold: 400,
  },
  {
    id: 'event_winter_lich', title: 'Coroa do Solstício',
    description: 'Derrota o Boss de evento do Inverno. A noite mais longa curvou-se.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'snowflake', color: '#60a5fa', isSecret: true, rewardGold: 420,
  },
  {
    id: 'event_summer_titan', title: 'Fúria do Sol',
    description: 'Derrota o Boss de evento de Verão. O calor extremo fortaleceu a tua vontade.',
    category: 'secret', conditionType: 'boss_training_completed',
    icon: 'weather-sunny', color: '#f59e0b', isSecret: true, rewardGold: 380,
  },
  {
    id: 'event_new_year_ashen', title: 'Renascimento das Cinzas',
    description: 'Derrota o Boss do Ano Novo. O recomeço foi selado pela tua sombra.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'fire', color: '#f97316', isSecret: true, rewardGold: 380,
  },
  {
    id: 'event_valentine_oath', title: 'Voto Rubro',
    description: 'Derrota o Boss de Valentim. A promessa foi gravada no Sistema.',
    category: 'secret', conditionType: 'boss_training_completed',
    icon: 'star', color: '#fb7185', isSecret: true, rewardGold: 360,
  },
  {
    id: 'event_carnival_mask', title: 'Máscara do Caos',
    description: 'Derrota o Boss de Carnaval. O caos dançou a teu favor.',
    category: 'secret', conditionType: 'boss_gps_completed',
    icon: 'star', color: '#a855f7', isSecret: true, rewardGold: 360,
  },
  {
    id: 'event_equinox_guardian', title: 'Guardião do Equilíbrio',
    description: 'Derrota o Boss do Equinócio. Mantiveste o equilíbrio perfeito.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'shield-check', color: '#22c55e', isSecret: true, rewardGold: 400,
  },
  {
    id: 'event_easter_hare', title: 'Salto de Páscoa',
    description: 'Derrota o Boss de Páscoa. O salto da luz foi teu.',
    category: 'secret', conditionType: 'boss_gps_completed',
    icon: 'star-circle-outline', color: '#facc15', isSecret: true, rewardGold: 360,
  },
  {
    id: 'event_spring_bloom', title: 'Flor da Renascença',
    description: 'Derrota o Boss da Primavera. A vida floresceu na tua senda.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'feather', color: '#34d399', isSecret: true, rewardGold: 360,
  },
  {
    id: 'event_harvest_king', title: 'Rei da Colheita',
    description: 'Derrota o Boss da Colheita. A abundância pertence ao Monarca.',
    category: 'secret', conditionType: 'boss_training_completed',
    icon: 'trophy', color: '#f59e0b', isSecret: true, rewardGold: 380,
  },
  {
    id: 'event_black_friday_merchant', title: 'Mercador da Sombra',
    description: 'Derrota o Boss de Black Friday. O ouro obedece.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'cash-multiple', color: '#0ea5e9', isSecret: true, rewardGold: 360,
  },
  {
    id: 'event_yule_seraph', title: 'Serafim do Yule',
    description: 'Derrota o Boss do Yule. A noite sagrada cedeu.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'star-four-points', color: '#93c5fd', isSecret: true, rewardGold: 420,
  },
  {
    id: 'event_midnight_wraith', title: 'Wraith da Meia-Noite',
    description: 'Derrota o Boss das Noites Longas. A escuridão já não te domina.',
    category: 'secret', conditionType: 'boss_focus_completed',
    icon: 'skull', color: '#64748b', isSecret: true, rewardGold: 360,
  },
  {
    id: 'event_festival_drake', title: 'Drake do Festival',
    description: 'Derrota o Boss do Festival. A chama celebrou contigo.',
    category: 'secret', conditionType: 'boss_gps_completed',
    icon: 'flag', color: '#f97316', isSecret: true, rewardGold: 380,
  },

  // ── LEVEL / ASCENSÃO ──────────────────────────────────────────────────────────


  {
    id: 'level_chain', title: 'Ascensão do Caçador',
    description: 'Aumenta o teu nível. O poder do Monarca das Sombras não conhece teto.',
    category: 'level', conditionType: 'level_up',
    icon: 'arrow-up-bold', color: '#22c55e', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',  targetValue: 6,  rewardGold: 50 },
      { rank: 'Prata',   targetValue: 10, rewardGold: 100 },
      { rank: 'Ouro',    targetValue: 20, rewardGold: 500 },
      { rank: 'Platina', targetValue: 30, rewardGold: 2000, rewardXP: 50 },
    ],
  },
  {
    id: 'secret_monarch', title: 'Monarca das Sombras',
    description: 'Alcança o Nível 20. O título de Monarca das Sombras é oficialmente concedido pelo Sistema.',
    category: 'secret', conditionType: 'level_up',
    icon: 'skull-crossbones', color: '#ef4444', isSecret: true, rewardGold: 500, rewardXP: 50,
  },

  // ── SHADOW ARMY ───────────────────────────────────────────────────────────────

  {
    id: 'shadow_army', title: 'Exército das Sombras',
    description: 'Recolhe sombras para o teu exército. O Monarca comanda a todos.',
    category: 'shadow', conditionType: 'shadow_collected',
    icon: 'ghost', color: '#a855f7', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',  targetValue: 1,  rewardGold: 200 },
      { rank: 'Prata',   targetValue: 5,  rewardGold: 500 },
      { rank: 'Ouro',    targetValue: 10, rewardGold: 1500 },
      { rank: 'Platina', targetValue: 20, rewardGold: 5000, rewardXP: 50 },
    ],
  },
  {
    id: 'shadow_elite', title: 'Vanguarda das Sombras',
    description: 'Tem 3 ou mais sombras ativas em simultâneo no campo de batalha.',
    category: 'shadow', conditionType: 'shadow_collected',
    icon: 'account-group', color: '#a855f7', isSecret: true, rewardGold: 300,
  },

  // ── QUESTS ───────────────────────────────────────────────────────────────────

  {
    id: 'quests_perfect', title: 'Sem Falhas',
    description: 'Completa todos os dias sem falhar uma missão. O Sistema observa a tua disciplina.',
    category: 'quests', conditionType: 'all_quests_completed',
    icon: 'check-all', color: '#22c55e', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',   targetValue: 7,   rewardGold: 120 },
      { rank: 'Prata',    targetValue: 30,  rewardGold: 500 },
      { rank: 'Ouro',     targetValue: 100, rewardGold: 1500 },
      { rank: 'Platina',  targetValue: 365, rewardGold: 10000, rewardXP: 100 },
    ],
  },
  {
    id: 'quests_total', title: 'Guerreiro Imparável',
    description: 'Completa missões diárias em acumulado. Cada missão forja o Monarca.',
    category: 'quests', conditionType: 'quest_completed',
    icon: 'sword-cross', color: '#3b82f6', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze',  targetValue: 50,   rewardGold: 80 },
      { rank: 'Prata',   targetValue: 200,  rewardGold: 400 },
      { rank: 'Ouro',    targetValue: 500,  rewardGold: 2000 },
      { rank: 'Platina', targetValue: 1000, rewardGold: 10000, rewardXP: 50 },
    ],
  },
  {
    id: 'quests_perfect_week', title: 'Semana Perfeita',
    description: 'Completa todas as missões durante uma semana inteira.',
    category: 'quests', conditionType: 'all_quests_completed',
    icon: 'calendar-star', color: '#fbbf24', isSecret: false, rewardGold: 100,
  },
  {
    id: 'side_quest_first', title: 'Iniciativa Própria',
    description: 'Adiciona a tua primeira missão secundária ao Sistema.',
    category: 'quests', conditionType: 'side_quest_added',
    icon: 'plus-circle', color: '#a855f7', isSecret: false, rewardGold: 15,
  },
  {
    id: 'side_quest_chain', title: 'Agente de Campo',
    description: 'Completa missões secundárias em acumulado. O Monarca não se limita ao Sistema.',
    category: 'quests', conditionType: 'side_quest_completed',
    icon: 'sword-cross', color: '#a855f7', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze', targetValue: 5,   rewardGold: 65 },
      { rank: 'Prata',  targetValue: 25,  rewardGold: 200 },
      { rank: 'Ouro',   targetValue: 100, rewardGold: 1000 },
    ],
  },
  {
    id: 'side_quest_daily_five', title: 'A Agenda do Caçador',
    description: 'Completa 5 ou mais missões secundárias num único dia.',
    category: 'quests', conditionType: 'side_quest_completed',
    icon: 'calendar-check', color: '#a855f7', isSecret: false, rewardGold: 65,
  },
  {
    id: 'login_chain', title: 'Presença do Monarca',
    description: 'Abre a app diariamente. O Sistema regista a tua constância ao longo do tempo.',
    category: 'streak', conditionType: 'daily_login',
    icon: 'calendar-check', color: '#3b82f6', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze', targetValue: 7,   rewardGold: 30 },
      { rank: 'Prata',  targetValue: 30,  rewardGold: 100 },
      { rank: 'Ouro',   targetValue: 100, rewardGold: 400 },
    ],
  },

  // ── ECONOMY ──────────────────────────────────────────────────────────────────

  {
    id: 'economy_first_purchase', title: 'Caçador Consumidor',
    description: 'Compra o teu primeiro item na Loja do Sistema.',
    category: 'economy', conditionType: 'item_purchased',
    icon: 'cart-plus', color: '#f59e0b', isSecret: false, rewardGold: 20,
  },
  {
    id: 'economy_system_pass', title: 'Privilégio Caro',
    description: 'Usa o Passe do Sistema para saltar uma missão diária.',
    category: 'economy', conditionType: 'quest_skipped_via_pass',
    icon: 'ticket-confirmation-outline', color: '#f59e0b', isSecret: false, rewardGold: 30,
  },
  {
    id: 'economy_lagrima_clutch', title: 'Ressurreição',
    description: 'Usa a Lágrima da Purificação enquanto a penalidade está ativa.',
    category: 'economy', conditionType: 'lagrima_used_during_penalty',
    icon: 'water-outline', color: '#38bdf8', isSecret: false, rewardGold: 50,
  },
  {
    id: 'economy_reloj', title: 'Tempo é Ouro',
    description: 'Usa o Relógio de Ampulheta durante uma Boss Raid.',
    category: 'economy', conditionType: 'reloj_used',
    icon: 'timer-sand', color: '#fbbf24', isSecret: true, rewardGold: 55,
  },
  {
    id: 'economy_hoarder', title: 'O Avaro do Sistema',
    description: 'Acumula 5000 Gold sem gastar. O Sistema nota a tua paciência infinita.',
    category: 'economy', conditionType: 'gold_total_earned',
    icon: 'piggy-bank-outline', color: '#f59e0b', isSecret: false, rewardGold: 75,
  },
  {
    id: 'economy_spender', title: 'Investe no Sistema',
    description: 'Gasta 3000 Gold total na Loja ao longo do tempo.',
    category: 'economy', conditionType: 'gold_spent_total',
    icon: 'rhombus', color: '#22c55e', isSecret: false, rewardGold: 60,
  },
  {
    id: 'economy_big_spender', title: 'Mecenas do Sistema',
    description: 'Gasta ouro na loja em acumulado. O Sistema prospera com a tua dedicação.',
    category: 'economy', conditionType: 'gold_spent_total',
    icon: 'cash-multiple', color: '#f59e0b', isSecret: false, rewardGold: 0,
    tiers: [
      { rank: 'Bronze', targetValue: 1000,  rewardGold: 30 },
      { rank: 'Prata',  targetValue: 5000,  rewardGold: 100 },
      { rank: 'Ouro',   targetValue: 20000, rewardGold: 500 },
    ],
  },

  // ── CLUTCH ───────────────────────────────────────────────────────────────────

  {
    id: 'clutch_last_minute', title: 'À Beira da Morte',
    description: 'Completa a última missão diária com menos de 30 minutos para a meia-noite.',
    category: 'clutch', conditionType: 'quest_at_midnight_edge',
    icon: 'clock-alert', color: '#ef4444', isSecret: false, rewardGold: 60,
  },
  {
    id: 'clutch_late_night', title: 'Ignorando o Sistema',
    description: 'Conclui a última missão diária entre as 23:30 e as 23:59.',
    category: 'clutch', conditionType: 'quest_late_night',
    icon: 'bell-off-outline', color: '#f97316', isSecret: true, rewardGold: 45,
  },
  {
    id: 'clutch_undo_redo', title: 'Comprometido com a Exatidão',
    description: 'Desfaz uma missão e volta a completá-la no mesmo dia.',
    category: 'clutch', conditionType: 'quest_undo_then_redo',
    icon: 'refresh', color: '#06b6d4', isSecret: true, rewardGold: 25,
  },

  // ── REBELLION ─────────────────────────────────────────────────────────────────

  {
    id: 'rebellion_spam', title: 'Rebelião',
    description: 'Tentaste abrir uma app bloqueada 5 vezes em menos de 1 minuto. O Sistema nota a tua fraqueza.',
    category: 'rebellion', conditionType: 'blocked_app_spam',
    icon: 'cellphone-lock', color: '#ef4444', isSecret: true, rewardGold: 20,
  },
  {
    id: 'rebellion_resist', title: 'Tentação Resistida',
    description: 'Tentaste abrir uma app bloqueada e desististe. O Sistema aprova.',
    category: 'rebellion', conditionType: 'blocked_app_attempt',
    icon: 'shield-half', color: '#22c55e', isSecret: true, rewardGold: 10,
  },
  {
    id: 'rebellion_c_rank', title: 'Sorte de Rank S',
    description: 'A roleta atribui Rank C à tua primeira Side Quest.',
    category: 'secret', conditionType: 'side_quest_c_rank',
    icon: 'dice-3', color: '#00d4ff', isSecret: true, rewardGold: 40,
  },

  // ── PENALTY ───────────────────────────────────────────────────────────────────

  {
    id: 'penalty_first', title: 'Punido pelo Sistema',
    description: 'Entras na Zona de Penalidade pela primeira vez. O Sistema esperava mais.',
    category: 'secret', conditionType: 'penalty_triggered',
    icon: 'alert-octagon', color: '#ef4444', isSecret: true, rewardGold: 0, rewardXP: 5,
  },
  {
    id: 'penalty_cleared', title: 'Redenção',
    description: 'Elimina uma penalidade ativa (por qualquer meio).',
    category: 'clutch', conditionType: 'penalty_cleared',
    icon: 'check-circle-outline', color: '#22c55e', isSecret: false, rewardGold: 40,
  },
  {
    id: 'penalty_comeback', title: 'Ressurgimento',
    description: 'Completa todas as missões no dia seguinte a uma penalidade ativa.',
    category: 'clutch', conditionType: 'all_quests_completed',
    icon: 'arrow-up-circle', color: '#f97316', isSecret: true, rewardGold: 80,
  },

  // ── TIME / SECRET ─────────────────────────────────────────────────────────────

  {
    id: 'dawn_warrior', title: 'Guerreiro da Madrugada',
    description: 'Completa uma missão antes das 07:00 da manhã.',
    category: 'time', conditionType: 'quest_completed',
    icon: 'weather-sunset-up', color: '#f97316', isSecret: false, rewardGold: 35,
  },
  {
    id: 'secret_first_day', title: 'A Jornada Começa',
    description: 'Completas todas as missões no teu primeiro dia de caçador.',
    category: 'secret', conditionType: 'all_quests_completed',
    icon: 'flag', color: '#fbbf24', isSecret: true, rewardGold: 50,
  },
  {
    id: 'secret_all_bosses', title: 'Caçador Completo',
    description: 'Completa um boss de cada tipo: GPS (Kasaka), Foco (Igris) e Treino (Cerberus).',
    category: 'secret', conditionType: 'boss_defeated',
    icon: 'sword', color: '#f59e0b', isSecret: true, rewardGold: 500,
  },
]

// ── Maps ──────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_MAP: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS_CATALOG.map(a => [a.id, a]))

export const ACHIEVEMENTS_BY_CATEGORY: Record<AchievementCategory, Achievement[]> =
  ACHIEVEMENTS_CATALOG.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {} as Record<AchievementCategory, Achievement[]>)
