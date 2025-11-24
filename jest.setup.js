// Shared Jest setup for Expo/React Native tests.
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Mock Expo Router to simplify navigation-related tests.
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Link: ({ children }) => React.Children.only(children),
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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
