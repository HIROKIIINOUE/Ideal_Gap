/**
 * Jest configuration for Expo/React Native.
 * Uses the jest-expo preset and registers testing-library matchers.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@expo|expo(nent)?|@expo-google-fonts/.*|expo-asset|expo-constants|expo-file-system|expo-font|expo-image|expo-linking|expo-router|expo-splash-screen|expo-web-browser|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-web|react-native-worklets|@testing-library/react-native)'
  ]
};
