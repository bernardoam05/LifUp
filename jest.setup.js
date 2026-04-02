
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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useBackButton: () => {},
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

jest.mock('react-native-sound', () => {
  const Sound = function () {
    return {
      play: jest.fn(),
      stop: jest.fn(),
      release: jest.fn(),
      setVolume: jest.fn(),
      setNumberOfLoops: jest.fn(),
      getCurrentTime: jest.fn((cb) => cb(0)),
      getDuration: jest.fn(() => 0),
    };
  };
  Sound.setCategory = jest.fn();
  Sound.setMode = jest.fn();
  Sound.MAIN_BUNDLE = 0;
  return Sound;
});
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaConsumer: ({ children }) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  currentState: 'active',
}));

jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
}));

// Mock Animated to avoid "torn down" issues with timers
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const Animated = jest.requireActual('react-native/Libraries/Animated/Animated');
  Animated.timing = (value, config) => ({
    start: (callback) => {
      value.setValue(config.toValue);
      callback && callback({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  });
  return Animated;
});
