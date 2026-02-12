import React from "react";
import { render } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import Loading from "../components/Loading";
import i18n from "../i18n";

jest.mock("expo-linear-gradient", () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockLinearGradient.displayName = "MockLinearGradient";
  return { LinearGradient: MockLinearGradient };
});

describe("Loading component", () => {
  test("renders message and progress role", () => {
    const { getByText, getByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <Loading message="Fetching data..." />
      </I18nextProvider>,
    );

    expect(getByText("Fetching data...")).toBeTruthy();
    expect(getByTestId("loading").props.accessibilityRole).toBe("progressbar");
  });
});
