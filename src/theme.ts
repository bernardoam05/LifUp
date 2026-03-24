import { APP_THEMES } from './data/themes'
import useGameStore from './store/useGameStore'

export const C = APP_THEMES[0].colors

export function useTheme() {
  const activeThemeId = useGameStore(s => s.player?.activeThemeId)
  const theme = APP_THEMES.find(t => t.id === activeThemeId) || APP_THEMES[0]
  return theme.colors
}

export const FONT = {
  // Place Orbitron-Bold.ttf in android/app/src/main/assets/fonts/ to enable
  orbitron: 'monospace',
  system:   'monospace',
} as const

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
} as const
