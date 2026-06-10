import React from "react";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Alert, Keyboard } from "react-native";
import LongTermGoalsScreen from "../components/feature/LongTermGoalsScreen";
import { colors, radius, spacing, typography } from "../constants/theme";
import i18n from "../i18n";
import {
  deleteLongTermGoal,
  fetchLongTermGoals,
  insertLongTermGoal,
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
  const { createMockDraggableFlatList } = require("./helpers/mockDraggableFlatList");
  return createMockDraggableFlatList({
    testID: "long-term-goals-list-content",
    autoDragOnMount: true,
  });
});

jest.mock("../lib/api/supabase/common", () => ({
  getUserId: jest.fn(),
}));

jest.mock("../lib/api/supabase/longTermGoals", () => ({
  fetchLongTermGoals: jest.fn(),
  insertLongTermGoal: jest.fn(),
  updateLongTermGoal: jest.fn(),
  deleteLongTermGoal: jest.fn(),
  upsertLongTermGoals: jest.fn(),
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
    (deleteLongTermGoal as jest.Mock).mockResolvedValue({ error: null });
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

  test("renders long-term goals and persists reordered goals with user id", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("Long-Term Goals")).toBeTruthy();
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

  test("matches the empty state typography used by the ideal and annual goal cards", async () => {
    (fetchLongTermGoals as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { findByText } = renderScreen();

    expect(await findByText("No long-term goals yet")).toHaveStyle({
      fontSize: typography.lg,
    });
    expect(
      await findByText("Set long-term goals for the next few years and visualize your path to your ideal self."),
    ).toHaveStyle({
      fontSize: typography.md,
      lineHeight: typography.md * 1.5,
    });
    expect(await findByText("Add your first long-term goal")).toHaveStyle({
      fontSize: typography.md,
    });
  });

  test("adds a new long-term goal", async () => {
    const { getByRole, getByPlaceholderText } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(getByPlaceholderText("e.g. By age 29 / By 2030"), "By 35");
    fireEvent.changeText(
      getByPlaceholderText("e.g. Get a master’s degree abroad"),
      "Build stable remote income",
    );
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(insertLongTermGoal).toHaveBeenCalledWith({
      user_id: "user-123",
      until_when: "By 35",
      description: "Build stable remote income",
      is_done: false,
      order: 0,
    }));
  });

  test("matches the ideal self header title and button sizing", async () => {
    const { findByText, findByRole } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());

    expect(await findByText("Long-Term Goals")).toHaveStyle({
      fontSize: typography.xl,
      lineHeight: typography.xl * 1.3,
    });
    expect(await findByRole("button", { name: "Add" })).toHaveStyle({
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    });
    expect(await findByRole("button", { name: "Delete" })).toHaveStyle({
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    });
  });

  test("shows completion and edit controls together in the card footer", async () => {
    const { findByTestId } = renderScreen();

    const actions = await findByTestId("long-term-goal-card-actions-goal-1");
    expect(within(actions).getByTestId("long-term-goal-complete-goal-1")).toBeTruthy();
    expect(within(actions).getByTestId("long-term-goal-edit-goal-1")).toBeTruthy();
  });

  test("matches the compact annual goal card sizing", async () => {
    const { findByTestId, findByText } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());

    expect(await findByTestId("long-term-goal-card-goal-1")).toHaveStyle({
      padding: 12,
      gap: 8,
    });
    expect(await findByTestId("long-term-goal-complete-goal-1")).toHaveStyle({
      width: 34,
      height: 34,
    });
    expect(await findByText("Reach IELTS 8")).toHaveStyle({
      fontSize: typography.md,
      lineHeight: typography.md * 1.3,
    });
  });

  test("uses a tighter gap between long-term goal cards", async () => {
    const { findByTestId } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());

    expect(await findByTestId("long-term-goals-list-content")).toHaveStyle({
      gap: spacing.sm,
    });
  });

  test("uses an icon-only delete button in delete mode while keeping accessibility text", async () => {
    const { getByRole, findByTestId } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Delete" }));

    const actions = await findByTestId("long-term-goal-card-actions-goal-1");
    expect(within(actions).queryByText("Delete")).toBeNull();
    expect(within(actions).getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  test("does not show a success alert after deleting a goal", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByRole, findByTestId } = renderScreen();

    await waitFor(() => expect(fetchLongTermGoals).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Delete" }));

    const actions = await findByTestId("long-term-goal-card-actions-goal-1");
    fireEvent.press(within(actions).getByRole("button", { name: "Delete" }));

    const confirmCall = alertSpy.mock.calls[0];
    const confirmButtons = confirmCall?.[2] as Array<{ text?: string; onPress?: () => void | Promise<void> }>;
    const confirmDeleteButton = confirmButtons.find((button) => button.text === "Delete");

    await confirmDeleteButton?.onPress?.();

    expect(deleteLongTermGoal).toHaveBeenCalledWith("goal-1");
    expect(alertSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
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
    expect(within(incompleteFooter).getByTestId("long-term-goal-card-until-when-goal-1")).toHaveStyle({
      borderBottomColor: colors.accentSubtle,
      borderBottomWidth: 2,
    });
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
