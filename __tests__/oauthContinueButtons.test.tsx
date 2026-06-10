import React from "react";
import { render } from "@testing-library/react-native";
import OAuthContinueButtons from "../components/OAuthContinueButtons";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockIcon = ({ name, color }: { name?: string; color?: string }) => (
    <Text>{`${name}:${color}`}</Text>
  );
  MockIcon.displayName = "MockMaterialCommunityIcons";
  return { MaterialCommunityIcons: MockIcon };
});

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockSvg = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => (
    <View testID={testID}>{children}</View>
  );
  const MockPath = () => null;
  return { __esModule: true, default: MockSvg, Path: MockPath };
});

describe("OAuthContinueButtons", () => {
  test("uses official-style colors and a multicolor Google logo", () => {
    const { getByRole, getByTestId, getByText } = render(
      <OAuthContinueButtons
        providers={["google", "apple"]}
        googleLabel="Continue with Google"
        appleLabel="Continue with Apple"
        loadingLabel="Loading"
        loadingProvider={null}
        onPress={() => {}}
      />,
    );

    expect(getByRole("button", { name: "Continue with Google" })).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#3C4043",
      borderWidth: 2,
    });
    expect(getByRole("button", { name: "Continue with Apple" })).toHaveStyle({
      backgroundColor: "#000000",
      borderColor: "rgba(255,255,255,0.42)",
      borderWidth: 1,
    });
    expect(getByTestId("oauth-google-logo")).toBeTruthy();
    expect(getByText("Continue with Google")).toHaveStyle({ color: "#1F1F1F" });
    expect(getByText("Continue with Apple")).toHaveStyle({ color: "#FFFFFF" });
  });
});
