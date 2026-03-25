
jest.mock('./src/native/SharedStorage', () => ({
  setWidgetData: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@notifee/react-native', () => ({
  displayNotification: jest.fn(),
  cancelNotification: jest.fn(),
  requestPermission: jest.fn(),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));
