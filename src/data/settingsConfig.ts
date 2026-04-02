import { MissionDifficulty, PunishmentIntensity } from '../store/useGameStore';

export type DifficultyOption = {
  value:       MissionDifficulty
  label:       string
  sublabel:    string
  icon:        string
  color:       string
  description: string[]
}

export type IntensityOption = {
  value:       PunishmentIntensity
  label:       string
  sublabel:    string
  icon:        string
  color:       string
  description: string[]
}

export const getDifficultyOptions = (C: any): DifficultyOption[] => [
  {
    value:    'easy',
    label:    'FÁCIL',
    sublabel: 'Protocolo de Treino Leve',
    icon:     'leaf',
    color:    '#22c55e',
    description: [
      '· Máximo de 3 missões por dia',
      '· Ideal para começar ou dias difíceis',
      '· Recompensas base sem escalonamento',
    ],
  },
  {
    value:    'normal',
    label:    'NORMAL',
    sublabel: 'Protocolo Padrão do Sistema',
    icon:     'sword',
    color:    C.neonBlue,
    description: [
      '· 3 missões base + 1 por cada 10 níveis (máx 5)',
      '· Recompensas escalonadas com o nível',
      '· Dificuldade recomendada',
    ],
  },
  {
    value:    'hard',
    label:    'DIFÍCIL',
    sublabel: 'Protocolo do Monarca Sombrio',
    icon:     'skull-crossbones',
    color:    C.neonRed,
    description: [
      '· 4 missões base + 1 por cada 5 níveis (máx 8)',
      '· Para caçadores de elite',
      '· Recompensas e penalizações amplificadas',
    ],
  },
  {
    value:    'custom',
    label:    'PERSONALIZADO',
    sublabel: 'Define o teu próprio ritmo',
    icon:     'tune-variant',
    color:    C.gold,
    description: [
      '· Escolhe quantas missões diárias queres',
      '· Ideal para ajustar o volume ao teu horário',
      '· Mantém a progressão normal',
    ],
  },
];

export const getIntensityOptions = (C: any): IntensityOption[] => [
  {
    value:    'light',
    label:    'LEVE',
    sublabel: 'Protocolo Brando',
    icon:     'shield-outline',
    color:    '#22c55e',
    description: [
      '· Perda de XP: ~3% por missão falhada',
      '· 1 missão de penalização',
      '· Streak mantida (excepto falha total)',
      '· Sem bloqueio de apps',
    ],
  },
  {
    value:    'medium',
    label:    'MÉDIO',
    sublabel: 'Protocolo Padrão',
    icon:     'sword',
    color:    C.gold,
    description: [
      '· Perda de XP: 10% + 1% por falha',
      '· 1–3 missões de penalização',
      '· Streak reposta a zero',
      '· Bloqueio de apps se ≥50% falhado',
    ],
  },
  {
    value:    'hardcore',
    label:    'HARDCORE',
    sublabel: 'Protocolo do Monarca',
    icon:     'skull-crossbones',
    color:    C.neonRed,
    description: [
      '· Perda de XP: 20% total',
      '· 2–4 missões de penalização',
      '· Streak reposta a zero',
      '· Bloqueio de apps sempre ativo',
    ],
  },
  {
    value:    'custom',
    label:    'PERSONALIZADO',
    sublabel: 'Escolhe o tempo de bloqueio',
    icon:     'timer-sand',
    color:    C.gold,
    description: [
      '· Define quantas horas de bloqueio queres',
      '· Restante lógica mantém-se equilibrada',
      '· Útil para horários irregulares',
    ],
  },
];
