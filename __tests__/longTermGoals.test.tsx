import React from "react";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Keyboard } from "react-native";
import LongTermGoalsScreen from "../components/feature/LongTermGoalsScreen";
import i18n from "../i18n";
import {
  fetchCurrentPoint,
  fetchLongTermGoals,
  insertLongTermGoal,
  updateCurrentPoint,
  updateLongTermGoal,
  upsertLongTermGoals,
} from "../lib/api/supabase/longTermGoals";
import { getUserId } from "../lib/api/supabase/common";

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

jest.mock("react-native-draggable-flatlist", () => {
  const React = require("react");
  const MockFlatList = ({
    data,
    renderItem,
    onDragEnd,
    ListHeaderComponent,
    ListEmptyComponent,
  }: {
    data: unknown[];
    renderItem: (params: { item: unknown; index: number; drag: () => void; isActive: boolean; getIndex: () => number }) => React.ReactNode;
    onDragEnd: (params: { data: unknown[] }) => void;
    ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
    ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
  }) => {
    const firedRef = React.useRef(false);
    const renderSlot = (slot?: React.ReactNode | (() => React.ReactNode)) => {
      if (!slot) return null;
      return typeof slot === "function" ? slot() : slot;
    };

    React.useEffect(() => {
      if (!firedRef.current && data.length > 0) {
        firedRef.current = true;
        onDragEnd({ data: [...data].reverse() });
      }
    }, [data, onDragEnd]);

    return (
      <>
        {renderSlot(ListHeaderComponent)}
        {data.length === 0 && renderSlot(ListEmptyComponent)}
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

jest.mock("../lib/api/supabase/common", () => ({
  getUserId: jest.fn(),
}));

jest.mock("../lib/api/supabase/longTermGoals", () => ({
  fetchLongTermGoals: jest.fn(),
  fetchCurrentPoint: jest.fn(),
  insertLongTermGoal: jest.fn(),
  updateLongTermGoal: jest.fn(),
  deleteLongTermGoal: jest.fn(),
  upsertLongTermGoals: jest.fn(),
  updateCurrentPoint: jest.fn(),
}));

describe("LongTermGoalsScreen", () => {
  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <LongTermGoalsScreen />
      </I18nextProvider>,
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("en");
    (getUserId as jest.Mock).mockResolvedValue("user-123");
    (fetchCurrentPoint as jest.Mock).mockResolvedValue({
      data: { current_point: "Age 29" },
      error: null,
    });
    (fetchLongTermGoals as jest.Mock).mockResolvedValue({
      data: [
        {
          id: "goal-1",
          until_when: "By 32",
          description: "Reach IELTS 8",
          is_done: false,
          order: 0,
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "goal-2",
          until_when: "By 33",
          description: "Get permanent residency",
          is_done: false,
          order: 1,
          updated_at: "2025-01-02T00:00:00Z",
        },
      ],
      error: null,
    });
    (upsertLongTermGoals as jest.Mock).mockResolvedValue({ error: null });
    (updateCurrentPoint as jest.Mock).mockResolvedValue({ error: null });
    (insertLongTermGoal as jest.Mock).mockResolvedValue({
      data: {
        id: "goal-3",
        until_when: "By 35",
        description: "Build stable remote income",
        is_done: false,
        order: 0,
        updated_at: "2025-01-03T00:00:00Z",
      },
      error: null,
    });
    (updateLongTermGoal as jest.Mock).mockResolvedValue({
      data: {
        id: "goal-1",
        until_when: "By 32",
        description: "Reach IELTS 8",
        is_done: true,
        order: 0,
        updated_at: "2025-01-04T00:00:00Z",
      },
      error: null,
    });
  });

  test("renders current point and persists reordered goals with user id", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("Long-Term Goals")).toBeTruthy();
    expect(await findByText("Current point: Age 29")).toBeTruthy();
    expect(await findByText("Get permanent residency")).toBeTruthy();

    await waitFor(() => expect(upsertLongTermGoals).toHaveBeenCalled());
    expect(upsertLongTermGoals).toHaveBeenCalledWith([
      {
        id: "goal-2",
        user_id: "user-123",
        until_when: "By 33",
        description: "Get permanent residency",
        is_done: false,
        order: 0,
      },
      {
        id: "goal-1",
        user_id: "user-123",
        until_when: "By 32",
        description: "Reach IELTS 8",
        is_done: false,
        order: 1,
      },
    ]);
  });

  test("adds a new long-term goal and updates current point", async () => {
    const { getByRole, getByPlaceholderText } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(getByPlaceholderText("e.g. Age 25 / 2026"), "Age 30");
    fireEvent.changeText(getByPlaceholderText("e.g. By age 29 / By 2030"), "By 35");
    fireEvent.changeText(
      getByPlaceholderText("e.g. Get a master’s degree abroad"),
      "Build stable remote income",
    );
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateCurrentPoint).toHaveBeenCalledWith("user-123", "Age 30"));
    await waitFor(() => expect(insertLongTermGoal).toHaveBeenCalledWith({
      user_id: "user-123",
      until_when: "By 35",
      description: "Build stable remote income",
      is_done: false,
      order: 0,
    }));
  });

  test("shows completion and edit controls together in the card footer", async () => {
    const { findByTestId } = renderScreen();

    const actions = await findByTestId("long-term-goal-card-actions-goal-1");
    expect(within(actions).getByTestId("long-term-goal-complete-goal-1")).toBeTruthy();
    expect(within(actions).getByTestId("long-term-goal-edit-goal-1")).toBeTruthy();
  });

  test("shows until-when text in footer for incomplete goals and completed badge in the same area for completed goals", async () => {
    (fetchLongTermGoals as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: "goal-1",
          until_when: "By 32",
          description: "Reach IELTS 8",
          is_done: false,
          order: 0,
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "goal-2",
          until_when: "By 33",
          description: "Get permanent residency",
          is_done: true,
          order: 1,
          updated_at: "2025-01-02T00:00:00Z",
        },
      ],
      error: null,
    });

    const { findByTestId } = renderScreen();

    const incompleteFooter = await findByTestId("long-term-goal-card-footer-goal-1");
    expect(within(incompleteFooter).getByTestId("long-term-goal-card-until-when-goal-1")).toBeTruthy();
    expect(within(incompleteFooter).queryByTestId("long-term-goal-card-completed-badge-goal-1")).toBeNull();

    const completedFooter = await findByTestId("long-term-goal-card-footer-goal-2");
    expect(within(completedFooter).getByTestId("long-term-goal-card-completed-badge-goal-2")).toBeTruthy();
    expect(within(completedFooter).queryByTestId("long-term-goal-card-until-when-goal-2")).toBeNull();
  });

  test("toggles completed state", async () => {
    const { findByTestId } = renderScreen();

    const button = await findByTestId("long-term-goal-complete-goal-1");
    fireEvent.press(button);

    await waitFor(() => expect(updateLongTermGoal).toHaveBeenCalledWith("goal-1", { is_done: true }));
  });

  test("dismisses keyboard when tapping modal overlay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByTestId("long-term-goals-modal-overlay"));

    expect(dismissSpy).toHaveBeenCalled();
  });

  test("renders keyboard avoiding view and scroll area in modal", async () => {
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(getByTestId("long-term-goals-modal-kav")).toBeTruthy();
    expect(getByTestId("long-term-goals-modal-scroll")).toBeTruthy();
  });

  test("hides keyboard icon when keyboard is not visible", async () => {
    const { getByRole, queryByTestId } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(queryByTestId("long-term-goals-modal-keyboard-button")).toBeNull();
  });
});
