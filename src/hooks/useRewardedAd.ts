import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

export const AD_UNIT_GOLD     = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/1817448502';
export const AD_UNIT_REROLL   = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/7229345259';
export const AD_UNIT_STREAK   = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/4990194729';
export const AD_UNIT_PENALTY  = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/5916263588';
export const AD_UNIT_XP_BOOST = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/6223385346';
export const AD_UNIT_ITEM     = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/3872554177';
export const AD_UNIT_BOSS_HP  = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9715313780417793/2559472500';

export function useRewardedAd(adUnitId: string) {
  const [loaded, setLoaded] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);
  const setupRef = useRef<() => void>();

  useEffect(() => {
    let unsubs: Array<() => void> = [];

    setupRef.current = () => {
      unsubs.forEach(u => u());
      unsubs = [];
      const ad = RewardedAd.createForAdRequest(adUnitId);
      adRef.current = ad;
      setLoaded(false);

      unsubs.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setLoaded(true);
      }));

      unsubs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        callbackRef.current?.();
        callbackRef.current = null;
        // Preload next ad
        setTimeout(() => setupRef.current?.(), 500);
      }));

      ad.load();
    };

    setupRef.current();

    return () => {
      unsubs.forEach(u => u());
      unsubs = [];
    };
  }, [adUnitId]);

  const show = useCallback((onReward: () => void, onError?: () => void) => {
    if (!loaded || !adRef.current) { onError?.(); return; }
    callbackRef.current = onReward;
    setLoaded(false);
    adRef.current.show().catch(() => {
      callbackRef.current = null;
      setupRef.current?.();
      onError?.();
    });
  }, [loaded]);

  return { loaded, show };
}
