import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import AnnualGoalsScreen from "../components/feature/AnnualGoalsScreen";
import i18n from "../i18n";

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

jest.mock("react-native-gifted-charts", () => {
  const MockPieChart = ({ centerLabelComponent }: { centerLabelComponent?: () => React.ReactNode }) => (
    <>{centerLabelComponent ? centerLabelComponent() : null}</>
  );
  MockPieChart.displayName = "MockPieChart";
  return { PieChart: MockPieChart };
});

jest.mock("react-native-draggable-flatlist", () => {
  const React = require("react");
  const MockFlatList = ({
    data,
    renderItem,
    onDragEnd,
  }: {
    data: unknown[];
    renderItem: (params: { item: unknown; index: number; drag: () => void; isActive: boolean; getIndex: () => number }) => React.ReactNode;
    onDragEnd: (params: { data: unknown[] }) => void;
  }) => {
    const firedRef = React.useRef(false);
    React.useEffect(() => {
      if (!firedRef.current && data.length > 0) {
        firedRef.current = true;
        onDragEnd({ data });
      }
    }, [data, onDragEnd]);

    return (
      <>
        {data.map((item, index) =>
          renderItem({
            item,
            index,
            drag: () => {},
            isActive: false,
            getIndex: () => index,
          }),
        )}
      </>
    );
  };
  MockFlatList.displayName = "MockDraggableFlatList";
  return MockFlatList;
});

describe("AnnualGoalsScreen", () => {
  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <AnnualGoalsScreen />
      </I18nextProvider>,
    );

  test("renders seeded goals and chart summary", () => {
    const { getByText } = renderScreen();

    expect(getByText("Total focus time")).toBeTruthy();
    expect(getByText("Career leap with shipped projects and portfolio refresh")).toBeTruthy();
  });

  test("allows adding a new annual goal", () => {
    const { getByRole, getByPlaceholderText, getByText } = renderScreen();

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(
      getByPlaceholderText("e.g. Build a stable sleep routine and prioritize recovery"),
      "Launch a side product",
    );
    fireEvent.changeText(getByPlaceholderText("e.g. Health / Career"), "Product");
    fireEvent.press(getByRole("button", { name: "Save" }));

    expect(getByText("Launch a side product")).toBeTruthy();
  });
});
