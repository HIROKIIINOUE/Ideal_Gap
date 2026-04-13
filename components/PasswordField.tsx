import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../constants/theme";

type PasswordFieldProps = ComponentProps<typeof TextInput> & {
  showPasswordLabel: string;
  hidePasswordLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function PasswordField({
  showPasswordLabel,
  hidePasswordLabel,
  containerStyle,
  style,
  ...textInputProps
}: PasswordFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...textInputProps}
        secureTextEntry={!passwordVisible}
        style={[style, styles.input]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={passwordVisible ? hidePasswordLabel : showPasswordLabel}
        onPress={() => setPasswordVisible((current) => !current)}
        style={styles.toggle}
      >
        <MaterialCommunityIcons
          name={passwordVisible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    paddingRight: spacing.xl * 2,
  },
  toggle: {
    position: "absolute",
    right: spacing.md,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.full,
  },
});

