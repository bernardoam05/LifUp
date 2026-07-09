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
  // Rajdhani (SIL OFL) — bundled in android/app/src/main/assets/fonts/ and web/fonts/
  orbitron: 'Rajdhani-Bold',
  system:   'Rajdhani-Medium',
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
} as const;

// Border-radius scale: chip = badges/tags, card = panels/cards, sheet = bottom sheets
export const RADIUS = {
  chip:  4,
  card:  10,
  sheet: 24,
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
