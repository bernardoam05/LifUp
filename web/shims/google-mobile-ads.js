/**
 * Web shim for react-native-google-mobile-ads.
 * Ads never load on web: LOADED never fires, show() rejects, so every ad UI
 * path falls back to its graceful "not loaded" state.
 */

export const TestIds = { REWARDED: 'web-disabled' };

export const RewardedAdEventType = {
  LOADED: 'rewarded_loaded',
  EARNED_REWARD: 'rewarded_earned_reward',
};

export class RewardedAd {
  static createForAdRequest() {
    return new RewardedAd();
  }
  addAdEventListener() {
    return () => {};
  }
  load() {}
  show() {
    return Promise.reject(new Error('Ads are not available on web'));
  }
}

export default {};
