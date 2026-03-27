import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import useGameStore from '../store/useGameStore'

/**
 * Hook that monitors for day changes (midnight) and triggers the daily reset
 * without requiring the user to close and reopen the app.
 */
export function useDayWatcher() {
  const checkDailyReset = useGameStore(s => s.checkDailyReset)
  const checkDynamicPortalSpawn = useGameStore(s => s.checkDynamicPortalSpawn)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    function maybeReset() {
      const today = new Date().toDateString()
      const lastReset = useGameStore.getState().lastResetDate
      if (lastReset !== today) {
        checkDailyReset()
      }
      checkDynamicPortalSpawn()
    }

    // 1. Periodic check (every 60 seconds)
    const interval = setInterval(maybeReset, 60000)

    // 2. Foreground check (when app returns from background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        maybeReset()
      }
      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [checkDailyReset, checkDynamicPortalSpawn])
}
