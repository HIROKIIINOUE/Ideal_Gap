import {
  getKeyboardAvoidingBehavior,
  shouldUseAndroidJapaneseTypography,
} from "../lib/ui/platform";

describe("platform UI helpers", () => {
  test("uses padding keyboard avoidance on iOS", () => {
    expect(getKeyboardAvoidingBehavior("ios")).toBe("padding");
  });

  test("uses height keyboard avoidance on Android", () => {
    expect(getKeyboardAvoidingBehavior("android")).toBe("height");
  });

  test("uses Android Japanese typography only for Japanese on Android", () => {
    expect(shouldUseAndroidJapaneseTypography("ja", "android")).toBe(true);
    expect(shouldUseAndroidJapaneseTypography("en", "android")).toBe(false);
    expect(shouldUseAndroidJapaneseTypography("ja", "ios")).toBe(false);
  });
});
