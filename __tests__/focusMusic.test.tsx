import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert } from "react-native";
import FocusMusicScreen from "../components/feature/FocusMusicScreen";
import i18n from "../i18n";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";

jest.mock("@expo/vector-icons", () => {
  const MockIcon = () => null;
  MockIcon.displayName = "MockMaterialCommunityIcons";
  return { MaterialCommunityIcons: MockIcon };
});

jest.mock("expo-linear-gradient", () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockLinearGradient.displayName = "MockLinearGradient";
  return { LinearGradient: MockLinearGradient };
});

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <FocusMusicProvider>
        <FocusMusicScreen />
      </FocusMusicProvider>
    </I18nextProvider>,
  );

describe("FocusMusicScreen", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  test("opens catalog and installs tracks up to the limit", () => {
    const { getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    expect(getByTestId("focus-music-catalog-modal")).toBeTruthy();

    expect(queryByTestId("focus-music-installed-example3")).toBeNull();
    fireEvent.press(getByTestId("focus-music-install-example3"));
    expect(getByTestId("focus-music-installed-example3")).toBeTruthy();

    fireEvent.press(getByTestId("focus-music-install-example4"));
    fireEvent.press(getByTestId("focus-music-install-example5"));
  });

  test("asks for confirmation before removing a track", () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("focus-music-remove-example1"));

    expect(Alert.alert).toHaveBeenCalled();
  });

  test("shows install limit alert when trying to add a 6th track", () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("focus-music-catalog-button"));
    fireEvent.press(getByTestId("focus-music-install-example3"));
    fireEvent.press(getByTestId("focus-music-install-example4"));
    fireEvent.press(getByTestId("focus-music-install-example5"));
    fireEvent.press(getByTestId("focus-music-install-example6"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Install limit reached",
      "You can install up to 5 tracks. Remove a track from your list to install another one.",
    );
  });
});
