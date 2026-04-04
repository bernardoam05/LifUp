import { Shadow } from './shadows_types';

export const SHADOWS_CALENDAR: Shadow[] = [
  {
    id: 'calendar_knight',
    name: 'Guardião do Calendário',
    rank: 'Knight',
    type: 'Warrior',
    dropRate: 0,
    passiveEffect: { type: 'xp_boost', value: 0.05, description: '+5% XP em todas as missões' },
    lore: '"Aparece apenas uma vez por mês, no décimo quinto dia. A sua lealdade é medida não em batalhas, mas em consistência."',
    icon: 'calendar-check',
    color: '#3b82f6',
    unlockMethod: { type: 'calendar', day: 15 },
  },
  {
    id: 'calendar_marshal',
    name: 'Marechal da Perseverança',
    rank: 'Marshal',
    type: 'General',
    dropRate: 0,
    passiveEffect: { type: 'gold_boost', value: 0.08, description: '+8% Gold em todas as missões' },
    lore: '"Conquistado apenas pelos que completam o ciclo completo. Trinta dias de presença. Trinta dias de disciplina. A recompensa máxima do calendário."',
    icon: 'calendar-star',
    color: '#ef4444',
    unlockMethod: { type: 'calendar', day: 30 },
  },
];
