import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import OfflineRequiredScreen from "../components/OfflineRequiredScreen";

const mockRefresh = jest.fn(() => Promise.resolve());

jest.mock("../providers/OfflineProvider", () => ({
  useOffline: () => ({
    offlineBlocked: true,
    isConnected: false,
    isInternetReachable: false,
    refresh: mockRefresh,
  }),
}));

describe("OfflineRequiredScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls refresh when retry button is pressed", () => {
    const { getByRole } = render(
      <I18nextProvider i18n={i18n}>
        <OfflineRequiredScreen />
      </I18nextProvider>,
    );

    fireEvent.press(getByRole("button", { name: "Retry" }));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
