import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeModules, Vibration } from 'react-native'
import { scheduleSystemWarnings, cancelSystemWarnings } from '../utils/notifications'
import { ACHIEVEMENTS_CATALOG, ACHIEVEMENTS_MAP, type EventTrigger, type AchievementProg } from '../data/achievements'
import type { Shadow, PassiveEffectType, ShadowRank } from '../data/shadows'
import { SHADOW_MAP, SHADOW_BY_ACHIEVEMENT, rollShadow } from '../data/shadows'
import SharedStorage from '../native/SharedStorage'

const { WidgetStorage } = NativeModules as {
  WidgetStorage?: { setStreak: (streak: number) => void }
}

// ── XP / Rank helpers ──────────────────────────────────────────────────────────

export function xpForLevel(level: number): number {
  return 100 * level
}

type ClassReq = {
  rank: RankLetter
  label: string
  color: string
  minLevel: number
  minMissions: number
  minBosses: number
  /** Missions completed while at the *previous* rank (0 = no requirement) */
  minRankMissions: number
  /** The rank whose questsByRank counter is checked for minRankMissions */
  prevRank?: RankLetter
}
type RankLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

export const CLASS_REQUIREMENTS: ClassReq[] = [
  { rank: 'E', label: 'E-Rank', color: '#94a3b8', minLevel: 1, minMissions: 0, minBosses: 0, minRankMissions: 0 },
  { rank: 'D', label: 'D-Rank', color: '#22c55e', minLevel: 10, minMissions: 50, minBosses: 3, minRankMissions: 0 },
  { rank: 'C', label: 'C-Rank', color: '#3b82f6', minLevel: 25, minMissions: 150, minBosses: 15, minRankMissions: 10, prevRank: 'D' },
  { rank: 'B', label: 'B-Rank', color: '#a855f7', minLevel: 40, minMissions: 300, minBosses: 30, minRankMissions: 20, prevRank: 'C' },
  { rank: 'A', label: 'A-Rank', color: '#f59e0b', minLevel: 60, minMissions: 500, minBosses: 60, minRankMissions: 30, prevRank: 'B' },
  { rank: 'S', label: 'S-Rank', color: '#ef4444', minLevel: 80, minMissions: 1000, minBosses: 100, minRankMissions: 50, prevRank: 'A' },
]

export function getRank(
  level: number,
  totalCompleted?: number,
  bossesDefeated?: number,
  questsByRank?: Partial<Record<RankLetter, number>>,
) {
  if (totalCompleted !== undefined && bossesDefeated !== undefined) {
    const met = CLASS_REQUIREMENTS.filter(r => {
      if (level < r.minLevel) return false
      if (totalCompleted < r.minMissions) return false
      if (bossesDefeated < r.minBosses) return false
      if (r.minRankMissions > 0 && r.prevRank && questsByRank) {
        const rankCount = questsByRank[r.prevRank] ?? 0
        if (rankCount < r.minRankMissions) return false
      }
      return true
    })
    return met.length > 0 ? met[met.length - 1] : CLASS_REQUIREMENTS[0]
  }
  return [...CLASS_REQUIREMENTS].reverse().find(r => level >= r.minLevel) ?? CLASS_REQUIREMENTS[0]
}

function getQuestTier(level: number): 'E' | 'D' | 'C' | 'S' {
  if (level >= 60) return 'S'
  if (level >= 25) return 'C'
  if (level >= 10) return 'D'
  return 'E'
}

// ── Quest & SideQuest types ────────────────────────────────────────────────────

export type Quest = {
  id: string
  label: string
  detail: string
  xp: number
  gold: number
  type: 'training' | 'knowledge' | 'focus' | 'gps'
  done: boolean
  focusDuration?: number
  gpsTarget?: number
  xpGained?: number
  goldGained?: number
}

export type SideQuest = {
  id: string
  title: string
  rank: 'E' | 'D' | 'C'
  xp: number
  gold: number
  done: boolean
  createdDate: string
  xpGained?: number
  goldGained?: number
}

export type PunishmentIntensity = 'light' | 'medium' | 'hardcore'
export type MissionDifficulty = 'easy' | 'normal' | 'hard'

export type GameSettings = {
  notifications: boolean
  sound: boolean
  punishmentIntensity: PunishmentIntensity
  missionDifficulty: MissionDifficulty
  restDay: boolean   // user-activated rest day for today
  lastFocusDuration: { hours: number; minutes: number }
}

const INITIAL_SETTINGS: GameSettings = {
  notifications: true,
  sound: true,
  punishmentIntensity: 'medium',
  missionDifficulty: 'normal',
  restDay: false,
  lastFocusDuration: { hours: 0, minutes: 25 },
}

// ── Shadow entry (owned shadow with level) ────────────────────────────────────

export type ShadowEntry = {
  id: string
  level: number
}

// ── Quest Definition (user-editable) ──────────────────────────────────────────
// {target} and {unit} are optional placeholders in `description`

export type QuestDefinition = {
  id: string
  title: string
  description: string
  type: 'core' | 'pool' | 'boss'
  questType: Quest['type']
  baseTarget: number
  /** How much target increases per interval */
  scalingAmount: number
  /** Every how many levels the target increases (default 1) */
  scalingInterval: number
  /** @deprecated use scalingAmount + scalingInterval */
  scalingPerLevel?: number
  unit: string
  baseXP: number
  baseGold: number
  daysOfWeek?: number[]   // 0=Sun … 6=Sat; undefined = all days
  // Boss-only: optional shadow extraction
  shadowName?: string
  shadowIcon?: string
  dropShadowId?: string
}

// ── Daily quest generation ─────────────────────────────────────────────────────

const TIER_MULT: Record<string, number> = { E: 1, D: 1.5, C: 2.3, S: 3.5 }

// Seeded Fisher-Yates pick — returns `count` unique indices from [0, poolSize)
function seededPick(count: number, poolSize: number, seed: number): number[] {
  if (poolSize === 0 || count === 0) return []
  const arr = Array.from({ length: poolSize }, (_, i) => i)
  let s = seed
  for (let i = poolSize - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, Math.min(count, poolSize))
}

// ── Default quest dictionary (shipped with the game) ──────────────────────────

export const INITIAL_QUEST_DICTIONARY: QuestDefinition[] = [
  // ── CORE (always appear when daysOfWeek matches) ───────────────────────────
  {
    id: 'core_forca_bruta', title: 'Força Bruta',
    description: '{target} push-ups + {target} squats',
    type: 'core', questType: 'training',
    baseTarget: 20, scalingAmount: 2, scalingInterval: 1, unit: 'reps',
    baseXP: 40, baseGold: 10,
    daysOfWeek: [1, 2, 3, 4, 5],
  },
  {
    id: 'core_expansao_mental', title: 'Expansão Mental',
    description: 'Khan Academy / Wikipedia / Leitura — {target} min',
    type: 'core', questType: 'focus',
    baseTarget: 30, scalingAmount: 2, scalingInterval: 1, unit: 'min',
    baseXP: 35, baseGold: 14,
  },
  // ── POOL (randomly rotated each day) ─────────────────────────────────────
  {
    id: 'h1', title: 'Resistência Térmica',
    description: 'Banho frio — aguenta pelo menos {target} min',
    type: 'pool', questType: 'training',
    baseTarget: 2, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h2', title: 'O Despertar',
    description: 'Acorda e levanta imediatamente, sem snooze',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'vez',
    baseXP: 15, baseGold: 6,
  },
  {
    id: 'h3', title: 'Vitalidade Base',
    description: 'Bebe 2.5L de água ao longo do dia',
    type: 'pool', questType: 'training',
    baseTarget: 25, scalingAmount: 0, scalingInterval: 1, unit: 'dl',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h4', title: 'Agilidade de Assassino',
    description: '{target} min de alongamentos / mobilidade',
    type: 'pool', questType: 'training',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 22, baseGold: 8,
  },
  {
    id: 'h5', title: 'Recuperação de Mana',
    description: '{target} min de meditação ou respiração profunda',
    type: 'pool', questType: 'knowledge',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 25, baseGold: 9,
  },
  {
    id: 'h6', title: 'Nutrição do Monarca',
    description: 'Dia sem açúcar adicionado nem junk food',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'dia',
    baseXP: 28, baseGold: 10,
  },
  {
    id: 'h7', title: 'Conhecimento Antigo',
    description: 'Lê {target} páginas de um livro de não-ficção',
    type: 'pool', questType: 'knowledge',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'páginas',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h8', title: 'Passos Silenciosos',
    description: 'Atinge {target} passos ao longo do dia',
    type: 'pool', questType: 'gps',
    baseTarget: 8000, scalingAmount: 0, scalingInterval: 1, unit: 'passos',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h9', title: 'Visão de Lince',
    description: 'Zero ecrãs nos 30 min antes de dormir (missão de honra)',
    type: 'pool', questType: 'training',
    baseTarget: 30, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h10', title: 'Código do Caçador',
    description: '{target} min de journaling — escreve 3 vitórias do dia',
    type: 'pool', questType: 'knowledge',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h11', title: 'Punhos de Ferro',
    description: '{target} flexões de braços — execução lenta e controlada',
    type: 'pool', questType: 'training',
    baseTarget: 30, scalingAmount: 2, scalingInterval: 2, unit: 'reps',
    baseXP: 24, baseGold: 9,
  },
  {
    id: 'h12', title: 'Neblina Mental',
    description: 'Sem redes sociais durante {target} horas consecutivas',
    type: 'pool', questType: 'training',
    baseTarget: 4, scalingAmount: 0, scalingInterval: 1, unit: 'h',
    baseXP: 30, baseGold: 12,
  },
  {
    id: 'h13', title: 'Domínio da Linguagem',
    description: 'Pratica um idioma estrangeiro — {target} min (Duolingo, anki, vídeos)',
    type: 'pool', questType: 'focus',
    baseTarget: 20, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 26, baseGold: 10,
  },
  {
    id: 'h14', title: 'Resistência do Guerreiro',
    description: 'Plank por {target} segundos (acumulado ou de uma vez)',
    type: 'pool', questType: 'training',
    baseTarget: 60, scalingAmount: 5, scalingInterval: 2, unit: 's',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h15', title: 'Visão Estratégica',
    description: 'Planeia o dia seguinte — lista de tarefas prioritárias ({target} min)',
    type: 'pool', questType: 'knowledge',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h16', title: 'Corredor das Sombras',
    description: 'Corrida ou caminhada rápida de {target} min sem parar',
    type: 'pool', questType: 'training',
    baseTarget: 20, scalingAmount: 1, scalingInterval: 2, unit: 'min',
    baseXP: 28, baseGold: 11,
  },
  {
    id: 'h17', title: 'Protocolo de Sono',
    description: 'Deita-te antes da meia-noite e dorme pelo menos {target} horas',
    type: 'pool', questType: 'training',
    baseTarget: 7, scalingAmount: 0, scalingInterval: 1, unit: 'h',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h18', title: 'Arsenal do Saber',
    description: 'Resolve {target} exercícios de matemática, lógica ou programação',
    type: 'pool', questType: 'knowledge',
    baseTarget: 5, scalingAmount: 1, scalingInterval: 3, unit: 'problemas',
    baseXP: 30, baseGold: 12,
  },
  {
    id: 'h19', title: 'Modo Fantasma',
    description: 'Faz uma tarefa chata que tens adiado há mais de 3 dias',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'tarefa',
    baseXP: 35, baseGold: 14,
  },
  {
    id: 'h20', title: 'Corpo de Aço',
    description: '{target} agachamentos + {target} lunges (cada perna)',
    type: 'pool', questType: 'training',
    baseTarget: 25, scalingAmount: 2, scalingInterval: 2, unit: 'reps',
    baseXP: 26, baseGold: 10,
  },
  {
    id: 'h21', title: 'Mente Forjada',
    description: 'Aprende algo novo — resumo de {target} min (podcast, artigo, doc)',
    type: 'pool', questType: 'knowledge',
    baseTarget: 25, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 28, baseGold: 11,
  },
  {
    id: 'h22', title: 'Sangue Frio',
    description: 'Exposição ao frio — {target} min (banho frio lento ou ar frio)',
    type: 'pool', questType: 'training',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 22, baseGold: 8,
  },
  // ── NOVAS MISSÕES: BIOHACKING, POSTURA, HIDRATAÇÃO, LEITURA ──
  {
    id: 'h23', title: 'Alinhamento Espinhal',
    description: '{target} min de exercícios de correção postural (Wall angels, chin tucks)',
    type: 'pool', questType: 'training',
    baseTarget: 5, scalingAmount: 1, scalingInterval: 3, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h24', title: 'Oxigenação Celular',
    description: 'Técnica Wim Hof ou respiração guiada profunda — {target} rondas',
    type: 'pool', questType: 'training',
    baseTarget: 3, scalingAmount: 0, scalingInterval: 1, unit: 'rondas',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h25', title: 'Hidratação Mineral',
    description: 'Bebe copo de água com sal marinho/limão logo ao acordar',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'dose',
    baseXP: 15, baseGold: 5,
  },
  {
    id: 'h26', title: 'Glândula Pineal',
    description: 'Exposição à luz solar natural nos primeiros 30 min acordado',
    type: 'pool', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h27', title: 'Descompressão Vertebral',
    description: 'Pendurar em barra passiva (Dead Hang) — {target} segundos totais',
    type: 'pool', questType: 'training',
    baseTarget: 60, scalingAmount: 10, scalingInterval: 2, unit: 's',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h28', title: 'Fotossíntese Humana',
    description: 'Mínimo de {target} min de exposição solar direta (Vit D)',
    type: 'pool', questType: 'training',
    baseTarget: 20, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h29', title: 'Ritmo Circadiano',
    description: 'Nenhum ecrã azul 1h antes de dormir, ou usar filtros vermelhos',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'noite',
    baseXP: 30, baseGold: 12,
  },
  {
    id: 'h30', title: 'Jejum do Monarca',
    description: 'Jejum intermitente de pelo menos {target} horas',
    type: 'pool', questType: 'training',
    baseTarget: 14, scalingAmount: 1, scalingInterval: 5, unit: 'horas',
    baseXP: 35, baseGold: 15,
  },
  {
    id: 'h31', title: 'Biblioteca de Alexandria',
    description: 'Lê {target} páginas de literatura clássica ou filosofia',
    type: 'pool', questType: 'knowledge',
    baseTarget: 15, scalingAmount: 2, scalingInterval: 2, unit: 'páginas',
    baseXP: 28, baseGold: 11,
  },
  {
    id: 'h32', title: 'Mestre do Próprio Corpo',
    description: '{target} repetições de calistenia profunda (Pistol squats, L-Sits)',
    type: 'pool', questType: 'training',
    baseTarget: 10, scalingAmount: 2, scalingInterval: 2, unit: 'reps',
    baseXP: 30, baseGold: 12,
  },
  {
    id: 'h33', title: 'Earthing',
    description: 'Andar descalço na relva, terra ou areia — {target} min',
    type: 'pool', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h34', title: 'Digestão de Ferro',
    description: 'Andar {target} passos suaves a seguir a uma refeição pesada',
    type: 'pool', questType: 'gps',
    baseTarget: 1000, scalingAmount: 0, scalingInterval: 1, unit: 'passos',
    baseXP: 15, baseGold: 6,
  },
  {
    id: 'h35', title: 'Imoto como Montanha',
    description: '{target} min de isometria (Horse stance / Wall sit)',
    type: 'pool', questType: 'training',
    baseTarget: 2, scalingAmount: 1, scalingInterval: 4, unit: 'min',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h36', title: 'Foco de Predador',
    description: 'Leitura técnica densa (artigos, código, documentação) — {target} min',
    type: 'pool', questType: 'knowledge',
    baseTarget: 20, scalingAmount: 5, scalingInterval: 3, unit: 'min',
    baseXP: 30, baseGold: 12,
  },
  {
    id: 'h37', title: 'Alquimia Líquida',
    description: 'Substitui a segunda dose de café por chá verde/água',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'vez',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h38', title: 'Sobrecarga Progressiva',
    description: 'Atinge ou supera um recorde pessoal (peso, repetições ou tempo)',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'PR',
    baseXP: 35, baseGold: 15,
  },
  {
    id: 'h39', title: 'Eixo Vertical',
    description: '{target} min a trabalhar em pé ao invés de sentado',
    type: 'pool', questType: 'training',
    baseTarget: 60, scalingAmount: 15, scalingInterval: 2, unit: 'min',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h40', title: 'Banho de Som',
    description: 'Ouvir frequências Binaurais/Solfeggio enquanto focado — {target} min',
    type: 'pool', questType: 'focus',
    baseTarget: 30, scalingAmount: 5, scalingInterval: 2, unit: 'min',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h41', title: 'Afinar a Ferramenta',
    description: 'Auto-massagem com rolo de espuma (foam rolling) — {target} min',
    type: 'pool', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h42', title: 'Expansão de Vocabulário',
    description: 'Aprende e usa 3 palavras raras novas no teu idioma materno',
    type: 'pool', questType: 'knowledge',
    baseTarget: 3, scalingAmount: 0, scalingInterval: 1, unit: 'palavras',
    baseXP: 18, baseGold: 6,
  },
  // ── NOVAS MISSÕES: POLIVALÊNCIA ──
  {
    id: 'h43', title: 'Esboço Rápido',
    description: 'Desenha o que tens à tua frente em {target} min — apenas caneta, sem apagar. O objetivo é observar com atenção, não a perfeição.',
    type: 'pool', questType: 'training',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h44', title: 'Escrita Livre',
    description: 'Escreve {target} palavras seguidas sem parar nem apagar — começa com a primeira palavra que vier à cabeça. Não edites enquanto escreves.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 200, scalingAmount: 50, scalingInterval: 3, unit: 'palavras',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h45', title: 'Conexão Real',
    description: 'Conversa {target} min com alguém cara a cara ou por chamada, sem tocar no telemóvel durante toda a conversa.',
    type: 'pool', questType: 'training',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h46', title: 'Gratidão Específica',
    description: 'Envia 1 mensagem de agradecimento genuíno — especifica o que a pessoa fez e como te afetou. Nada de genérico.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'mensagem',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h47', title: 'Auditoria Financeira',
    description: 'Revê as despesas dos últimos 7 dias: categoriza tudo e identifica 1 gasto a cortar ou otimizar. Regista a decisão.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'auditoria',
    baseXP: 28, baseGold: 11,
  },
  {
    id: 'h48', title: 'Literacia Financeira',
    description: 'Aprende 1 conceito de finanças ou investimento (juro composto, ETF, inflação, etc.) e explica-o por escrito em 3 frases simples.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'conceito',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h49', title: 'Advogado do Diabo',
    description: 'Escolhe uma crença forte que tens — escreve o argumento mais sólido possível CONTRA ela, sem descartar à partida. Sê honesto.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'argumento',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h50', title: 'Active Recall',
    description: 'Após estudares algo hoje, fecha tudo e escreve de memória tudo o que retiveste. Verifica depois o que faltou e anota as lacunas.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'sessão',
    baseXP: 28, baseGold: 11,
  },
  {
    id: 'h51', title: 'Pitch Cronometrado',
    description: 'Explica um projeto, ideia ou tema em exatamente {target} min — grava-te ou faz ao vivo. Ouve de volta e aponta 1 coisa a melhorar.',
    type: 'pool', questType: 'training',
    baseTarget: 2, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h52', title: 'Manutenção do Ambiente',
    description: 'Repara, arruma ou mantém algo no teu espaço que estavas a ignorar há mais de 3 dias — leva-o até ao fim.',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'coisa',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h53', title: 'Primeiros Socorros',
    description: 'Revê 1 procedimento de primeiros socorros (RCP, Heimlich, hemorragia) e pratica os movimentos fisicamente durante {target} min.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h54', title: 'Automação',
    description: 'Automatiza uma tarefa repetitiva, por mais simples que seja (script, atalho de teclado, template, macro ou regra de e-mail).',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'automação',
    baseXP: 30, baseGold: 12,
  },
  {
    id: 'h55', title: 'Princípio Estoico',
    description: 'Escolhe 1 princípio (Memento Mori, Amor Fati, Dicotomia do Controlo) e aplica-o conscientemente durante o dia. Escreve à noite o que aconteceu.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'princípio',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h56', title: 'Equilíbrio e Propriocepção',
    description: '{target} min de treino de equilíbrio: apoio numa perna com olhos fechados, progressões em superfície instável, ou heel-to-toe walk.',
    type: 'pool', questType: 'training',
    baseTarget: 5, scalingAmount: 1, scalingInterval: 3, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h57', title: 'Sentido Rítmico',
    description: '{target} min de ritmo: usa as mãos ou uma superfície como bateria — segue um padrão básico (1-e-2-e) com metrónomo ou música.',
    type: 'pool', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h58', title: 'Ferramenta Nova',
    description: 'Explora um software, app ou ferramenta que nunca usaste. Faz o tutorial básico e aplica-o a uma tarefa real hoje.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'ferramenta',
    baseXP: 25, baseGold: 10,
  },
  {
    id: 'h59', title: 'Sistema em Dia',
    description: 'Fecha os loops abertos: arquiva tarefas concluídas, captura 3 insights da semana e revê os objetivos ativos — tudo em {target} min.',
    type: 'pool', questType: 'knowledge',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 22, baseGold: 9,
  },
  {
    id: 'h60', title: 'Observação Natural',
    description: 'Passa {target} min ao ar livre apenas a observar — sem telemóvel. Identifica 3 plantas, sons ou animais pelo nome (pesquisa depois se não souberes).',
    type: 'pool', questType: 'training',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 20, baseGold: 8,
  },
  {
    id: 'h61', title: 'Refeição Desconhecida',
    description: 'Come ou cozinha algo que nunca provaste antes. Regista o nome, a origem e o que achaste.',
    type: 'pool', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'refeição',
    baseXP: 18, baseGold: 7,
  },
  {
    id: 'h62', title: 'Coordenação Neuromotora',
    description: '{target} min de malabares, movimentos espelhados mão/pé ou padrões rítmicos alternados — treino de novas conexões neurais.',
    type: 'pool', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 22, baseGold: 9,
  },


  // ── BOSSES DA EXPANSÃO (Drops Reais) ──
  {
    id: 'boss_arachnid', title: 'A Viúva Furtiva (A-Rank)',
    description: 'Foco absoluto: {target} min numa única tarefa, sem notificações.',
    type: 'boss', questType: 'focus',
    baseTarget: 60, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 500, baseGold: 150,
    dropShadowId: 'spider_queen',
  },
  {
    id: 'boss_iron_golem', title: 'O Golem de Ferro Forjado (A-Rank)',
    description: 'Boss Físico: Esmaga-o com {target} flexões pesadas (ou equivalentes).',
    type: 'boss', questType: 'training',
    baseTarget: 100, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 550, baseGold: 160,
    dropShadowId: 'iron_golem',
  },
  {
    id: 'boss_ancient_priest', title: 'Sumo Sacerdote do Panteão (A-Rank)',
    description: 'Combate Mental: Supera as charadas divinas lendo {target} páginas sem pausas.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 50, scalingAmount: 0, scalingInterval: 1, unit: 'páginas',
    baseXP: 600, baseGold: 180,
    dropShadowId: 'ancient_priest',
  },
  {
    id: 'boss_gladiator_champ', title: 'Veterano Invicto da Arena (A-Rank)',
    description: 'Resistência brutal: {target} min de corrida contínua (sem parar).',
    type: 'boss', questType: 'gps',
    baseTarget: 40, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 650, baseGold: 200,
    dropShadowId: 'arena_champion',
  },
  {
    id: 'boss_astral_nova', title: 'General Supernova (S-Rank)',
    description: 'Ataque de choque contínuo: completa {target} min de Foco (ativa o modo Foco) e, em seguida, realiza 100 burpees controlados.',
    type: 'boss', questType: 'focus',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1000, baseGold: 400,
    dropShadowId: 'astral_monarch',
  },
  {
    id: 'boss_crypt_omega', title: 'Arma Ómega (S-Rank)',
    description: 'Sobrevivência final das Máquinas: percorre {target} passos em marcha contínua, sem pausas superiores a 5 min.',
    type: 'boss', questType: 'gps',
    baseTarget: 10000, scalingAmount: 0, scalingInterval: 1, unit: 'passos',
    baseXP: 1200, baseGold: 500,
    dropShadowId: 'omega_weapon',
  },
  {
    id: 'boss_executioner', title: 'O Carrasco da Arena (A-Rank)',
    description: 'Suporta a dor: Toma um banho 100% gelado de pelo menos {target} min.',
    type: 'boss', questType: 'training',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 550, baseGold: 150,
    dropShadowId: 'executioner',
  },
  {
    id: 'boss_seraphim', title: 'Lâmina Serafim Caído (S-Rank)',
    description: 'Enfrenta o Anjo Caído com {target} min de pura meditação debaixo de tensão.',
    type: 'boss', questType: 'focus',
    baseTarget: 45, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1100, baseGold: 450,
    dropShadowId: 'fallen_seraphim',
  },
  {
    id: 'boss_spartacus', title: 'Líder dos Rejeitados (A-Rank)',
    description: 'Derruba o líder rebelde com {target} lunges sem cair (peso corporal).',
    type: 'boss', questType: 'training',
    baseTarget: 80, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 600, baseGold: 170,
    dropShadowId: 'rebel_leader',
  },
  {
    id: 'boss_astral_eclipse', title: 'Eclipse Cósmico (S-Rank)',
    description: 'Conteúdo super-denso: estuda {target} min de um tema técnico sem multitarefa.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1500, baseGold: 600,
    dropShadowId: 'cosmic_eclipse',
  },
  {
    id: 'boss_kargal', title: 'Kargal, o Devorador de Mentes (S-Rank)',
    description: 'Foco profundo: ativa o modo Foco por {target} min num espaço totalmente silencioso (sem música, sem notificações), com o ecrã em brilho mínimo.',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1300, baseGold: 550,
    dropShadowId: 'kargal_mind_devourer',
  },
  {
    id: 'boss_ignis', title: 'Titã de Gelo Ignis (S-Rank)',
    description: 'O contraste térmico quebra limites. Corre {target} min ao frio e banho frio a seguir.',
    type: 'boss', questType: 'gps',
    baseTarget: 45, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1100, baseGold: 480,
    dropShadowId: 'ignis_ice_titan',
  },
  {
    id: 'boss_abyss_mage', title: 'Arquimago do Abismo (A-Rank)',
    description: 'Desafia a mente: resolve 3 desafios de lógica/matemática em {target} min.',
    type: 'boss', questType: 'focus',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 750, baseGold: 220,
    dropShadowId: 'abyss_archmage',
  },
  {
    id: 'boss_blood_knight', title: 'Cavaleiro de Sangue Sangreal (S-Rank)',
    description: 'Luta corpo a corpo pura. {target} repetições de levantamento de peso (Deadlift/Squats).',
    type: 'boss', questType: 'training',
    baseTarget: 150, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 1400, baseGold: 600,
    dropShadowId: 'blood_knight_sangreal',
  },
  {
    id: 'boss_hollow_king', title: 'O Rei Vazio (S-Rank)',
    description: 'Jejum disciplinado: mantém {target}h sem refeições (hidratação permitida).',
    type: 'boss', questType: 'training',
    baseTarget: 24, scalingAmount: 0, scalingInterval: 1, unit: 'h',
    baseXP: 1800, baseGold: 800,
    dropShadowId: 'hollow_king',
  },
  {
    id: 'boss_cerberus_prime', title: 'Cerberus Primordial (A-Rank)',
    description: 'Controla a besta de 3 cabeças completando {target} km de corrida matinal.',
    type: 'boss', questType: 'gps',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 900, baseGold: 300,
    dropShadowId: 'cerberus_prime',
  },
  {
    id: 'boss_wind_walker', title: 'Caminhante do Vento Silencioso (A-Rank)',
    description: 'Realiza {target} min de alongamentos dinâmicos contínuos (balanços de pernas, rotações de ombros, hip circles) sem pausas superiores a 30s.',
    type: 'boss', questType: 'training',
    baseTarget: 45, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 680, baseGold: 210,
    dropShadowId: 'wind_walker',
  },
  {
    id: 'boss_poison_monarch', title: 'Monarca do Veneno Quimera (S-Rank)',
    description: 'O veneno está no corpo. Suar toxinas com {target} min de treino HIIT cardíaco.',
    type: 'boss', questType: 'training',
    baseTarget: 40, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1250, baseGold: 500,
    dropShadowId: 'chimera_poison_monarch',
  },
  {
    id: 'boss_goliath', title: 'Golias das Rochas Negras (A-Rank)',
    description: 'Isometria pesada: {target} min de wall-sit ou prancha (tempo acumulado).',
    type: 'boss', questType: 'training',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 800, baseGold: 250,
    dropShadowId: 'blackrock_goliath',
  },
  {
    id: 'boss_shadow_blade', title: 'Lâmina Negra Assustadora (A-Rank)',
    description: 'Tática sombria: lê {target} páginas de estratégia (sem interrupções).',
    type: 'boss', questType: 'knowledge',
    baseTarget: 80, scalingAmount: 0, scalingInterval: 1, unit: 'páginas',
    baseXP: 700, baseGold: 230,
    dropShadowId: 'shadow_blade',
  },
  { // 21
    id: 'boss_iron_jaw', title: 'O Quebra-Mandíbulas (A-Rank)',
    description: 'Shadowboxing: {target} rounds de 2 min cada, com descanso de 30–45s entre rounds.',
    type: 'boss', questType: 'training',
    baseTarget: 15, scalingAmount: 0, scalingInterval: 1, unit: 'rounds',
    baseXP: 600, baseGold: 190,
    dropShadowId: 'iron_jaw',
  },
  { // 22
    id: 'boss_astral_drake', title: 'Dragão Astral (S-Rank)',
    description: 'Ativa o modo Foco por {target} min: realiza ciclos de respiração Wim Hof (30 respirações profundas + retenção do ar) e finaliza com 5 min de meditação silenciosa.',
    type: 'boss', questType: 'focus',
    baseTarget: 60, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1400, baseGold: 500,
    dropShadowId: 'astral_drake',
  },
  { // 23
    id: 'boss_lich_king', title: 'Rei Lich Esquecido (S-Rank)',
    description: 'Foco resistente: {target} min sentado e imóvel, sem distrações.',
    type: 'boss', questType: 'focus',
    baseTarget: 100, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1500, baseGold: 700,
    dropShadowId: 'forgotten_lich_king',
  },
  { // 24
    id: 'boss_tarantula', title: 'Tarântula Imperial (A-Rank)',
    description: 'Marcha controlada: percorre {target} passos num percurso definido à partida (evita desvios), sem música.',
    type: 'boss', questType: 'gps',
    baseTarget: 8000, scalingAmount: 0, scalingInterval: 1, unit: 'passos',
    baseXP: 650, baseGold: 200,
    dropShadowId: 'imperial_tarantula',
  },
  { // 25
    id: 'boss_fallen_monk', title: 'Monge Caído (A-Rank)',
    description: 'Jejum de estímulos: ativa o modo Foco por {target} min sem aceder a redes sociais, vídeos ou streaming — mantém a atenção numa única tarefa produtiva.',
    type: 'boss', questType: 'focus',
    baseTarget: 150, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 800, baseGold: 280,
    dropShadowId: 'fallen_monk',
  },
  { // 26
    id: 'boss_swamp_wraith', title: 'Espectro do Pântano (A-Rank)',
    description: 'Autoanálise escrita: ativa o modo Foco por {target} min e escreve livremente sobre um desafio pessoal atual — o que está a acontecer, por que ainda não resolveste, e uma coisa concreta que podes fazer hoje.',
    type: 'boss', questType: 'focus',
    baseTarget: 40, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 720, baseGold: 230,
    dropShadowId: 'swamp_wraith',
  },
  { // 27
    id: 'boss_titan_ape', title: 'Primata Titânico (A-Rank)',
    description: 'Força bruta total: {target} reps alternadas de push-ups + squats.',
    type: 'boss', questType: 'training',
    baseTarget: 130, scalingAmount: 0, scalingInterval: 1, unit: 'reps',
    baseXP: 850, baseGold: 260,
    dropShadowId: 'titan_ape',
  },
  { // 28
    id: 'boss_astral_seer', title: 'Oráculo Astral (A-Rank)',
    description: 'Conhecimento profundo: lê {target} páginas de conteúdo técnico sem pausas longas.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 80, scalingAmount: 0, scalingInterval: 1, unit: 'páginas',
    baseXP: 780, baseGold: 240,
    dropShadowId: 'astral_seer',
  },
  { // 29
    id: 'boss_astral_hound', title: 'Cão Cósmico Errante (A-Rank)',
    description: 'Resistência em campo aberto: percorre {target} km em ritmo constante.',
    type: 'boss', questType: 'gps',
    baseTarget: 8, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 820, baseGold: 250,
    dropShadowId: 'astral_hound',
  },
  { // 30
    id: 'boss_archlich_prime', title: 'Arquilich Primordial (S-Rank)',
    description: 'Projeto com entregável: define um resultado concreto antes de começar (protótipo, esboço, plano detalhado ou artigo curto). Ativa o modo Foco por {target} min e termina com algo tangível para mostrar.',
    type: 'boss', questType: 'focus',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1600, baseGold: 720,
    dropShadowId: 'archlich_prime',
  },
  { // 31
    id: 'boss_soul_reaper', title: 'Ceifeiro de Almas (S-Rank)',
    description: 'Resiliência mental: {target} min de trabalho criativo (escrita leve, desenho ou plano de projeto).',
    type: 'boss', questType: 'focus',
    baseTarget: 120, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1700, baseGold: 760,
    dropShadowId: 'soul_reaper',
  },
  { // 32
    id: 'boss_astral_nebula', title: 'Rei Nebulosa (S-Rank)',
    description: 'Travessia cósmica: atinge {target} passos em marcha longa e focada.',
    type: 'boss', questType: 'gps',
    baseTarget: 12000, scalingAmount: 0, scalingInterval: 1, unit: 'passos',
    baseXP: 1750, baseGold: 780,
    dropShadowId: 'astral_nebula',
  },
  { // 33
    id: 'boss_goblin_warlord', title: 'Senhor Goblin (A-Rank)',
    description: 'Tabata: completa {target} rounds de 20s de esforço máximo + 10s de repouso. Define um único exercício antes de começar (burpees, saltos ou sprints) e mantém a intensidade máxima em cada round.',
    type: 'boss', questType: 'training',
    baseTarget: 8, scalingAmount: 0, scalingInterval: 1, unit: 'rounds',
    baseXP: 680, baseGold: 220,
    dropShadowId: 'goblin_grunt',
  },
  { // 34
    id: 'boss_cave_spider_matriarch', title: 'Matriarca da Caverna (A-Rank)',
    description: 'Técnica Feynman: ativa o modo Foco por {target} min e explica por escrito (ou em voz alta gravada) um conceito que estás a aprender, como se ensinasses a um iniciante — sem consultar fontes durante a explicação.',
    type: 'boss', questType: 'focus',
    baseTarget: 35, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 700, baseGold: 230,
    dropShadowId: 'cave_spider',
  },
  { // 35
    id: 'boss_ant_worker_prime', title: 'Operária Primordial (A-Rank)',
    description: 'Rota de exploração: percorre {target} passos num trajeto que nunca fizeste antes, escolhendo o caminho no momento (sem rota pré-definida). Nota 3 coisas novas que descobriste ao longo do percurso.',
    type: 'boss', questType: 'gps',
    baseTarget: 6000, scalingAmount: 0, scalingInterval: 1, unit: 'passos',
    baseXP: 690, baseGold: 210,
    dropShadowId: 'ant_worker',
  },
  { // 36
    id: 'boss_stone_golem_shard', title: 'Fragmento do Golem (A-Rank)',
    description: 'Experimenta uma prática física nova (yoga, capoeira, calistenia, tai chi ou outra que nunca tentaste): segue um tutorial e pratica {target} min sem interrupção. Repete os movimentos no final sem guia.',
    type: 'boss', questType: 'training',
    baseTarget: 30, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 670, baseGold: 200,
    dropShadowId: 'stone_golem_shard',
  },
  { // 37
    id: 'boss_stringsinger', title: 'O Cantor das Cordas (A-Rank)',
    description: 'Guitarra: {target} min de prática com metrónomo (3 acordes + 1 ritmo básico).',
    type: 'boss', questType: 'focus',
    baseTarget: 35, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 720, baseGold: 230,
    dropShadowId: 'silent_blade',
  },
  { // 38
    id: 'boss_polyglot_trial', title: 'Provação do Poliglota (A-Rank)',
    description: 'Idioma: aprende {target} palavras + escreve 5 frases usando-as.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 20, scalingAmount: 0, scalingInterval: 1, unit: 'palavras',
    baseXP: 740, baseGold: 240,
    dropShadowId: 'blind_seer',
  },
  { // 39
    id: 'boss_culinary_ritual', title: 'Ritual Culinário (A-Rank)',
    description: 'Cozinha: prepara 1 refeição saudável + 1 acompanhamento (do zero).',
    type: 'boss', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'refeição',
    baseXP: 760, baseGold: 250,
    dropShadowId: 'iron_maid',
  },
  { // 40
    id: 'boss_memory_labyrinth', title: 'Labirinto da Memória (A-Rank)',
    description: 'Memória: cria um palácio mental com {target} itens e revê-os 2x.',
    type: 'boss', questType: 'focus',
    baseTarget: 12, scalingAmount: 0, scalingInterval: 1, unit: 'itens',
    baseXP: 780, baseGold: 260,
    dropShadowId: 'library_wisp',
  },
  { // 41
    id: 'boss_new_frontier', title: 'Fronteira Inédita (A-Rank)',
    description: 'Experimenta algo novo: 1 aula curta (20–30 min) + 3 notas do que aprendeste.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'aula',
    baseXP: 800, baseGold: 270,
    dropShadowId: 'cursed_samurai',
  },
  { // 42
    id: 'boss_artisan_trial', title: 'Prova do Artesão (A-Rank)',
    description: 'Constrói algo pequeno: 1 objeto útil (ex.: suporte, organizador, remendo).',
    type: 'boss', questType: 'training',
    baseTarget: 1, scalingAmount: 0, scalingInterval: 1, unit: 'objeto',
    baseXP: 820, baseGold: 280,
    dropShadowId: 'ember_squire',
  },
  { // 43
    id: 'boss_storm_bringer', title: 'Invocador de Tempestades (S-Rank)',
    description: 'Skill sprint: define uma micro-skill específica que queres aprender. Estuda-a em modo Foco por {target} min e pratica-a imediatamente durante 15 min adicionais — sem avançar para outro tema antes de terminar.',
    type: 'boss', questType: 'focus',
    baseTarget: 45, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 1700, baseGold: 760,
    dropShadowId: 'storm_bringer',
  },
  { // 44
    id: 'boss_chrono_master', title: 'Senhor do Tempo (S-Rank)',
    description: 'Timeboxing: planeia 5 blocos de 25 min e executa pelo menos 3.',
    type: 'boss', questType: 'focus',
    baseTarget: 5, scalingAmount: 0, scalingInterval: 1, unit: 'blocos',
    baseXP: 1800, baseGold: 820,
    dropShadowId: 'chrono_master',
  },
  { // 45
    id: 'boss_star_breaker', title: 'Quebrador de Estrelas (S-Rank)',
    description: 'Exploração documentada: percorre {target} km a pé num percurso nunca feito antes. Durante a marcha, identifica e regista (por escrito ou foto) pelo menos 3 elementos novos que nunca tinhas reparado.',
    type: 'boss', questType: 'gps',
    baseTarget: 10, scalingAmount: 0, scalingInterval: 1, unit: 'km',
    baseXP: 1900, baseGold: 880,
    dropShadowId: 'star_breaker',
  },
  { // 46
    id: 'boss_cold_philosopher', title: 'O Filósofo da Montanha (A-Rank)',
    description: 'Análise de problema real: define um problema pessoal concreto que estás a adiar. Pesquisa contexto e opiniões opostas durante {target} min (modo Foco ativo) e termina com uma decisão escrita.',
    type: 'boss', questType: 'focus',
    baseTarget: 50, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 760, baseGold: 245,
    dropShadowId: 'astral_seer',
  },
  { // 47
    id: 'boss_digital_craftsman', title: 'O Artesão Digital (A-Rank)',
    description: 'Constrói algo digital do zero em {target} min: uma página web simples, um script útil, uma apresentação estruturada ou um protótipo. O resultado tem de ser funcional ou apresentável no final.',
    type: 'boss', questType: 'knowledge',
    baseTarget: 90, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 850, baseGold: 280,
    dropShadowId: 'library_wisp',
  },
  { // 48
    id: 'boss_stoic_challenge', title: 'A Prova do Estoico (A-Rank)',
    description: 'Desconforto voluntário: faz {target} min de exercício num ambiente frio real (ao ar livre no frio, ou janelas abertas no inverno) sem roupa extra. Regista como te sentiste antes e depois.',
    type: 'boss', questType: 'training',
    baseTarget: 20, scalingAmount: 0, scalingInterval: 1, unit: 'min',
    baseXP: 700, baseGold: 220,
    dropShadowId: 'rebel_leader',
  },
]

// Convert a QuestDefinition to a runtime Quest for the given level
function defToQuest(def: QuestDefinition, level: number, tier: string): Quest {
  const mult = TIER_MULT[tier]
  const m = (n: number) => Math.round(n * mult)
  const amount = def.scalingAmount ?? (def as any).scalingPerLevel ?? 0
  const interval = def.scalingInterval ?? 1
  const target = Math.round(def.baseTarget + Math.floor((level - 1) / interval) * amount)
  const detail = def.description
    .replace(/{target}/g, String(target))
    .replace(/{unit}/g, def.unit)

  const quest: Quest = {
    id: def.id,
    label: def.title,
    detail,
    xp: m(def.baseXP),
    gold: m(def.baseGold),
    type: def.questType,
    done: false,
  }
  if (def.questType === 'focus') quest.focusDuration = target * 60_000
  if (def.questType === 'gps') quest.gpsTarget = target
  return quest
}

function getDailyMissionTarget(level: number, difficulty: MissionDifficulty): number {
  switch (difficulty) {
    case 'easy': return 3
    case 'hard': return Math.min(4 + Math.floor(level / 5), 8)
    case 'normal':
    default: return Math.min(3 + Math.floor(level / 10), 5)
  }
}

function createDailyQuests(
  level: number,
  questDictionary: QuestDefinition[],
  difficulty: MissionDifficulty = 'normal',
  overrideSeed?: number,
): Quest[] {
  const tier = getQuestTier(level)
  const dayOfWeek = new Date().getDay()
  const d = new Date()
  const seed = overrideSeed ?? (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate())

  const totalTarget = getDailyMissionTarget(level, difficulty)

  const coreDefs = questDictionary
    .filter(def => def.type === 'core')
    .filter(def => !def.daysOfWeek || def.daysOfWeek.includes(dayOfWeek))

  const poolDefs = questDictionary.filter(def => def.type === 'pool')
  const randomCount = Math.max(0, totalTarget - coreDefs.length)
  const picks = seededPick(randomCount, poolDefs.length, seed)

  return [
    ...coreDefs.map(def => defToQuest(def, level, tier)),
    ...picks.map(i => defToQuest(poolDefs[i], level, tier)),
  ]
}

// ── SideQuest reward ───────────────────────────────────────────────────────────

export function generateSideQuestReward(): { rank: 'E' | 'D' | 'C'; xp: number; gold: number } {
  const roll = Math.random()
  if (roll < 0.60) return { rank: 'E', xp: 10 + Math.floor(Math.random() * 21), gold: 3 + Math.floor(Math.random() * 6) }
  if (roll < 0.90) return { rank: 'D', xp: 30 + Math.floor(Math.random() * 31), gold: 8 + Math.floor(Math.random() * 8) }
  return { rank: 'C', xp: 60 + Math.floor(Math.random() * 41), gold: 15 + Math.floor(Math.random() * 11) }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type RankKey = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

export type Statistics = {
  questsByRank: Record<RankKey, number>
  totalFocusMinutes: number
  perfectDays: number
  totalCompleted: number
  totalGoldSpent: number
  sideQuestsCompletedToday: number
}

const INITIAL_STATS: Statistics = {
  questsByRank: { E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 },
  totalFocusMinutes: 0,
  perfectDays: 0,
  totalCompleted: 0,
  totalGoldSpent: 0,
  sideQuestsCompletedToday: 0,
}

export type InventoryEntry = { itemId: string; quantity: number }

export type Player = {
  name: string
  level: number
  xp: number
  gold: number
  str: number
  agi: number
  int: number
  vit: number
  inventory: InventoryEntry[]
  currentStreak: number
  highestStreak: number
  shadows: ShadowEntry[]   // shadow entries with levels
  activeShadowIds: string[]        // ids of equipped (vanguard) shadows (max 3)
  maxLevelReached: number          // anti-exploit: highest level ever attained
}

export type ExtractionResult = {
  shadow: Shadow
  isLevelUp: boolean
  newLevel: number
}

export type SystemState = {
  focusModeActive: boolean
  hardcoreFocusMode: boolean
  hardcorePunished: boolean   // true = hardcore locked for the day (punishment)
  xpBoostNext: boolean
  hasPenalty: boolean
  penaltyReduced: boolean
  penaltyTriggered: boolean
  penaltyQuests: Quest[]
  blockedApps: string[]
  weeklyTrainingCount: number
  weeklyRegenCount: number
  weeklyResetDate: string
  weeklyBossIds: string[]
  bossDefeatedThisWeek: boolean
  weeklyDefeatedBossId?: string
  bossesDefeated: number
  shopStocks: Record<string, number>
  blockedAttemptTimestamps: number[]   // for spam detection
  extractionDoneToday: boolean
  penaltyBlockEnd: number     // ms timestamp when block lifts (0 = no timed block)
  eventBossKey: string
  eventBossCompletedIds: string[]
  eventBossRequired: number
  eventBossTotal: number
  eventBossDefeated: boolean
  lastPenaltyInfo?: {
    intensity: PunishmentIntensity
    failedCount: number
    totalCount: number
    xpLost: number
  }
}

export type LevelUpReward = {
  level: number
  items: string[]   // item IDs granted automatically
}

type GameState = {
  player: Player
  quests: Quest[]
  extraQuests: Quest[]
  sideQuests: SideQuest[]
  questDictionary: QuestDefinition[]
  customShadows: Shadow[]
  system: SystemState
  settings: GameSettings
  statistics: Statistics
  lastResetDate: string
  unlockedAchievements: string[]
  newAchievementIds: string[]
  achievementProgress: Record<string, AchievementProg>
  lastExtraction: ExtractionResult | null
  questRecords: Record<string, { bestTime: number; lastNote: string }>
  questCompletions: Record<string, number>   // total times each quest was completed
  levelUpReward: LevelUpReward | null     // pending level-up item reward to show
  activeMissionTimers: Record<string, number>   // questId → startTimestamp (ms)
}

type TriggerPayload = Record<string, unknown>

type GameActions = {
  bootSystem: () => void
  dismissPenaltyModal: () => void
  completeQuest: (id: string) => { leveledUp: boolean }
  skipQuest: (id: string) => void
  undoQuest: (id: string) => void
  addSideQuest: (title: string) => void
  completeSideQuest: (id: string) => { leveledUp: boolean }
  removeSideQuest: (id: string) => void
  recordFocusTime: (minutes: number) => void
  addXP: (amount: number) => { leveledUp: boolean }
  purchaseItem: (itemId: string, cost: number) => boolean
  useInventoryItem: (itemId: string) => void
  addToInventory: (itemId: string, qty?: number) => void
  toggleBlockedApp: (pkg: string) => void
  setFocusModeActive: (v: boolean) => void
  setHardcoreFocusMode: (v: boolean) => void
  setHardcorePunished: (v: boolean) => void
  setXpBoostNext: (v: boolean) => void
  setPenaltyReduced: (v: boolean) => void
  removePenalty: () => void
  deductGold: (amount: number) => boolean
  defeatDungeonBoss: (shadowId: string, customDef?: { name: string; icon: string; questType: Quest['type'] }) => { xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean }
  dismissAchievement: () => void
  triggerEvent: (event: EventTrigger, payload?: TriggerPayload, value?: number) => void
  emitEvent: (event: EventTrigger, value?: number) => void
  recordBlockedAttempt: () => void
  addQuestDefinition: (def: QuestDefinition) => void
  updateQuestDefinition: (id: string, def: Partial<QuestDefinition>) => void
  deleteQuestDefinition: (id: string) => void
  regenerateDailyQuests: () => { success: boolean; reason?: string }
  generateExtraQuests: () => { success: boolean; reason?: string }
  completeExtraQuest: (id: string) => { leveledUp: boolean }
  updateSettings: (patch: Partial<GameSettings>) => void
  saveQuestRecord: (questId: string, time: number, note: string) => void
  dismissLevelUpReward: () => void
  startMissionTimer: (id: string) => void
  clearMissionTimer: (id: string) => void
  toggleActiveShadow: (id: string) => void
  releaseShadow: (id: string) => { gold: number }
  dismissExtraction: () => void
  setEventBossState: (key: string, required: number, total: number) => void
  completeEventTrial: (id: string, key: string, required: number, total: number) => { completed: number; required: number }
  markEventBossDefeated: (key: string) => void
  restoreBackup: (data: Partial<GameState>) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function applyXP(xp: number, level: number, amount: number) {
  let newXp = xp + amount
  let newLevel = level
  let leveledUp = false

  while (newXp >= xpForLevel(newLevel)) {
    newXp -= xpForLevel(newLevel)
    newLevel++
    leveledUp = true
  }

  return { xp: newXp, level: newLevel, leveledUp }
}

function getMondayDateString(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toDateString()
}

const STOCKED_ITEMS = ['system_pass', 'lagrima_purificacao']
const INITIAL_SHOP_STOCKS: Record<string, number> = { system_pass: 1, lagrima_purificacao: 1 }

// ── Custom shadow passive helper ────────────────────────────────────────────────

function getCustomShadowPassive(questType: Quest['type']): { type: PassiveEffectType; value: number; description: string } {
  switch (questType) {
    case 'training': return { type: 'gold_boost', value: 0.02, description: '+2% Gold em missões de treino' }
    case 'knowledge': return { type: 'xp_boost', value: 0.02, description: '+2% XP em missões de conhecimento' }
    case 'focus': return { type: 'focus_bonus', value: 5, description: '+5 min de foco por sessão' }
    case 'gps': return { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' }
  }
}

// ── Active shadow passive multipliers ─────────────────────────────────────────

const SHADOW_RELEASE_BASE: Partial<Record<string, number>> = {
  Normal: 50,
  Elite: 150,
  Knight: 400,
  Commander: 1000,
  Marshal: 3000,
}

export function getShadowReleaseGold(shadow: Shadow, level: number): number {
  if ((shadow as any).type === 'Custom') return 0
  const base = SHADOW_RELEASE_BASE[shadow.rank as string] ?? 50
  return Math.round(base * (1 + (level - 1) * 0.5))
}

function computeActivePassives(
  activeShadowIds: string[],
  shadows: ShadowEntry[],
  customShadows: Shadow[],
): { xpBoost: number; goldBoost: number } {
  const customMap: Record<string, Shadow> = {}
  for (const sh of customShadows) customMap[sh.id] = sh
  const lookup = { ...SHADOW_MAP, ...customMap }

  let xpBoost = 0
  let goldBoost = 0
  for (const id of activeShadowIds) {
    const entry = shadows.find(e => e.id === id)
    const shadow = lookup[id]
    if (!entry || !shadow) continue
    const val = shadow.passiveEffect.value * (1 + (entry.level - 1) * 0.1)
    if (shadow.passiveEffect.type === 'xp_boost') xpBoost += val
    if (shadow.passiveEffect.type === 'gold_boost') goldBoost += val
  }
  return { xpBoost, goldBoost }
}

// ── Daily extraction rank picker ───────────────────────────────────────────────

function pickExtractionRank(level: number): ShadowRank {
  const r = Math.random()
  if (level >= 26) {
    if (r < 0.02) return 'Marshal'
    if (r < 0.15) return 'Commander'
    if (r < 0.45) return 'Knight'
    if (r < 0.82) return 'Elite'
    return 'Normal'
  }
  if (level >= 21) {
    if (r < 0.10) return 'Commander'
    if (r < 0.40) return 'Knight'
    if (r < 0.78) return 'Elite'
    return 'Normal'
  }
  if (level >= 11) {
    if (r < 0.15) return 'Knight'
    if (r < 0.55) return 'Elite'
    return 'Normal'
  }
  if (level >= 6) return Math.random() < 0.30 ? 'Elite' : 'Normal'
  return 'Normal'
}

// ── Penalty Quest Pool ─────────────────────────────────────────────────────────

const PENALTY_QUEST_POOL: Quest[] = [
  { id: 'p_cardio', label: 'Penalização: Cardio', detail: '20 min de corrida contínua', xp: 0, gold: 0, type: 'training', done: false },
  { id: 'p_squat', label: 'Penalização: Agachamentos', detail: '50 agachamentos consecutivos', xp: 0, gold: 0, type: 'training', done: false },
  { id: 'p_focus', label: 'Penalização: Foco Forçado', detail: '30 min de foco sem interrupções', xp: 0, gold: 0, type: 'focus', focusDuration: 30 * 60_000, done: false },
  { id: 'p_reading', label: 'Penalização: Leitura Disciplinar', detail: '15 páginas (livro não-ficção)', xp: 0, gold: 0, type: 'knowledge', done: false },
  { id: 'p_plank', label: 'Penalização: Prancha do Sistema', detail: '3 min de prancha (acumulados)', xp: 0, gold: 0, type: 'training', done: false },
  { id: 'p_pushups', label: 'Penalização: Flexões', detail: '30 flexões de execução lenta', xp: 0, gold: 0, type: 'training', done: false },
]

function pickPenaltyQuests(count: number): Quest[] {
  const shuffled = [...PENALTY_QUEST_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, PENALTY_QUEST_POOL.length)).map((q, i) => ({ ...q, id: `${q.id}_${i}` }))
}

function computePunishment(
  failedCount: number,
  totalCount: number,
  playerXP: number,
  intensity: PunishmentIntensity,
  penaltyReduced: boolean,
): { xpLost: number; penaltyQuests: Quest[]; hardcorePunished: boolean; streakReset: boolean; penaltyHours: number } {

  if (intensity === 'light') {
    const pct = penaltyReduced ? 0.01 : 0.03
    const xpLost = Math.max(Math.floor(playerXP * pct * failedCount), failedCount * 5)
    const penaltyHours = Math.min(penaltyReduced ? 2 : 2 + failedCount, 6)
    return {
      xpLost,
      penaltyQuests: pickPenaltyQuests(1),
      hardcorePunished: false,
      streakReset: failedCount >= totalCount,
      penaltyHours,
    }
  }

  if (intensity === 'medium') {
    const basePct = penaltyReduced ? 0.05 : 0.10
    const extraPct = 0.01 * failedCount
    const xpLost = Math.max(Math.floor(playerXP * (basePct + extraPct)), failedCount * 10)
    const penaltyHours = Math.min(penaltyReduced ? 4 : 4 + failedCount * 2, 12)
    return {
      xpLost,
      penaltyQuests: pickPenaltyQuests(Math.min(1 + Math.floor(failedCount / 2), 3)),
      hardcorePunished: failedCount >= Math.ceil(totalCount * 0.5),
      streakReset: true,
      penaltyHours,
    }
  }

  // hardcore
  const pct = penaltyReduced ? 0.10 : 0.20
  const xpLost = Math.max(Math.floor(playerXP * pct), 10)
  const penaltyHours = Math.min(penaltyReduced ? 8 : 8 + failedCount * 2, 24)
  return {
    xpLost,
    penaltyQuests: pickPenaltyQuests(Math.min(2 + failedCount, 4)),
    hardcorePunished: true,
    streakReset: true,
    penaltyHours,
  }
}

// ── Achievement evaluation per-achievement-id ──────────────────────────────────

function evaluateAchievementCondition(
  achievementId: string,
  state: GameState,
  payload: TriggerPayload,
  time: { hour: number; minute: number },
): boolean {
  const { player, statistics, system } = state
  const { hour, minute } = time

  switch (achievementId) {
    // Streak
    case 'streak_phoenix': {
      const prev = Number(payload.prevStreak ?? 0)
      return player.currentStreak >= 3 && prev > 10
    }
    case 'streak_scroll_save': return player.currentStreak >= 7

    // Focus
    case 'focus_night_owl': return hour >= 1 && hour < 6
    case 'focus_hardcore_surrender': return true
    case 'focus_igris': return payload.missionId === 'boss_focus'
    case 'focus_long_session': return Number(payload.minutes ?? 0) >= 120

    // Boss
    case 'boss_runner': return payload.missionId === 'boss_gps'
    case 'boss_cerberus': return payload.missionId === 'boss_training'
    case 'boss_omega_slayer': return payload.missionId === 'boss_crypt_omega'
    case 'boss_eclipse_survivor': return payload.missionId === 'boss_astral_eclipse'
    case 'boss_seraph_fall': return payload.missionId === 'boss_seraphim'
    case 'boss_archlich_prime': return payload.missionId === 'boss_archlich_prime'
    case 'boss_soul_reaper': return payload.missionId === 'boss_soul_reaper'
    case 'boss_astral_nebula': return payload.missionId === 'boss_astral_nebula'

    // Event bosses
    case 'event_halloween_reaper': return payload.missionId === 'event_halloween_reaper'
    case 'event_winter_lich': return payload.missionId === 'event_winter_lich'
    case 'event_summer_titan': return payload.missionId === 'event_summer_titan'
    case 'event_new_year_ashen': return payload.missionId === 'event_new_year_ashen'
    case 'event_valentine_oath': return payload.missionId === 'event_valentine_oath'
    case 'event_carnival_mask': return payload.missionId === 'event_carnival_mask'
    case 'event_equinox_guardian': return payload.missionId === 'event_equinox_guardian'
    case 'event_easter_hare': return payload.missionId === 'event_easter_hare'
    case 'event_spring_bloom': return payload.missionId === 'event_spring_bloom'
    case 'event_harvest_king': return payload.missionId === 'event_harvest_king'
    case 'event_black_friday_merchant': return payload.missionId === 'event_black_friday_merchant'
    case 'event_yule_seraph': return payload.missionId === 'event_yule_seraph'
    case 'event_midnight_wraith': return payload.missionId === 'event_midnight_wraith'
    case 'event_festival_drake': return payload.missionId === 'event_festival_drake'

    // Quests
    case 'quests_perfect_week': return Boolean(payload.afterPerfectDay)
    case 'side_quest_first': return true
    case 'side_quest_daily_five': return (statistics.sideQuestsCompletedToday ?? 0) >= 5

    // Economy — hoarder/spender/all_bosses handled in checkAndUnlock, return false here
    case 'economy_first_purchase': return true
    case 'economy_system_pass': return payload.itemId === 'system_pass'
    case 'economy_lagrima_clutch': return system.hasPenalty
    case 'economy_reloj': return Boolean(payload.duringBoss)
    case 'economy_hoarder': return false
    case 'economy_spender': return false

    // Clutch / time
    case 'clutch_last_minute': {
      const minsLeft = (23 * 60 + 59) - (hour * 60 + minute)
      return minsLeft <= 30 && minsLeft >= 0 && Boolean(payload.isLastQuest)
    }
    case 'clutch_late_night': return hour === 23 && minute >= 30 && Boolean(payload.isLastQuest)
    case 'clutch_undo_redo': return true
    case 'dawn_warrior': return hour < 7

    // Rebellion
    case 'rebellion_spam': return true
    case 'rebellion_resist': return true
    case 'rebellion_c_rank': return payload.rank === 'C'

    // Penalty
    case 'penalty_first': return true
    case 'penalty_cleared': return true
    case 'penalty_comeback': return Boolean(payload.afterPenalty)

    // Secret
    case 'secret_first_day': return Boolean(payload.firstDay) && statistics.perfectDays === 0
    case 'secret_all_bosses': return false  // handled in checkAndUnlockAchievements
    case 'shadow_elite': return false  // handled in checkAndUnlockAchievements
    case 'secret_monarch': return false  // handled in checkAndUnlockAchievements

    default: return false
  }
}

// ── Achievement helpers ────────────────────────────────────────────────────────

type StoreRef = {
  get: () => GameState & GameActions
  set: (fn: (s: GameState & GameActions) => Partial<GameState>) => void
}

function unlockAchievements(ids: string[], { get, set }: StoreRef) {
  if (ids.length === 0) return
  const totalGold = ids.reduce((sum, id) => sum + (ACHIEVEMENTS_MAP[id]?.rewardGold ?? 0), 0)
  const totalXP = ids.reduce((sum, id) => sum + (ACHIEVEMENTS_MAP[id]?.rewardXP ?? 0), 0)

  // Collect any achievement-unlocked shadows not yet owned
  const currentShadows = get().player.shadows
  const shadowRewards = ids
    .map(id => SHADOW_BY_ACHIEVEMENT[id])
    .filter((sh): sh is NonNullable<typeof sh> =>
      Boolean(sh) && !currentShadows.some(e => e.id === sh.id)
    )

  set(s => {
    let { xp, level } = s.player
    if (totalXP > 0) {
      const res = applyXP(xp, level, totalXP)
      xp = res.xp; level = res.level
    }
    const newShadows = shadowRewards.map(sh => ({ id: sh.id, level: 1 }))
    // Show extraction modal for first granted shadow (if none pending)
    const pendingExtraction = s.lastExtraction
    const extractionReveal: Partial<GameState> = (!pendingExtraction && shadowRewards.length > 0)
      ? { lastExtraction: { shadow: shadowRewards[0], isLevelUp: false, newLevel: 1 } }
      : {}
    return {
      ...extractionReveal,
      unlockedAchievements: [...s.unlockedAchievements, ...ids],
      newAchievementIds: [...s.newAchievementIds, ...ids],
      player: {
        ...s.player,
        gold: s.player.gold + totalGold,
        xp, level,
        shadows: [...s.player.shadows, ...newShadows],
      },
    }
  })
}

// State-threshold based checks (run after any state-altering action)
function checkAndUnlockAchievements(ref: StoreRef) {
  const { player, statistics, unlockedAchievements } = ref.get()

  const conditions: Record<string, boolean> = {
    economy_hoarder: player.gold >= 5000,
    economy_spender: (statistics.totalGoldSpent ?? 0) >= 3000,
    secret_monarch: player.level >= 20,
    shadow_elite: player.activeShadowIds.length >= 3,
    secret_all_bosses: ['boss_runner', 'boss_cerberus', 'focus_igris', 'boss_omega_slayer', 'boss_eclipse_survivor', 'boss_seraph_fall']
      .every(id => unlockedAchievements.includes(id)),
  }

  const newlyUnlocked = Object.entries(conditions)
    .filter(([id, met]) => met && !unlockedAchievements.includes(id))
    .map(([id]) => id)

  unlockAchievements(newlyUnlocked, ref)

  // Sync all tiered achievements backed by live state values
  progressAchievements('streak_updated', 1, ref, true)
  progressAchievements('level_up', 1, ref, true)
  progressAchievements('shadow_collected', 1, ref, true)
  progressAchievements('boss_defeated', 1, ref, true)
  progressAchievements('focus_total_hours', 1, ref, true)
  progressAchievements('all_quests_completed', 1, ref, true)
}

// Returns the live state counter for tier achievements that mirror a state field.
// Returns null for purely incremental triggers (accumulated in achievementProgress).
function getStateValueForTrigger(event: EventTrigger, state: GameState): number | null {
  switch (event) {
    case 'boss_defeated': return state.system.bossesDefeated
    case 'focus_total_hours': return state.statistics.totalFocusMinutes
    case 'all_quests_completed': return state.statistics.perfectDays
    case 'streak_updated': return state.player.currentStreak
    case 'level_up': return state.player.level
    case 'shadow_collected': return state.player.shadows.length
    default: return null
  }
}

// True when a tiered achievement has all tiers completed (or non-tiered is fully unlocked).
function isFullyDone(a: { id: string; tiers?: unknown[] }, state: GameState): boolean {
  if (state.unlockedAchievements.includes(a.id)) return true
  if (!a.tiers) return false
  const prog = state.achievementProgress[a.id]
  if (!prog) return false
  return prog.currentTierIndex >= a.tiers.length
}

// Tiered achievement tracking — advances tiers and gives per-tier rewards.
function progressAchievements(event: EventTrigger, value: number, ref: StoreRef, syncOnly = false) {
  const state = ref.get()
  const candidates = ACHIEVEMENTS_CATALOG.filter(
    a => a.tiers != null && a.conditionType === event && !isFullyDone(a, state)
  )
  if (candidates.length === 0) return

  const stateValue = getStateValueForTrigger(event, state)
  const progressUpdates: Record<string, AchievementProg> = {}
  let totalGold = 0
  let totalXP = 0
  const notifyIds: string[] = []
  const fullyUnlockedIds: string[] = []

  for (const a of candidates) {
    const raw = state.achievementProgress[a.id]
    const prog: AchievementProg = (raw && typeof raw === 'object' && 'currentTierIndex' in raw)
      ? raw
      : { currentValue: 0, currentTierIndex: 0 }

    let { currentValue, currentTierIndex } = prog
    const newValue = stateValue !== null
      ? stateValue
      : (syncOnly ? currentValue : currentValue + value)

    let idx = currentTierIndex
    while (idx < a.tiers!.length && newValue >= a.tiers![idx].targetValue) {
      const tier = a.tiers![idx]
      totalGold += tier.rewardGold
      totalXP += tier.rewardXP ?? 0
      if (!notifyIds.includes(a.id)) notifyIds.push(a.id)
      idx++
    }

    progressUpdates[a.id] = { currentValue: newValue, currentTierIndex: idx }
    if (idx >= a.tiers!.length) fullyUnlockedIds.push(a.id)
  }

  ref.set(s => {
    let { xp, level } = s.player
    if (totalXP > 0) {
      const res = applyXP(xp, level, totalXP)
      xp = res.xp; level = res.level
    }
    return {
      achievementProgress: { ...s.achievementProgress, ...progressUpdates },
      unlockedAchievements: [...s.unlockedAchievements, ...fullyUnlockedIds],
      newAchievementIds: [
        ...s.newAchievementIds,
        ...notifyIds.filter(id => !s.newAchievementIds.includes(id)),
      ],
      player: (totalGold > 0 || totalXP > 0) ? {
        ...s.player, gold: s.player.gold + totalGold, xp, level,
      } : s.player,
    }
  })
}

// Event-based checks (triggered by specific behaviors)
function fireEvent(event: EventTrigger, payload: TriggerPayload, ref: StoreRef, value = 1) {
  const state = ref.get()
  const now = new Date()
  const time = { hour: now.getHours(), minute: now.getMinutes() }

  // Instant (non-tiered) achievements
  const candidates = ACHIEVEMENTS_CATALOG.filter(
    a => !a.tiers && a.conditionType === event && !state.unlockedAchievements.includes(a.id)
  )
  if (candidates.length > 0) {
    const toUnlock = candidates
      .filter(a => evaluateAchievementCondition(a.id, state, payload, time))
      .map(a => a.id)
    unlockAchievements(toUnlock, ref)
  }

  // Tiered achievements
  progressAchievements(event, value, ref)
}

// ── Initial state ──────────────────────────────────────────────────────────────

const INITIAL_PLAYER: Player = {
  name: 'Hunter', level: 1, xp: 0, gold: 0,
  str: 10, agi: 10, int: 10, vit: 10,
  inventory: [], currentStreak: 0, highestStreak: 0,
  shadows: [] as ShadowEntry[], activeShadowIds: [],
  maxLevelReached: 1,
}

// ── Store ──────────────────────────────────────────────────────────────────────

const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => {
      const ref: StoreRef = { get, set }

      return {
        player: INITIAL_PLAYER,
        quests: createDailyQuests(1, INITIAL_QUEST_DICTIONARY, 'normal'),
        extraQuests: [],
        sideQuests: [],
        questDictionary: INITIAL_QUEST_DICTIONARY,
        customShadows: [],
        settings: INITIAL_SETTINGS,
        statistics: INITIAL_STATS,
        unlockedAchievements: [],
        newAchievementIds: [],
        achievementProgress: {},
        system: {
          focusModeActive: false,
          hardcoreFocusMode: false,
          hardcorePunished: false,
          xpBoostNext: false,
          hasPenalty: false,
          penaltyReduced: false,
          penaltyTriggered: false,
          penaltyQuests: [],
          blockedApps: [],
          weeklyTrainingCount: 0,
          weeklyRegenCount: 0,
          weeklyResetDate: '',
          weeklyBossIds: [],
          bossDefeatedThisWeek: false,
          bossesDefeated: 0,
          shopStocks: { ...INITIAL_SHOP_STOCKS },
          blockedAttemptTimestamps: [],
          extractionDoneToday: false,
          penaltyBlockEnd: 0,
          eventBossKey: '',
          eventBossCompletedIds: [],
          eventBossRequired: 0,
          eventBossTotal: 0,
          eventBossDefeated: false,
          lastPenaltyInfo: undefined,
        },
        lastResetDate: '',
        lastExtraction: null,
        questRecords: {},
        questCompletions: {},
        levelUpReward: null,
        activeMissionTimers: {},

        // ── Event trigger (public) ─────────────────────────────────────────
        triggerEvent(event, payload = {}, value = 1) {
          fireEvent(event, payload, ref, value)
        },

        // ── Progressive event emitter (public, no payload needed) ──────────
        emitEvent(event, value = 1) {
          fireEvent(event, {}, ref, value)
        },

        // ── Blocked app attempt tracker ────────────────────────────────────
        recordBlockedAttempt() {
          const now = Date.now()
          set(s => ({
            system: {
              ...s.system,
              blockedAttemptTimestamps: [
                ...s.system.blockedAttemptTimestamps.filter(t => now - t < 60_000),
                now,
              ],
            },
          }))
          fireEvent('blocked_app_attempt', {}, ref)
          if (get().system.blockedAttemptTimestamps.length >= 5) {
            fireEvent('blocked_app_spam', {}, ref)
          }
        },

        // ── Boot & daily reset ─────────────────────────────────────────────
        bootSystem() {
          const today = new Date().toDateString()
          const { lastResetDate, quests, player, system } = get()

          // Always check if timed penalty block has expired (runs on every app open)
          if (system.hasPenalty && system.penaltyBlockEnd > 0 && Date.now() >= system.penaltyBlockEnd) {
            set((s: GameState & GameActions) => ({ system: { ...s.system, hasPenalty: false, penaltyBlockEnd: 0 } }))
          }

          // ── Dictionary sync: merge any new built-in quests (e.g. boss entries added
          //    after the user first installed) into the persisted questDictionary.
          //    This keeps weeklyBossIds consistent across app updates.
          {
            const storedIds = new Set(get().questDictionary.map(d => d.id))
            const missing   = INITIAL_QUEST_DICTIONARY.filter(d => !storedIds.has(d.id))
            if (missing.length > 0) {
              set(s => ({ questDictionary: [...s.questDictionary, ...missing] }))
            }
          }

          // Force weeklyBossIds to refresh whenever the dictionary is empty (safety net)
          if (get().system.weeklyBossIds.length === 0) {
            const bossDefs = get().questDictionary.filter(d => d.type === 'boss')
            if (bossDefs.length > 0) {
              const picked = seededPick(3, bossDefs.length, Date.now()).map(i => bossDefs[i].id)
              set(s => ({ system: { ...s.system, weeklyBossIds: picked } }))
            }
          }

          if (lastResetDate === today) return

          const thisMonday = getMondayDateString()
          const weeklyReset = system.weeklyResetDate !== thisMonday
          const newWeeklyCount = weeklyReset ? 0 : system.weeklyTrainingCount
          const newWeeklyRegenCount = weeklyReset ? 0 : system.weeklyRegenCount

          // wasRestDay is true if the user manually activated rest day for today
          // (which becomes "yesterday" during the next boot).
          // The flag is reset to false after each daily reset.
          const wasRestDay = get().settings.restDay

          const allDone = quests.length > 0 && quests.every(q => q.done)
          const isFirstDay = lastResetDate === ''
          const hadPenalty = !allDone && !isFirstDay && !wasRestDay

          const failedCount = quests.filter(q => !q.done).length

          let newXp = player.xp
          let penaltyTriggered = false
          let newPenaltyQuests: Quest[] = []
          let newHardcorePunished = false
          let streakReset = false
          let newPenaltyBlockEnd = 0

          if (hadPenalty) {
            const p = computePunishment(
              failedCount, quests.length, player.xp,
              get().settings.punishmentIntensity,
              system.penaltyReduced,
            )
            newXp = Math.max(player.xp - p.xpLost, 0)
            penaltyTriggered = true
            newPenaltyQuests = p.penaltyQuests
            newHardcorePunished = p.hardcorePunished
            streakReset = p.streakReset
            newPenaltyBlockEnd = Date.now() + p.penaltyHours * 3_600_000
          }

          let newStreak = player.currentStreak
          let newHighest = player.highestStreak

          if (!wasRestDay && !isFirstDay) {
            if (allDone) {
              newStreak = player.currentStreak + 1
              newHighest = Math.max(player.highestStreak, newStreak)
            } else if (streakReset && !system.penaltyReduced) {
              newStreak = 0
            }
          }

          const prevStreak = player.currentStreak

          set(s => ({
            quests: createDailyQuests(s.player.level, s.questDictionary, s.settings.missionDifficulty),
            extraQuests: [],
            sideQuests: [],
            lastResetDate: today,
            lastExtraction: null,
            settings: { ...s.settings, restDay: false },  // clear rest day after daily reset
            statistics: {
              ...(allDone
                ? { ...s.statistics, perfectDays: s.statistics.perfectDays + 1 }
                : s.statistics),
              sideQuestsCompletedToday: 0,
            },
            player: { ...s.player, xp: newXp, currentStreak: newStreak, highestStreak: newHighest },
            system: {
              ...s.system,
              hasPenalty: hadPenalty,
              penaltyTriggered,
              penaltyReduced: false,
              hardcorePunished: hadPenalty ? newHardcorePunished : false,
              penaltyQuests: newPenaltyQuests,
              lastPenaltyInfo: hadPenalty ? {
                intensity: get().settings.punishmentIntensity,
                failedCount,
                totalCount: quests.length,
                xpLost: player.xp - newXp,
              } : s.system.lastPenaltyInfo,
              weeklyTrainingCount: newWeeklyCount,
              weeklyRegenCount: newWeeklyRegenCount,
              weeklyResetDate: weeklyReset ? thisMonday : s.system.weeklyResetDate,
              weeklyBossIds: (weeklyReset || s.system.weeklyBossIds.length === 0)
                ? seededPick(3, get().questDictionary.filter((q: QuestDefinition) => q.type === 'boss').length, Date.now()).map(i => get().questDictionary.filter((q: QuestDefinition) => q.type === 'boss')[i].id)
                : s.system.weeklyBossIds,
              bossDefeatedThisWeek: weeklyReset ? false : s.system.bossDefeatedThisWeek,
              weeklyDefeatedBossId: weeklyReset ? undefined : s.system.weeklyDefeatedBossId,
              shopStocks: weeklyReset ? { ...INITIAL_SHOP_STOCKS } : s.system.shopStocks,
              extractionDoneToday: false,
              penaltyBlockEnd: newPenaltyBlockEnd,
            },
          }))

          // Keep the Android widget in sync with the updated streak
          WidgetStorage?.setStreak(newStreak)

          fireEvent('daily_login', {}, ref)
          if (hadPenalty) fireEvent('penalty_triggered', {}, ref)
          if (allDone) fireEvent('all_quests_completed', {
            afterPerfectDay: true,
            firstDay: isFirstDay,
            afterPenalty: system.hasPenalty,  // was in penalty coming into today
          }, ref)
          if (!wasRestDay && !isFirstDay && allDone) {
            fireEvent('streak_updated', { prevStreak }, ref)
          }
          checkAndUnlockAchievements(ref)
          scheduleSystemWarnings().catch(() => { })
        },

        dismissPenaltyModal() {
          set(s => ({ system: { ...s.system, penaltyTriggered: false } }))
        },

        // ── Complete daily quest ───────────────────────────────────────────
        completeQuest(id) {
          let leveledUp = false
          set(s => {
            const quest = s.quests.find(q => q.id === id)
            if (!quest || quest.done) return {}

            const { xpBoost, goldBoost } = computeActivePassives(
              s.player.activeShadowIds, s.player.shadows, s.customShadows,
            )
            const baseXP = s.system.xpBoostNext ? quest.xp * 2 : quest.xp
            const xpGain = Math.round(baseXP * (1 + xpBoost))
            const goldGain = Math.round(quest.gold * (1 + goldBoost))
            const res = applyXP(s.player.xp, s.player.level, xpGain)
            leveledUp = res.leveledUp

            const quests = s.quests.map(q => q.id === id ? { ...q, done: true, xpGained: xpGain, goldGained: goldGain } : q)
            
            const isTraining = quest.type === 'training'
            const newWeeklyCount = isTraining
              ? Math.min(s.system.weeklyTrainingCount + 1, 7)
              : s.system.weeklyTrainingCount

            // Anti-exploit: milestone rewards only fire for truly new levels
            const isNewLevel = res.level > s.player.maxLevelReached

            // Level-up item rewards: level %5 → 1 potion, level %10 → 2 potions
            const REWARD_POOL = ['lagrima_purificacao', 'relogio_ampulheta']
            let rewardItems: string[] = []
            if (res.leveledUp && isNewLevel) {
              const newLvl = res.level
              const count = newLvl % 10 === 0 ? 2 : newLvl % 5 === 0 ? 1 : 0
              for (let i = 0; i < count; i++) {
                rewardItems.push(REWARD_POOL[Math.random() < 0.5 ? 0 : 1])
              }
            }

            // Add reward items to inventory within the same set call
            const rewardInv = [...s.player.inventory]
            rewardItems.forEach(itemId => {
              const idx = rewardInv.findIndex(e => e.itemId === itemId)
              if (idx >= 0) rewardInv[idx] = { ...rewardInv[idx], quantity: rewardInv[idx].quantity + 1 }
              else rewardInv.push({ itemId, quantity: 1 })
            })

            const player: Player = {
              ...s.player,
              xp: res.xp, level: res.level, gold: s.player.gold + goldGain,
              str: s.player.str + (res.level - s.player.level),
              agi: s.player.agi + (res.level - s.player.level),
              int: s.player.int + (res.level - s.player.level),
              vit: s.player.vit + (res.level - s.player.level),
              inventory: rewardItems.length > 0 ? rewardInv : s.player.inventory,
              maxLevelReached: isNewLevel ? res.level : s.player.maxLevelReached,
            }

            const rank = getRank(res.level).rank as RankKey
            return {
              quests, player,
              system: { ...s.system, xpBoostNext: false, weeklyTrainingCount: newWeeklyCount },
              statistics: {
                ...s.statistics,
                totalCompleted: s.statistics.totalCompleted + 1,
                questsByRank: { ...s.statistics.questsByRank, [rank]: (s.statistics.questsByRank[rank] ?? 0) + 1 },
              },
              questCompletions: { ...s.questCompletions, [id]: (s.questCompletions[id] ?? 0) + 1 },
              levelUpReward: rewardItems.length > 0
                ? { level: res.level, items: rewardItems }
                : s.levelUpReward,
            }
          })

          const allNowDone = get().quests.every(q => q.done)
          if (allNowDone) cancelSystemWarnings().catch(() => { })

          // ── Daily shadow extraction ────────────────────────────────────────
          if (allNowDone && !get().system.extractionDoneToday) {
            const state = get()
            const rank = pickExtractionRank(state.player.level)
            const shadow = rollShadow(rank, [])   // no filter: dupes = level up
            if (shadow) {
              const existingEntry = state.player.shadows.find(e => e.id === shadow.id)
              if (existingEntry) {
                const newLevel = existingEntry.level + 1
                set(s => ({
                  player: {
                    ...s.player,
                    shadows: s.player.shadows.map(e =>
                      e.id === shadow.id ? { ...e, level: newLevel } : e
                    ),
                  },
                  lastExtraction: { shadow, isLevelUp: true, newLevel },
                  system: { ...s.system, extractionDoneToday: true },
                }))
              } else {
                set(s => ({
                  player: {
                    ...s.player,
                    shadows: [...s.player.shadows, { id: shadow.id, level: 1 }],
                  },
                  lastExtraction: { shadow, isLevelUp: false, newLevel: 1 },
                  system: { ...s.system, extractionDoneToday: true },
                }))
              }
            }
          }

          fireEvent('quest_completed', { isLastQuest: allNowDone }, ref)
          if (allNowDone) {
            fireEvent('all_quests_completed', {
              afterPerfectDay: true,
              firstDay: get().statistics.perfectDays === 0,
              afterPenalty: get().system.hasPenalty,
            }, ref)
          }

          if (leveledUp) {
            Vibration.vibrate([0, 150, 50, 150, 50, 300])
          } else {
            Vibration.vibrate(50)
          }

          checkAndUnlockAchievements(ref)
          return { leveledUp }
        },

        // ── Skip quest (System Pass) ───────────────────────────────────────
        skipQuest(id) {
          set(s => {
            const quest = s.quests.find(q => q.id === id)
            if (!quest || quest.done) return {}
            const quests = s.quests.map(q => q.id === id ? { ...q, done: true } : q)
            const res = applyXP(s.player.xp, s.player.level, quest.xp)
            return {
              quests,
              player: {
                ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + quest.gold,
                str: s.player.str + (res.leveledUp ? 1 : 0),
                agi: s.player.agi + (res.leveledUp ? 1 : 0),
                int: s.player.int + (res.leveledUp ? 1 : 0),
                vit: s.player.vit + (res.leveledUp ? 1 : 0),
              },
              statistics: { ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1 },
            }
          })
          if (get().quests.every(q => q.done)) cancelSystemWarnings().catch(() => { })
          fireEvent('quest_skipped_via_pass', { itemId: 'system_pass' }, ref)
          checkAndUnlockAchievements(ref)
        },

        // ── Undo daily quest ───────────────────────────────────────────────
        undoQuest(id) {
          set(s => {
            const quest = s.quests.find(q => q.id === id)
            if (!quest?.done) return {}
            const quests = s.quests.map(q => q.id === id ? { ...q, done: false, xpGained: undefined, goldGained: undefined } : q)
            
            const xpToRevert = quest.xpGained ?? quest.xp
            const goldToRevert = quest.goldGained ?? quest.gold

            let { xp, level, gold, str, agi, vit, int } = s.player
            gold = Math.max(gold - goldToRevert, 0)
            
            let newXp = xp - xpToRevert
            let newLevel = level
            while (newXp < 0 && newLevel > 1) {
              newLevel--
              newXp = xpForLevel(newLevel) + newXp
            }

            const levelsLost = level - newLevel
            const rank = getRank(newLevel).rank as RankKey
            return {
              quests,
              system: { ...s.system, weeklyTrainingCount: quest.type === 'training' ? Math.max(s.system.weeklyTrainingCount - 1, 0) : s.system.weeklyTrainingCount },
              statistics: {
                ...s.statistics,
                totalCompleted: Math.max(s.statistics.totalCompleted - 1, 0),
                questsByRank: { ...s.statistics.questsByRank, [rank]: Math.max((s.statistics.questsByRank[rank] ?? 0) - 1, 0) },
              },
              questCompletions: { ...s.questCompletions, [id]: Math.max((s.questCompletions[id] ?? 1) - 1, 0) },
              player: {
                ...s.player, 
                xp: Math.max(newXp, 0), 
                level: newLevel, 
                gold,
                str: Math.max(str - levelsLost, 10),
                agi: Math.max(agi - levelsLost, 10),
                int: Math.max(int - levelsLost, 10),
                vit: Math.max(vit - levelsLost, 10),
              },
            }
          })
        },

        // ── Side Quests ────────────────────────────────────────────────────
        addSideQuest(title: string) {
          if (!title.trim()) return
          const { rank, xp, gold } = generateSideQuestReward()
          const sq: SideQuest = {
            id: `sq_${Date.now()}`, title: title.trim(),
            rank, xp, gold, done: false, createdDate: new Date().toDateString(),
          }
          set(s => ({ sideQuests: [...s.sideQuests, sq] }))
          fireEvent('side_quest_added', {}, ref)
          if (rank === 'C') fireEvent('side_quest_c_rank', { rank }, ref)
        },

        completeSideQuest(id: string) {
          let leveledUp = false
          set(s => {
            const sq = s.sideQuests.find(q => q.id === id)
            if (!sq || sq.done) return {}

            const { xpBoost, goldBoost } = computeActivePassives(
              s.player.activeShadowIds, s.player.shadows, s.customShadows,
            )
            const baseXP = s.system.xpBoostNext ? sq.xp * 2 : sq.xp
            const xpGain = Math.round(baseXP * (1 + xpBoost))
            const goldGain = Math.round(sq.gold * (1 + goldBoost))
            const res = applyXP(s.player.xp, s.player.level, xpGain)
            leveledUp = res.leveledUp

            const sideQuests = s.sideQuests.map(q => q.id === id ? { ...q, done: true, xpGained: xpGain, goldGained: goldGain } : q)

            return {
              sideQuests,
              system: { ...s.system, xpBoostNext: false },
              player: {
                ...s.player, xp: res.xp, level: res.level, gold: s.player.gold + goldGain,
                str: s.player.str + (res.level - s.player.level),
                agi: s.player.agi + (res.level - s.player.level),
                int: s.player.int + (res.level - s.player.level),
                vit: s.player.vit + (res.level - s.player.level),
              },
              statistics: {
                ...s.statistics,
                totalCompleted: s.statistics.totalCompleted + 1,
                sideQuestsCompletedToday: (s.statistics.sideQuestsCompletedToday ?? 0) + 1,
              },
            }
          })
          const todayCount = get().statistics.sideQuestsCompletedToday
          fireEvent('side_quest_completed', { todayCount }, ref)
          checkAndUnlockAchievements(ref)
          return { leveledUp }
        },

        removeSideQuest(id: string) {
          set(s => ({ sideQuests: s.sideQuests.filter(q => q.id !== id) }))
        },

        // ── XP / Focus ─────────────────────────────────────────────────────
        addXP(amount) {
          let leveledUp = false
          set(s => {
            const res = applyXP(s.player.xp, s.player.level, amount)
            leveledUp = res.leveledUp
            return {
              player: {
                ...s.player, xp: res.xp, level: res.level,
                str: s.player.str + (res.leveledUp ? 1 : 0),
                agi: s.player.agi + (res.leveledUp ? 1 : 0),
                int: s.player.int + (res.leveledUp ? 1 : 0),
                vit: s.player.vit + (res.leveledUp ? 1 : 0),
              },
            }
          })
          checkAndUnlockAchievements(ref)
          return { leveledUp }
        },

        recordFocusTime(minutes) {
          const safeMinutes = Math.max(0, minutes)
          if (safeMinutes === 0) return
          set(s => {
            const stats = { ...s.statistics, totalFocusMinutes: s.statistics.totalFocusMinutes + safeMinutes }
            if (!s.system.hasPenalty || s.system.penaltyBlockEnd <= 0) {
              return { statistics: stats }
            }
            const newEnd = s.system.penaltyBlockEnd - safeMinutes * 60_000
            if (newEnd <= Date.now()) {
              return { statistics: stats, system: { ...s.system, hasPenalty: false, penaltyBlockEnd: 0 } }
            }
            return { statistics: stats, system: { ...s.system, penaltyBlockEnd: newEnd } }
          })
          fireEvent('focus_total_hours', {}, ref, safeMinutes)
          fireEvent('focus_session_completed', { minutes: safeMinutes }, ref, 1)
          checkAndUnlockAchievements(ref)
        },

        // ── Inventory / Shop ───────────────────────────────────────────────
        purchaseItem(itemId, cost) {
          if (cost < 0) return false
          const state = get()
          if (state.player.gold < cost) return false
          if (STOCKED_ITEMS.includes(itemId) && (state.system.shopStocks[itemId] ?? 0) <= 0) return false

          set(s => {
            const inv = [...s.player.inventory]
            const idx = inv.findIndex(e => e.itemId === itemId)
            if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + 1 }
            else inv.push({ itemId, quantity: 1 })

            const newStocks = STOCKED_ITEMS.includes(itemId)
              ? { ...s.system.shopStocks, [itemId]: (s.system.shopStocks[itemId] ?? 0) - 1 }
              : s.system.shopStocks

            return {
              player: {
                ...s.player, gold: s.player.gold - cost, inventory: inv,
              },
              system: { ...s.system, shopStocks: newStocks },
              statistics: {
                ...s.statistics,
                totalGoldSpent: (s.statistics.totalGoldSpent ?? 0) + cost,
              },
            }
          })

          fireEvent('item_purchased', { itemId }, ref)
          fireEvent('gold_spent_total', { itemId }, ref, cost)
          checkAndUnlockAchievements(ref)
          return true
        },

        useInventoryItem(itemId) {
          set(s => {
            const inv = s.player.inventory
              .map(e => e.itemId === itemId ? { ...e, quantity: e.quantity - 1 } : e)
              .filter(e => e.quantity > 0)
            return { player: { ...s.player, inventory: inv } }
          })
        },

        addToInventory(itemId, qty = 1) {
          set(s => {
            const inv = [...s.player.inventory]
            const idx = inv.findIndex(e => e.itemId === itemId)
            if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + qty }
            else inv.push({ itemId, quantity: qty })
            return { player: { ...s.player, inventory: inv } }
          })
        },

        // ── Boss Raid ──────────────────────────────────────────────────────
        defeatDungeonBoss(shadowId, customDef) {
          const { player, customShadows } = get()
          const xpReward = 150 + player.level * 10
          const goldReward = 100 + player.level * 5
          const canDrop = player.level >= 10

          let resultShadowName: string | undefined
          let leveledUpShadow = false

          if (canDrop) {
            if (customDef) {
              // Custom boss shadow: check if already owned by same boss id
              const existing = player.shadows.find(e => e.id === shadowId)
              if (existing) {
                // Level up existing custom shadow
                leveledUpShadow = true
                set(s => ({
                  player: {
                    ...s.player,
                    shadows: s.player.shadows.map(e =>
                      e.id === shadowId ? { ...e, level: e.level + 1 } : e
                    ),
                  },
                }))
              } else {
                // First defeat: create custom Shadow + add entry
                const passive = getCustomShadowPassive(customDef.questType)
                const newCustomShadow: Shadow = {
                  id: shadowId,
                  name: customDef.name,
                  rank: 'Normal',
                  type: 'Custom',
                  dropRate: 0,
                  passiveEffect: passive,
                  lore: `"${customDef.name} — forjada pelo Monarca nas chamas da disciplina. A sua lealdade é absoluta."`,
                  icon: customDef.icon,
                  color: '#a855f7',
                }
                set(s => ({
                  customShadows: [...s.customShadows, newCustomShadow],
                  player: { ...s.player, shadows: [...s.player.shadows, { id: shadowId, level: 1 }] },
                }))
                resultShadowName = customDef.name
              }
            } else {
              // Standard shadow from SHADOW_DATABASE
              const existing = player.shadows.find(e => e.id === shadowId)
              if (existing) {
                // Already owned → level up
                leveledUpShadow = true
                set(s => ({
                  player: {
                    ...s.player,
                    shadows: s.player.shadows.map(e =>
                      e.id === shadowId ? { ...e, level: e.level + 1 } : e
                    ),
                  },
                }))
              } else {
                // New shadow
                set(s => ({
                  player: { ...s.player, shadows: [...s.player.shadows, { id: shadowId, level: 1 }] },
                }))
                resultShadowName = shadowId
              }
            }
          }

          set(s => {
            const res = applyXP(s.player.xp, s.player.level, xpReward)
            return {
              player: {
                ...s.player, xp: res.xp, level: res.level,
                gold: s.player.gold + goldReward,
                str: s.player.str + (res.leveledUp ? 1 : 0),
                agi: s.player.agi + (res.leveledUp ? 1 : 0),
                int: s.player.int + (res.leveledUp ? 1 : 0),
                vit: s.player.vit + (res.leveledUp ? 1 : 0),
              },
              system: {
                ...s.system,
                bossDefeatedThisWeek: true,
                weeklyDefeatedBossId: shadowId,
                bossesDefeated: s.system.bossesDefeated + 1,
              },
            }
          })

          Vibration.vibrate([0, 100, 50, 200])
          fireEvent('boss_defeated', { missionId: shadowId }, ref, 1)
          if (resultShadowName) fireEvent('shadow_collected', {}, ref)
          checkAndUnlockAchievements(ref)
          return { xp: xpReward, gold: goldReward, shadowName: resultShadowName, leveledUpShadow }
        },

        // ── System toggles ─────────────────────────────────────────────────
        setFocusModeActive(v) { set(s => ({ system: { ...s.system, focusModeActive: v } })) },
        setHardcoreFocusMode(v) { set(s => ({ system: { ...s.system, hardcoreFocusMode: v } })) },
        setHardcorePunished(v) { set(s => ({ system: { ...s.system, hardcorePunished: v } })) },
        setXpBoostNext(v) { set(s => ({ system: { ...s.system, xpBoostNext: v } })) },
        setPenaltyReduced(v) { set(s => ({ system: { ...s.system, penaltyReduced: v } })) },

        removePenalty() {
          set(s => ({
            system: { ...s.system, hasPenalty: false, penaltyTriggered: false, penaltyQuests: [], penaltyBlockEnd: 0 },
          }))
          fireEvent('penalty_cleared', {}, ref)
        },

        deductGold(amount) {
          if (get().player.gold < amount) return false
          set(s => ({
            player: { ...s.player, gold: s.player.gold - amount },
            statistics: {
              ...s.statistics,
              totalGoldSpent: (s.statistics.totalGoldSpent ?? 0) + amount,
            },
          }))
          return true
        },

        toggleBlockedApp(pkg) {
          set(s => {
            const apps = s.system.blockedApps.includes(pkg)
              ? s.system.blockedApps.filter(p => p !== pkg)
              : [...s.system.blockedApps, pkg]
            return { system: { ...s.system, blockedApps: apps } }
          })
        },

        dismissAchievement() {
          set(s => ({ newAchievementIds: s.newAchievementIds.slice(1) }))
        },

        // ── Quest Dictionary CRUD ──────────────────────────────────────────
        addQuestDefinition(def) {
          set(s => ({ questDictionary: [...s.questDictionary, def] }))
        },

        updateQuestDefinition(id, patch) {
          set(s => ({
            questDictionary: s.questDictionary.map(d =>
              d.id === id ? { ...d, ...patch } : d
            ),
          }))
        },

        deleteQuestDefinition(id) {
          set(s => ({
            questDictionary: s.questDictionary.filter(d => d.id !== id),
          }))
        },

        updateSettings(patch) {
          set(s => ({ settings: { ...s.settings, ...patch } }))
        },

        saveQuestRecord(questId: string, time: number, note: string) {
          set(s => {
            const prev = s.questRecords[questId]
            // Only update bestTime if this run is better (shorter) and valid (> 0)
            const bestTime = time > 0 && (!prev || time < prev.bestTime)
              ? time
              : prev?.bestTime ?? 0
            return {
              questRecords: {
                ...s.questRecords,
                [questId]: { bestTime, lastNote: note },
              },
            }
          })
        },

        dismissLevelUpReward() {
          set({ levelUpReward: null })
        },

        startMissionTimer(id: string) {
          set(s => ({ activeMissionTimers: { ...s.activeMissionTimers, [id]: Date.now() } }))
        },

        clearMissionTimer(id: string) {
          set(s => {
            const { [id]: _, ...rest } = s.activeMissionTimers
            return { activeMissionTimers: rest }
          })
        },

        dismissExtraction() {
          set({ lastExtraction: null })
        },

        // ── Vanguard: equip / unequip shadow ──────────────────────────────
        toggleActiveShadow(id) {
          const MAX_ACTIVE = 3
          set((s: GameState & GameActions) => {
            const active = s.player.activeShadowIds
            const isActive = active.includes(id)
            const newActive = isActive
              ? active.filter(a => a !== id)
              : active.length < MAX_ACTIVE ? [...active, id] : active
            return { player: { ...s.player, activeShadowIds: newActive } }
          })
        },

        setEventBossState(key: string, required: number, total: number) {
          set(s => ({
            system: {
              ...s.system,
              eventBossKey: key,
              eventBossCompletedIds: [],
              eventBossRequired: required,
              eventBossTotal: total,
              eventBossDefeated: false,
            },
          }))
        },

        completeEventTrial(id: string, key: string, required: number, total: number) {
          let completed = 0
          set(s => {
            const reset = s.system.eventBossKey !== key
            const currentIds = reset ? [] : s.system.eventBossCompletedIds
            const nextIds = currentIds.includes(id) ? currentIds : [...currentIds, id]
            completed = nextIds.length
            return {
              system: {
                ...s.system,
                eventBossKey: key,
                eventBossCompletedIds: nextIds,
                eventBossRequired: required,
                eventBossTotal: total,
              },
            }
          })
          return { completed, required }
        },

        markEventBossDefeated(key: string) {
          set(s => ({
            system: {
              ...s.system,
              eventBossKey: key,
              eventBossDefeated: true,
            },
          }))
        },

        // ── Release shadow (sell) ──────────────────────────────────────────
        releaseShadow(id) {
          const { player, customShadows } = get()
          const entry = player.shadows.find(e => e.id === id)
          if (!entry) return { gold: 0 }

          const customMap: Record<string, Shadow> = {}
          for (const sh of customShadows) customMap[sh.id] = sh
          const shadow = ({ ...SHADOW_MAP, ...customMap })[id]
          const goldGained = shadow ? getShadowReleaseGold(shadow, entry.level) : 0

          set(s => ({
            player: {
              ...s.player,
              gold: s.player.gold + goldGained,
              shadows: s.player.shadows.filter(e => e.id !== id),
              activeShadowIds: s.player.activeShadowIds.filter(a => a !== id),
            },
            customShadows: s.customShadows.filter(sh => sh.id !== id),
          }))
          return { gold: goldGained }
        },

        regenerateDailyQuests() {
          const { system, player, questDictionary } = get()
          const MAX_REGENS_PER_WEEK = 3
          if (system.weeklyRegenCount >= MAX_REGENS_PER_WEEK) {
            return { success: false, reason: 'Limite semanal de regenerações atingido.' }
          }

          const d = new Date()
          // Varied seed: Date + current regen count to ensure different results each time
          const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + system.weeklyRegenCount + 1

          const newQuests = createDailyQuests(player.level, questDictionary, get().settings.missionDifficulty, seed)

          set(s => ({
            quests: newQuests,
            system: { ...s.system, weeklyRegenCount: s.system.weeklyRegenCount + 1 },
          }))
          return { success: true }
        },

        generateExtraQuests() {
          const { system, player, questDictionary, extraQuests } = get()
          const MAX_EXTRA_PER_DAY = 2
          if (extraQuests.length >= MAX_EXTRA_PER_DAY) {
            return { success: false, reason: 'Limite diário de missões extra atingido.' }
          }

          const poolDefs = questDictionary.filter(def => def.type === 'pool')
          if (poolDefs.length === 0) return { success: false, reason: 'Sem missões na pool.' }

          // Pick a random pool mission not already in extraQuests
          const usedIds = new Set(extraQuests.map(q => q.id))
          const available = poolDefs.filter(def => !usedIds.has(def.id))
          if (available.length === 0) return { success: false, reason: 'Todas as missões extra já foram geradas.' }

          const tier = getQuestTier(player.level)
          const idx = Math.floor(Math.random() * available.length)
          const quest = defToQuest(available[idx], player.level, tier)

          // 1.5× bonus rewards
          const extraQuest: Quest = {
            ...quest,
            id: `extra_${quest.id}_${Date.now()}`,
            xp: Math.round(quest.xp * 1.5),
            gold: Math.round(quest.gold * 1.5),
          }

          set(s => ({ extraQuests: [...s.extraQuests, extraQuest] }))
          return { success: true }
        },

        completeExtraQuest(id) {
          let leveledUp = false
          set(s => {
            const quest = s.extraQuests.find(q => q.id === id)
            if (!quest || quest.done) return {}

            const extraQuests = s.extraQuests.map(q => q.id === id ? { ...q, done: true } : q)
            const { xpBoost, goldBoost } = computeActivePassives(
              s.player.activeShadowIds, s.player.shadows, s.customShadows,
            )
            const baseXP = s.system.xpBoostNext ? quest.xp * 2 : quest.xp
            const xpGain = Math.round(baseXP * (1 + xpBoost))
            const goldGain = Math.round(quest.gold * (1 + goldBoost))
            const res = applyXP(s.player.xp, s.player.level, xpGain)
            leveledUp = res.leveledUp

            const player: Player = {
              ...s.player,
              xp: res.xp, level: res.level, gold: s.player.gold + goldGain,
              str: s.player.str + (res.leveledUp ? 1 : 0),
              agi: s.player.agi + (res.leveledUp ? 1 : 0),
              int: s.player.int + (res.leveledUp ? 1 : 0),
              vit: s.player.vit + (res.leveledUp ? 1 : 0),
            }
            return {
              extraQuests, player,
              system: { ...s.system, xpBoostNext: false },
              statistics: { ...s.statistics, totalCompleted: s.statistics.totalCompleted + 1 },
            }
          })
          fireEvent('quest_completed', { isLastQuest: false }, ref)

          if (leveledUp) {
            Vibration.vibrate([0, 150, 50, 150, 50, 300])
          } else {
            Vibration.vibrate(50)
          }

          checkAndUnlockAchievements(ref)
          return { leveledUp }
        },
        restoreBackup(data: Partial<GameState>) {
          if (!data || typeof data !== 'object') return
          // Only merge known top-level keys to prevent injecting arbitrary shape
          const safe: Partial<GameState> = {}
          const allowed: Array<keyof GameState> = [
            'player', 'quests', 'extraQuests', 'sideQuests', 'questDictionary',
            'customShadows', 'settings', 'statistics', 'system', 'lastResetDate',
            'unlockedAchievements', 'achievementProgress', 'questRecords',
            'questCompletions', 'activeMissionTimers',
          ]
          for (const key of allowed) {
            if (key in data) (safe as any)[key] = (data as any)[key]
          }
          set((s: GameState & GameActions) => ({ ...s, ...safe } as Partial<GameState & GameActions>))
        },
      }
    },
    {
      name: 'solo-leveling-v3',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted: any, current: any) => {
        // Migrate legacy shadows: string[] → ShadowEntry[]
        const rawPlayer = persisted.player ?? {}
        const rawShadows = rawPlayer.shadows ?? []
        const migratedShadows: ShadowEntry[] = rawShadows.map((s: any) =>
          typeof s === 'string' ? { id: s, level: 1 } : s
        )
        return {
          ...current,
          ...persisted,
          player: { ...current.player, ...rawPlayer, shadows: migratedShadows, activeShadowIds: rawPlayer.activeShadowIds ?? [] },
          system: { ...current.system, ...(persisted.system ?? {}) },
          settings: { ...current.settings, ...(persisted.settings ?? {}) },
          statistics: { ...current.statistics, ...(persisted.statistics ?? {}) },
          questDictionary: persisted.questDictionary ?? current.questDictionary,
          customShadows: persisted.customShadows ?? current.customShadows,
          lastExtraction: persisted.lastExtraction ?? null,
          achievementProgress: Object.fromEntries(
            Object.entries(persisted.achievementProgress ?? {}).map(([id, val]) => {
              if (typeof val === 'number') return [id, { currentValue: val, currentTierIndex: 0 }]
              return [id, val]
            })
          ) as Record<string, AchievementProg>,
          questRecords: persisted.questRecords ?? {},
          questCompletions: persisted.questCompletions ?? {},
          activeMissionTimers: persisted.activeMissionTimers ?? {},
          newAchievementIds: [],
        }
      },
      partialize: s => ({
        player: s.player,
        sideQuests: s.sideQuests,
        extraQuests: s.extraQuests,
        questDictionary: s.questDictionary,
        customShadows: s.customShadows,
        settings: s.settings,
        system: { ...s.system, penaltyTriggered: false },
        statistics: s.statistics,
        lastResetDate: s.lastResetDate,
        lastExtraction: s.lastExtraction,
        unlockedAchievements: s.unlockedAchievements,
        achievementProgress: s.achievementProgress,
        questRecords: s.questRecords,
        questCompletions: s.questCompletions,
        activeMissionTimers: s.activeMissionTimers,
      }),
    }
  )
)

// ── Widget Synchronization ───────────────────────────────────────────────────

useGameStore.subscribe((state: GameState & GameActions) => {
  try {
    const rankObj = getRank(
      state.player.level,
      state.statistics.totalCompleted,
      state.system.bossesDefeated,
      state.statistics.questsByRank
    );

    const snapshot = {
      streak: state.player.currentStreak,
      dailyQuests: state.quests.map((q: Quest) => ({
        id: q.id,
        label: q.label,
        done: q.done
      })),
      activeShadows: state.player.activeShadowIds.map(id => {
        const entry = state.player.shadows.find(s => s.id === id);
        const customShadow = state.customShadows.find(s => s.id === id);
        const shadowDef = SHADOW_MAP[id] || customShadow;
        return { name: shadowDef?.name ?? id, level: entry?.level ?? 1 };
      }),
      status: {
        level: state.player.level,
        xp: state.player.xp,
        rank: rankObj.rank,
        nextRankXp: xpForLevel(state.player.level)
      }
    };
    if (SharedStorage?.setWidgetData && typeof SharedStorage.setWidgetData === 'function') {
      SharedStorage.setWidgetData(JSON.stringify(snapshot));
    }
  } catch (err) {
    console.error('Failed to sync widget data:', err);
  }
});

export default useGameStore
