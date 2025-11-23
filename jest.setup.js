// Shared Jest setup for Expo/React Native tests.
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/react-native/extend-expect';

// Mock Expo Router to simplify navigation-related tests.
jest.mock('expo-router', () => require('expo-router/testing-library'));

// Mock Reanimated to run on the JS thread during tests.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence useNativeDriver warnings.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
