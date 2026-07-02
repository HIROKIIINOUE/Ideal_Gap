// Shared Jest setup for Expo/React Native tests.
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Mock Expo Router to simplify navigation-related tests.
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Link: ({ children }) => React.Children.only(children),
    Stack: { Screen: () => null },
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (callback) => React.useEffect(() => callback(), [callback]),
    useLocalSearchParams: () => ({}),
  };
});

// Mock Reanimated to run on the JS thread during tests.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence useNativeDriver warnings.
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');

// Mock AsyncStorage for Jest environment.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock Localization to provide deterministic device language in tests.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'ja' }],
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  flush: jest.fn().mockResolvedValue(true),
  ErrorBoundary: ({ children }) => children,
}));

// Mock Animated timing/loop to avoid async timers during tests.
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const ActualAnimated = jest.requireActual('react-native/Libraries/Animated/Animated');
  const immediate = { start: (callback) => callback?.({ finished: true }) };
  ActualAnimated.timing = () => immediate;
  ActualAnimated.spring = () => immediate;
  ActualAnimated.sequence = () => immediate;
  ActualAnimated.loop = () => immediate;
  ActualAnimated.delay = () => immediate;
  return ActualAnimated;
});

// Silence noisy act() and teardown warnings originating from mocked animations.
const originalConsoleError = console.error;
const suppressedMessages = [/not wrapped in act/, /Jest environment after it has been torn down/];
console.error = (...args) => {
  if (typeof args[0] === 'string' && suppressedMessages.some((pattern) => pattern.test(args[0]))) {
    return;
  }
  originalConsoleError(...args);
};

// Ensure pending timers flush within act to avoid teardown reference errors.
const { act } = require('react-test-renderer');
beforeAll(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
});
afterAll(() => {
  jest.useRealTimers();
});
