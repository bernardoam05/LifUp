import { APP_THEMES } from './data/themes';
export { APP_THEMES } from './data/themes';
import useGameStore from './store/useGameStore';

export const C = APP_THEMES[0].colors;

export function useTheme() {
  const activeThemeId = useGameStore(s => s.player?.activeThemeId);
  const theme = APP_THEMES.find(t => t.id === activeThemeId) || APP_THEMES[0];
  return theme.colors;
}

export const FONT = {
  // Place Orbitron-Bold.ttf in android/app/src/main/assets/fonts/ to enable
  orbitron: 'monospace',
  system:   'monospace',
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
} as const;

export const RANK_COLORS: Record<string, string> = {
  'E': '#94a3b8', // Gray
  'D': '#22c55e', // Green
  'C': '#0ea5e9', // Blue
  'B': '#a855f7', // Purple
  'A': '#f97316', // Orange
  'S': '#fbbf24', // Yellow/Gold
  'National': '#ef4444', // Red
};
