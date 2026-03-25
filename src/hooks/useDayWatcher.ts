import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import useGameStore from '../store/useGameStore'

/**
 * Hook that monitors for day changes (midnight) and triggers the daily reset
 * without requiring the user to close and reopen the app.
 */
export function useDayWatcher() {
  const { checkDailyReset, checkDynamicPortalSpawn, lastResetDate } = useGameStore()
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    // 1. Periodic check (every 60 seconds)
    const interval = setInterval(() => {
      const today = new Date().toDateString()
      if (lastResetDate && lastResetDate !== today) {
        console.log('[DayWatcher] Periodic check: Day changed, triggering reset.')
        checkDailyReset()
      }
      checkDynamicPortalSpawn()
    }, 60000)

    // 2. Foreground check (when app returns from background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const today = new Date().toDateString()
        if (lastResetDate && lastResetDate !== today) {
          console.log('[DayWatcher] Foreground check: Day changed, triggering reset.')
          checkDailyReset()
        }
        checkDynamicPortalSpawn()
      }
      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [checkDailyReset, checkDynamicPortalSpawn, lastResetDate])
}
