/**
 * Web shim for react-native-geolocation-service, backed by navigator.geolocation.
 */

const UNAVAILABLE = { code: 2, message: 'Geolocation is not available in this browser.' };

const mapOptions = (o = {}) => ({
  enableHighAccuracy: true,
  maximumAge: o.maximumAge ?? 0,
  timeout: o.timeout ?? 30000,
});

export default {
  getCurrentPosition(success, error, options) {
    if (!navigator.geolocation) { error && error(UNAVAILABLE); return; }
    navigator.geolocation.getCurrentPosition(success, error, mapOptions(options));
  },

  watchPosition(success, error, options) {
    if (!navigator.geolocation) { error && error(UNAVAILABLE); return -1; }
    return navigator.geolocation.watchPosition(success, error, mapOptions(options));
  },

  clearWatch(watchId) {
    if (watchId != null && watchId !== -1 && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  stopObserving() {},
};
