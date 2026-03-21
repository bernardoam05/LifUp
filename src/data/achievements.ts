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

// EventTrigger is the event type emitted by actions in the store.
// Each achievement listens to one or more of these triggers.
// Add future achievements by: (1) adding a new EventTrigger value below,
// (2) emitting it from the relevant store action, and (3) adding the
// achievement entry referencing that conditionType.
export type EventTrigger =
  // ── Quest events
  | 'quest_completed'           // any daily quest completed
  | 'all_quests_completed'      // all daily quests done in one day
  | 'quest_late_night'          // quest completed after 23:30
  | 'quest_at_midnight_edge'    // last quest completed with < 30min to midnight
  | 'quest_undo_then_redo'      // quest undone and re-completed same day
  | 'quest_skipped_via_pass'    // System Pass used to skip a quest
  // ── Focus events
  | 'focus_session_started'     // a focus timer started
  | 'focus_session_completed'   // a focus timer completed
  | 'focus_started_after_1am'   // focus mode started after 01:00
  | 'focus_total_hours'         // cumulative focus time milestone
  | 'hardcore_cancel_attempt'   // tried to break hardcore but cancelled in modal
  // ── Boss events
  | 'boss_defeated'             // a dungeon boss was defeated
  | 'boss_gps_completed'        // specifically the Kasaka GPS mission
  | 'boss_focus_completed'      // specifically the Igris focus mission
  | 'boss_training_completed'   // specifically the Cerberus training mission
  // ── Streak events
  | 'streak_updated'            // streak increased
  | 'streak_protected'          // Rest Scroll protected the streak
  // ── Economy events
  | 'item_purchased'            // any shop item purchased
  | 'lagrima_used_during_penalty' // Lágrima used while penalty is active
  | 'reloj_used'                // Ampulheta used
  | 'gold_total_earned'         // cumulative gold milestone
  | 'gold_spent_total'          // cumulative gold spent milestone
  | 'shop_visited'              // shop opened (future — not yet tracked)
  // ── Side quest events
  | 'side_quest_added'          // user added a side quest
  | 'side_quest_c_rank'         // a side quest came out rank C
  | 'side_quest_completed'      // any side quest completed
  // ── Shadow / Level events
  | 'shadow_collected'          // first shadow obtained
  | 'level_up'                  // player leveled up
  // ── Rebellion events
  | 'blocked_app_attempt'       // blocked app opened while focus active (native)
  | 'blocked_app_spam'          // blocked app opened 5+ times in 1 minute
  // ── Penalty events
  | 'penalty_triggered'         // penalty zone activated
  | 'penalty_cleared'           // penalty cleared (any means)
  // ── Daily login events
  | 'daily_login'               // app opened / bootSystem ran
  | 'login_streak_achieved'     // milestone login streak

export type Achievement = {
  id:             string
  title:          string
  description:    string
  category:       AchievementCategory
  conditionType:  EventTrigger         // primary event that can trigger this
  icon:           string
  color:          string
  rewardGold:     number
  rewardXP?:      number
  isSecret:       boolean
}

// ── Achievement Database — 40 unique behavioral achievements ─────────────────
// RULE: No lazy linear progression ("do 10", "do 50", "do 100").
// Every achievement has a specific behavioral, temporal, or clutch trigger.

export const ACHIEVEMENTS_CATALOG: Achievement[] = [

  // ── STREAK ──────────────────────────────────────────────────────────────────

  {
    id: 'streak_first_fire',
    title: 'Primeira Chama',
    description: '3 dias consecutivos de missões completadas.',
    category: 'streak', conditionType: 'streak_updated',
    icon: 'fire', color: '#f97316', rewardGold: 30, isSecret: false,
  },
  {
    id: 'streak_survivor',
    title: 'Sobrevivente',
    description: '7 dias consecutivos sem falhar.',
    category: 'streak', conditionType: 'streak_updated',
    icon: 'shield-check', color: '#22c55e', rewardGold: 75, isSecret: false,
  },
  {
    id: 'streak_relentless',
    title: 'Caçador Implacável',
    description: '30 dias consecutivos. O Sistema inclina a cabeça.',
    category: 'streak', conditionType: 'streak_updated',
    icon: 'crown', color: '#f59e0b', rewardGold: 300, isSecret: false,
  },
  {
    id: 'streak_phoenix',
    title: 'Fénix das Cinzas',
    description: 'Recomeça o streak depois de o ter perdido acima de 10 dias, e atinge 3 dias de novo.',
    category: 'streak', conditionType: 'streak_updated',
    icon: 'feather', color: '#ef4444', rewardGold: 100, isSecret: true,
  },
  {
    id: 'streak_scroll_save',
    title: 'Estrategista',
    description: 'Usa o Pergaminho de Repouso para proteger um streak de 7+ dias.',
    category: 'streak', conditionType: 'streak_protected',
    icon: 'script-text-outline', color: '#22c55e', rewardGold: 80, isSecret: false,
  },

  // ── FOCUS ────────────────────────────────────────────────────────────────────

  {
    id: 'focus_total_5h',
    title: 'Mente Concentrada',
    description: '5 horas totais acumuladas em modo de foco.',
    category: 'focus', conditionType: 'focus_total_hours',
    icon: 'timer-outline', color: '#a855f7', rewardGold: 50, isSecret: false,
  },
  {
    id: 'focus_total_24h',
    title: 'Mente de Ferro',
    description: '24 horas totais em modo de foco.',
    category: 'focus', conditionType: 'focus_total_hours',
    icon: 'brain', color: '#3b82f6', rewardGold: 200, isSecret: false,
  },
  {
    id: 'focus_night_owl',
    title: 'Coruja da Noite',
    description: 'Inicia o Focus Mode depois da 01:00 da manhã.',
    category: 'time', conditionType: 'focus_started_after_1am',
    icon: 'weather-night', color: '#6366f1', rewardGold: 40, isSecret: false,
  },
  {
    id: 'focus_hardcore_surrender',
    title: 'Arrependimento Frio',
    description: 'Tenta sair do Hardcore Focus Mode, mas cancela no modal de confirmação.',
    category: 'clutch', conditionType: 'hardcore_cancel_attempt',
    icon: 'undo-variant', color: '#06b6d4', rewardGold: 35, isSecret: true,
  },
  {
    id: 'focus_igris_completed',
    title: 'Trono Conquistado',
    description: 'Completa o desafio Boss "O Trono de Igris" (90 min de foco).',
    category: 'boss', conditionType: 'boss_focus_completed',
    icon: 'timer-sand', color: '#a855f7', rewardGold: 120, isSecret: false,
  },

  // ── BOSS RAIDS ────────────────────────────────────────────────────────────────

  {
    id: 'boss_first_kill',
    title: 'Assassino de Kasaka',
    description: 'Derrota o teu primeiro Boss Raid.',
    category: 'boss', conditionType: 'boss_defeated',
    icon: 'sword', color: '#ef4444', rewardGold: 150, isSecret: false,
  },
  {
    id: 'boss_hat_trick',
    title: 'Limpador de Masmorras',
    description: 'Derrota 3 Boss Raids no total.',
    category: 'boss', conditionType: 'boss_defeated',
    icon: 'castle', color: '#f59e0b', rewardGold: 400, isSecret: false,
  },
  {
    id: 'boss_runner',
    title: 'O Veneno Não Me Alcança',
    description: 'Completa o Boss "Veneno de Kasaka" (5km GPS run).',
    category: 'boss', conditionType: 'boss_gps_completed',
    icon: 'run-fast', color: '#22c55e', rewardGold: 130, isSecret: false,
  },
  {
    id: 'boss_cerberus',
    title: 'Mais Forte que Três',
    description: 'Completa o Boss "Rugido de Cerberus" (100+100+30 físico).',
    category: 'boss', conditionType: 'boss_training_completed',
    icon: 'dog', color: '#ef4444', rewardGold: 110, isSecret: false,
  },

  // ── LEVEL MILESTONES ──────────────────────────────────────────────────────────

  {
    id: 'level_d_rank',
    title: 'D-Rank Ascendido',
    description: 'Alcança o nível 6. A cor muda nos olhos do Sistema.',
    category: 'level', conditionType: 'level_up',
    icon: 'arrow-up-bold', color: '#22c55e', rewardGold: 50, isSecret: false,
  },
  {
    id: 'level_awakening',
    title: 'O Despertar',
    description: 'Alcança o nível 10. As sombras começam a responder.',
    category: 'level', conditionType: 'level_up',
    icon: 'lightning-bolt', color: '#3b82f6', rewardGold: 100, isSecret: false,
  },
  {
    id: 'level_shadow_monarch',
    title: 'Monarca das Sombras',
    description: 'Alcança o nível 20. Poucos chegam aqui.',
    category: 'level', conditionType: 'level_up',
    icon: 'skull-crossbones', color: '#ef4444', rewardGold: 500, isSecret: false,
  },

  // ── QUESTS ───────────────────────────────────────────────────────────────────

  {
    id: 'quests_perfect_week',
    title: 'Semana Perfeita',
    description: 'Completa todos os dias de uma semana sem falhar nenhuma missão.',
    category: 'quests', conditionType: 'all_quests_completed',
    icon: 'calendar-star', color: '#fbbf24', rewardGold: 100, isSecret: false,
  },
  {
    id: 'quests_perfect_days_7',
    title: 'Hábito Forjado',
    description: '7 dias perfeitos acumulados ao longo do tempo.',
    category: 'quests', conditionType: 'all_quests_completed',
    icon: 'check-all', color: '#22c55e', rewardGold: 120, isSecret: false,
  },

  // ── CLUTCH ───────────────────────────────────────────────────────────────────

  {
    id: 'clutch_last_minute',
    title: 'À Beira da Morte',
    description: 'Completa a última missão diária com menos de 30 minutos para a meia-noite.',
    category: 'clutch', conditionType: 'quest_at_midnight_edge',
    icon: 'clock-alert', color: '#ef4444', rewardGold: 60, isSecret: false,
  },
  {
    id: 'clutch_late_night',
    title: 'Ignorando o Sistema',
    description: 'Recebe o aviso de 23h e conclui a última missão entre as 23:30 e as 23:59.',
    category: 'clutch', conditionType: 'quest_late_night',
    icon: 'bell-off-outline', color: '#f97316', rewardGold: 45, isSecret: true,
  },
  {
    id: 'clutch_undo_redo',
    title: 'Comprometido com a Exatidão',
    description: 'Desfaz uma missão e volta a completá-la no mesmo dia.',
    category: 'clutch', conditionType: 'quest_undo_then_redo',
    icon: 'refresh', color: '#06b6d4', rewardGold: 25, isSecret: true,
  },

  // ── ECONOMY ──────────────────────────────────────────────────────────────────

  {
    id: 'economy_first_purchase',
    title: 'Caçador Consumidor',
    description: 'Compra o teu primeiro item na Loja do Sistema.',
    category: 'economy', conditionType: 'item_purchased',
    icon: 'cart-plus', color: '#f59e0b', rewardGold: 20, isSecret: false,
  },
  {
    id: 'economy_system_pass',
    title: 'Privilégio Caro',
    description: 'Usa o Passe do Sistema (3000G) para saltar uma missão.',
    category: 'economy', conditionType: 'quest_skipped_via_pass',
    icon: 'ticket-confirmation-outline', color: '#f59e0b', rewardGold: 30, isSecret: false,
  },
  {
    id: 'economy_lagrima_clutch',
    title: 'Ressurreição',
    description: 'Usa a Lágrima da Purificação enquanto a penalidade está ativa.',
    category: 'economy', conditionType: 'lagrima_used_during_penalty',
    icon: 'water-outline', color: '#38bdf8', rewardGold: 50, isSecret: false,
  },
  {
    id: 'economy_double_time',
    title: 'Tempo é Ouro',
    description: 'Usa o Relógio de Ampulheta numa missão de Boss Raid.',
    category: 'economy', conditionType: 'reloj_used',
    icon: 'timer-sand', color: '#fbbf24', rewardGold: 55, isSecret: true,
  },
  {
    id: 'economy_hoarder',
    title: 'O Avaro do Sistema',
    description: 'Acumula 5000 Gold sem gastar.',
    category: 'economy', conditionType: 'gold_total_earned',
    icon: 'piggy-bank-outline', color: '#f59e0b', rewardGold: 75, isSecret: false,
  },
  {
    id: 'economy_spender',
    title: 'Investe no Sistema',
    description: 'Gasta 3000 Gold total na Loja ao longo do tempo.',
    category: 'economy', conditionType: 'gold_spent_total',
    icon: 'rhombus', color: '#22c55e', rewardGold: 60, isSecret: false,
  },

  // ── SIDE QUESTS ───────────────────────────────────────────────────────────────

  {
    id: 'side_quest_rank_c',
    title: 'Sorte de Rank S',
    description: 'A roleta atribui Rank C à tua primeira Side Quest.',
    category: 'secret', conditionType: 'side_quest_c_rank',
    icon: 'dice-3', color: '#00d4ff', rewardGold: 40, isSecret: true,
  },
  {
    id: 'side_quest_first',
    title: 'Iniciativa Própria',
    description: 'Adiciona a tua primeira missão secundária.',
    category: 'quests', conditionType: 'side_quest_added',
    icon: 'plus-circle', color: '#a855f7', rewardGold: 15, isSecret: false,
  },
  {
    id: 'side_quest_five_in_one_day',
    title: 'A Agenda do Caçador',
    description: 'Completa 5 missões secundárias num único dia.',
    category: 'quests', conditionType: 'side_quest_completed',
    icon: 'sword-cross', color: '#a855f7', rewardGold: 65, isSecret: false,
  },

  // ── SHADOWS ───────────────────────────────────────────────────────────────────

  {
    id: 'shadow_first',
    title: 'Exército das Sombras',
    description: 'Recolhe a tua primeira Sombra num Boss Raid.',
    category: 'shadow', conditionType: 'shadow_collected',
    icon: 'ghost', color: '#a855f7', rewardGold: 200, isSecret: false,
  },

  // ── REBELLION ─────────────────────────────────────────────────────────────────

  {
    id: 'rebellion_instagram_spam',
    title: 'Rebelião',
    description: 'Tentaste abrir uma app bloqueada 5 vezes em menos de 1 minuto. O Sistema nota a tua fraqueza.',
    category: 'rebellion', conditionType: 'blocked_app_spam',
    icon: 'cellphone-lock', color: '#ef4444', rewardGold: 20, isSecret: true,
  },
  {
    id: 'rebellion_single_attempt',
    title: 'Tentação Resistida',
    description: 'Tentaste abrir uma app bloqueada e desististe. O Sistema aprova.',
    category: 'rebellion', conditionType: 'blocked_app_attempt',
    icon: 'shield-half', color: '#22c55e', rewardGold: 10, isSecret: true,
  },

  // ── PENALTY ───────────────────────────────────────────────────────────────────

  {
    id: 'penalty_first',
    title: 'Punido pelo Sistema',
    description: 'Entra na Zona de Penalidade pela primeira vez. O Sistema esperava mais.',
    category: 'secret', conditionType: 'penalty_triggered',
    icon: 'alert-octagon', color: '#ef4444', rewardGold: 0, rewardXP: 5, isSecret: true,
  },
  {
    id: 'penalty_cleared',
    title: 'Redenção',
    description: 'Elimina uma penalidade ativa (por qualquer meio).',
    category: 'clutch', conditionType: 'penalty_cleared',
    icon: 'check-circle-outline', color: '#22c55e', rewardGold: 40, isSecret: false,
  },
  {
    id: 'penalty_comeback',
    title: 'Ressurgimento',
    description: 'Completa todas as missões no dia seguinte a uma penalidade.',
    category: 'clutch', conditionType: 'all_quests_completed',
    icon: 'arrow-up-circle', color: '#f97316', rewardGold: 80, isSecret: true,
  },

  // ── TIME-BASED ────────────────────────────────────────────────────────────────

  {
    id: 'time_dawn_warrior',
    title: 'Guerreiro da Madrugada',
    description: 'Completa uma missão antes das 07:00 da manhã.',
    category: 'time', conditionType: 'quest_completed',
    icon: 'weather-sunset-up', color: '#f97316', rewardGold: 35, isSecret: false,
  },
  {
    id: 'time_consecutive_logins',
    title: 'Presença do Monarca',
    description: 'Abre a app por 14 dias seguidos (mesmo sem completar missões).',
    category: 'streak', conditionType: 'login_streak_achieved',
    icon: 'calendar-check', color: '#3b82f6', rewardGold: 50, isSecret: false,
  },

  // ── SECRET / EASTER EGG ───────────────────────────────────────────────────────

  {
    id: 'secret_first_day',
    title: 'A Jornada Começa',
    description: 'Completa todas as missões no primeiro dia.',
    category: 'secret', conditionType: 'all_quests_completed',
    icon: 'flag', color: '#fbbf24', rewardGold: 50, isSecret: true,
  },
  {
    id: 'secret_lore_hoarder',
    title: 'Colecionador de Sombras',
    description: 'Tem 5 sombras diferentes no teu exército.',
    category: 'shadow', conditionType: 'shadow_collected',
    icon: 'account-group', color: '#a855f7', rewardGold: 250, isSecret: false,
  },
]

// ── Maps ──────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_MAP: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS_CATALOG.map(a => [a.id, a]))

// Group by category for UI rendering
export const ACHIEVEMENTS_BY_CATEGORY: Record<AchievementCategory, Achievement[]> =
  ACHIEVEMENTS_CATALOG.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {} as Record<AchievementCategory, Achievement[]>)
