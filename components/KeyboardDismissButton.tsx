import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadows, spacing } from "../constants/theme";

type KeyboardDismissButtonProps = {
  keyboardHeight: number;
  onPress: () => void;
  testID?: string;
};

export default function KeyboardDismissButton({ keyboardHeight, onPress, testID }: KeyboardDismissButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Dismiss keyboard"
      onPress={onPress}
      style={[
        styles.button,
        {
          bottom: Math.max(keyboardHeight + spacing.sm, insets.bottom + spacing.xl),
        },
      ]}
      testID={testID}
    >
      <MaterialCommunityIcons name="keyboard-close-outline" size={20} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "rgba(15,28,47,0.96)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
    zIndex: 10,
  },
});
