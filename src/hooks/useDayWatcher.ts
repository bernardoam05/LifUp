import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import useGameStore from '../store/useGameStore';

/**
 * Hook that monitors for day changes (midnight) and triggers the daily reset
 * without requiring the user to close and reopen the app.
 */
export function useDayWatcher() {
  const checkDailyReset = useGameStore(s => s.checkDailyReset);
  const checkDynamicPortalSpawn = useGameStore(s => s.checkDynamicPortalSpawn);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    function maybeReset() {
      const today = new Date().toDateString();
      const lastReset = useGameStore.getState().lastResetDate;
      if (lastReset !== today) {
        checkDailyReset();
      }
      checkDynamicPortalSpawn();

      // Activate the penalty lockout once its scheduled start time arrives.
      // bootSystem sets focusModeActive=false for future-scheduled blocks so
      // that native blocking doesn't trigger before the intended window.
      const sys = useGameStore.getState().system;
      const now = Date.now();
      const settings = useGameStore.getState().settings;
      if (
        sys.hasPenalty &&
        settings.autoBlockApps &&
        !sys.focusModeActive &&
        (sys.penaltyBlockStart ?? 0) > 0 &&
        (sys.penaltyBlockStart ?? 0) <= now &&
        (sys.penaltyBlockEnd ?? 0) > now
      ) {
        useGameStore.getState().setFocusModeActive(true, sys.penaltyBlockEnd);
      }
    }

    // 1. Periodic check (every 60 seconds)
    const interval = setInterval(maybeReset, 60000);

    // 2. Foreground check (when app returns from background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        maybeReset();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkDailyReset, checkDynamicPortalSpawn]);
}
