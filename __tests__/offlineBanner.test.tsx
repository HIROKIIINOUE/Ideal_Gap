import React from "react";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import OfflineBanner from "../components/OfflineBanner";
import { spacing } from "../constants/theme";

const mockUseOffline = jest.fn();
const mockUseSafeAreaInsets = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "offline.banner") return "You are offline";
      return key;
    },
  }),
}));

jest.mock("../providers/OfflineProvider", () => ({
  useOffline: () => mockUseOffline(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  test("does not render while online", () => {
    mockUseOffline.mockReturnValue({ offlineBlocked: false });

    const { queryByTestId } = render(<OfflineBanner />);

    expect(queryByTestId("offline-banner")).toBeNull();
  });

  test("adds safe area top inset so the label stays below the Dynamic Island", () => {
    mockUseOffline.mockReturnValue({ offlineBlocked: true });
    mockUseSafeAreaInsets.mockReturnValue({ top: 59, right: 0, bottom: 0, left: 0 });

    const { getByTestId } = render(<OfflineBanner />);

    const containerStyle = StyleSheet.flatten(getByTestId("offline-banner").props.style);
    expect(containerStyle.paddingTop).toBe(59 + spacing.xs);
    expect(containerStyle.minHeight).toBeGreaterThanOrEqual(44);
  });
});
