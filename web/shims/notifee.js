/**
 * Web shim for @notifee/react-native.
 * Immediate notifications use the Web Notification API; scheduled triggers are
 * best-effort no-ops (browsers can't schedule notifications without push).
 */

const hasNotification = () => typeof window !== 'undefined' && 'Notification' in window;

const notifee = {
  createChannel: async () => 'web',

  requestPermission: async () => {
    let authorizationStatus = 0;
    if (hasNotification()) {
      try {
        const res = await Notification.requestPermission();
        authorizationStatus = res === 'granted' ? 1 : 0;
      } catch (_) {}
    }
    return { authorizationStatus };
  },

  displayNotification: async (notification = {}) => {
    if (hasNotification() && Notification.permission === 'granted') {
      try {
        new Notification(notification.title ?? 'LifUp', { body: notification.body ?? '' });
      } catch (_) {}
    }
    return notification.id ?? '';
  },

  cancelNotification: async () => {},
  createTriggerNotification: async (notification = {}) => notification.id ?? '',
  cancelTriggerNotification: async () => {},
  cancelAllNotifications: async () => {},
  onBackgroundEvent: () => {},
  onForegroundEvent: () => () => {},
};

export const AndroidImportance = { NONE: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4 };
export const TriggerType = { TIMESTAMP: 0, INTERVAL: 1 };

export default notifee;
