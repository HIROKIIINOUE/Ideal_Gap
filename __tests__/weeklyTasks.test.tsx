import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { Alert, Keyboard, Platform } from "react-native";
import WeeklyTasksScreen from "../components/feature/WeeklyTasksScreen";
import { spacing, typography } from "../constants/theme";
import i18n from "../i18n";
import { decryptFieldValue, isEncryptedFieldValue } from "../lib/security/fieldEncryption";
import { supabase } from "../lib/supabaseClient";
import { deleteWeeklyTasks } from "../lib/api/supabase/goals/allItemDelete";

jest.useFakeTimers().setSystemTime(new Date("2025-02-10T00:00:00Z"));

jest.mock("@expo/vector-icons", () => {
  const MockIcon = () => null;
  MockIcon.displayName = "MockMaterialCommunityIcons";
  return { MaterialCommunityIcons: MockIcon };
});

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: () => {},
}));

jest.mock("expo-linear-gradient", () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockLinearGradient.displayName = "MockLinearGradient";
  return { LinearGradient: MockLinearGradient };
});


jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../lib/api/supabase/goals/allItemDelete", () => ({
  deleteWeeklyTasks: jest.fn(),
}));

const renderScreen = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <WeeklyTasksScreen />
    </I18nextProvider>,
  );

describe("WeeklyTasksScreen", () => {
  const originalPlatform = Platform.OS;
  const mockSelectWeekly = jest.fn();
  const mockEqWeekly = jest.fn();
  const mockOrderWeekly = jest.fn();
  const mockInsertWeekly = jest.fn();
  const mockSelectInsertedWeekly = jest.fn();
  const mockSingleInsertedWeekly = jest.fn();
  const mockUpdateWeekly = jest.fn();
  const mockEqUpdateWeekly = jest.fn();
  const mockSelectYearly = jest.fn();
  const mockEqYearly = jest.fn();
  const mockOrderYearly = jest.fn();
  const mockDeleteWeekly = jest.fn();
  const mockEqDeleteWeekly = jest.fn();
  const mockUpsertWeekly = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await i18n.changeLanguage("en");
    jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const destructive = buttons?.find((button) => button.style === "destructive");
      destructive?.onPress?.();
    });

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });

    mockSelectWeekly.mockReturnValue({ eq: mockEqWeekly });
    mockEqWeekly.mockReturnValue({ order: mockOrderWeekly });
    mockInsertWeekly.mockReturnValue({ select: mockSelectInsertedWeekly });
    mockSelectInsertedWeekly.mockReturnValue({ single: mockSingleInsertedWeekly });
    mockUpdateWeekly.mockReturnValue({ eq: mockEqUpdateWeekly });
    mockEqUpdateWeekly.mockResolvedValue({ error: null });
    mockDeleteWeekly.mockReturnValue({ eq: mockEqDeleteWeekly });
    mockEqDeleteWeekly.mockResolvedValue({ error: null });
    mockUpsertWeekly.mockResolvedValue({ error: null });

    mockSelectYearly.mockReturnValue({ eq: mockEqYearly });
    mockEqYearly.mockReturnValue({ order: mockOrderYearly });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return {
          select: mockSelectWeekly,
          insert: mockInsertWeekly,
          update: mockUpdateWeekly,
          delete: mockDeleteWeekly,
          upsert: mockUpsertWeekly,
        };
      }
      if (table === "yearly_goals") {
        return { select: mockSelectYearly };
      }
      return {};
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
  });

  test("shows empty state when no weekly tasks", async () => {
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });

    const { findByRole, findByText } = renderScreen();

    expect(await findByText("Weekly Tasks")).toBeTruthy();
    expect(await findByText("No tasks yet")).toBeTruthy();
    expect(await findByRole("button", { name: "Add your first task" })).toBeTruthy();
  });

  test("shows a load error instead of the form validation message when the user session is missing", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    const { findByText, queryByText } = renderScreen();

    expect(await findByText("Unable to load weekly tasks.")).toBeTruthy();
    expect(queryByText("Please fill all fields")).toBeNull();
  });

  test("uses smaller header typography for French title and buttons", async () => {
    await i18n.changeLanguage("fr");
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Croissance de carrière", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });

    const { findByText, findByRole } = renderScreen();

    const title = await findByText("Tâches hebdomadaires");
    const addButtonLabel = await findByText("Ajouter");
    const deleteButton = await findByRole("button", { name: "Supprimer" });
    const deleteButtonLabel = within(deleteButton).getByText("Supprimer");

    expect(title).toHaveStyle({ fontSize: 24 });
    expect(addButtonLabel).toHaveStyle({ fontSize: 14 });
    expect(deleteButtonLabel).toHaveStyle({ fontSize: 14 });
  });

  test("uses smaller header typography for Japanese title on Android", async () => {
    await i18n.changeLanguage("ja");
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });
    mockOrderYearly.mockResolvedValue({
      data: [{ id: "y1", description: "キャリア成長", year_goal_color: "#1E5EFF" }],
      error: null,
    });

    const { findByText } = renderScreen();
    const title = await findByText("週間タスク");

    expect(title).toHaveStyle({ fontSize: 24 });
  });

  test("renders weekly tasks with a simplified two-row card", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
        {
          id: "w2",
          description: "Write docs",
          yearly_goal_id: "y1",
          accumulated_time_week: 60,
          order: 1,
        },
      ],
      error: null,
    });

    const { getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    expect(getByTestId("weekly-task-total-w1")).toHaveTextContent("3h");
    expect(getByTestId("weekly-task-total-w2")).toHaveTextContent("1h");

    expect(queryByText("Weekly progress")).toBeFalsy();
    expect(getByTestId("weekly-task-timer-w1")).toBeTruthy();
    expect(getByTestId("weekly-task-edit-w1")).toBeTruthy();
    expect(getByTestId("weekly-task-reorder-w1")).toBeTruthy();
  });

  test("uses tighter inner spacing for compact weekly task cards", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    expect(await findByTestId("weekly-task-card-w1")).toHaveStyle({
      padding: 9,
      gap: 4,
      marginBottom: spacing.sm,
    });
    expect(await findByTestId("weekly-task-title-w1")).toHaveStyle({
      marginHorizontal: spacing.xs / 2,
      fontSize: typography.md,
      lineHeight: typography.md * 1.15,
    });
    expect(await findByTestId("weekly-task-edit-w1")).toHaveStyle({
      width: 32,
      height: 32,
    });
    expect(await findByTestId("weekly-task-total-w1")).toHaveStyle({
      marginHorizontal: spacing.xs / 2,
    });
  });

  test("places time and action controls above the task title", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    const card = await findByTestId("weekly-task-card-w1");
    const controls = await findByTestId("weekly-task-controls-w1");
    const title = await findByTestId("weekly-task-title-w1");

    expect(card.props.children[2]).toBe(controls);
    expect(card.props.children[3]).toBeTruthy();
    expect(card.props.children[3].props.children).toBe(title);
  });

  test("toggles completed state styling on and off", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          is_done: false,
          order: 0,
        },
      ],
      error: null,
    });

    const { findByTestId, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    const card = await findByTestId("weekly-task-card-w1");
    const title = await findByTestId("weekly-task-title-w1");
    const completeButton = await findByTestId("weekly-task-complete-w1");

    expect(queryByTestId("weekly-task-completed-badge-w1")).toBeNull();

    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(mockUpdateWeekly).toHaveBeenCalledWith({ is_done: true });
    });
    await waitFor(() => {
      expect(mockEqUpdateWeekly).toHaveBeenCalledWith("id", "w1");
    });

    expect(await findByTestId("weekly-task-completed-badge-w1")).toBeTruthy();
    expect(card).toHaveStyle({ borderColor: "rgba(56,217,150,0.55)" });
    expect(queryByTestId("weekly-task-timer-w1")).toBeNull();
    expect(queryByTestId("weekly-task-edit-w1")).toBeNull();
    expect(title).toHaveStyle({ color: "rgba(233,237,247,0.78)" });

    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(mockUpdateWeekly).toHaveBeenCalledWith({ is_done: false });
    });

    await waitFor(() => {
      expect(queryByTestId("weekly-task-completed-badge-w1")).toBeNull();
    });
    expect(await findByTestId("weekly-task-timer-w1")).toBeTruthy();
    expect(await findByTestId("weekly-task-edit-w1")).toBeTruthy();
  });

  test("renders long weekly task titles without truncation props", async () => {
    const longTitle =
      "Ship the weekly task card update with enough detail to wrap across multiple lines instead of being truncated";

    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: longTitle,
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getByText } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    const title = getByText(longTitle);

    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.ellipsizeMode).toBeUndefined();
  });

  test("uses the same accent border styling for the task timer button as the header add button", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    expect(getByTestId("weekly-task-timer-w1")).toHaveStyle({
      borderColor: "#1E5EFF",
      backgroundColor: "rgba(30,94,255,0.2)",
    });
  });

  test("shows only logged total time on the simplified card", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 65,
          order: 0,
        },
      ],
      error: null,
    });

    const { findByTestId, queryByText } = renderScreen();

    expect(await findByTestId("weekly-task-total-w1")).toHaveTextContent("1h 5m");
    expect(queryByText("1.6 h")).toBeFalsy();
    expect(queryByText("0.5 h")).toBeFalsy();
  });

  test("does not render the removed list view button", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { queryByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    expect(queryByRole("button", { name: "List view" })).toBeNull();
    expect(getByTestId("weekly-task-timer-w1")).toBeTruthy();
    expect(getByTestId("weekly-task-reorder-w1")).toBeTruthy();
  });

  test("shows only delete button in delete mode", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        { id: "y1", description: "Career growth", year_goal_color: "#1E5EFF" },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getByRole, getByTestId, queryByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Delete" }));

    expect(getByTestId("weekly-task-delete-w1")).toBeTruthy();
    expect(queryByText("Delete")).toBeNull();
    expect(queryByTestId("weekly-task-timer-w1")).toBeNull();
    expect(queryByTestId("weekly-task-edit-w1")).toBeNull();
    expect(queryByTestId("weekly-task-reorder-w1")).toBeNull();
  });

  test("shows yearly goals in the add modal", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Focus this year",
          year_goal_color: "#1E5EFF",
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });

    const { findByText, getByText, getByPlaceholderText, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));

    const titlePlaceholder = i18n.t("modal.titlePlaceholder", { ns: "weeklyTasks" }) as string;

    await waitFor(() => expect(getByText("Link annual goal")).toBeTruthy());
    expect(getByPlaceholderText(titlePlaceholder)).toBeTruthy();

    expect(getByText("Focus this year")).toBeTruthy();
    expect(queryByText("Month to show monthly goals")).toBeFalsy();
  });

  test("allows saving a weekly task without any yearly goals", async () => {
    mockOrderYearly.mockResolvedValue({ data: [], error: null });
    mockOrderWeekly
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: "w-new",
            description: "Read 20 pages",
            yearly_goal_id: null,
            accumulated_time_week: 0,
            order: 0,
          },
        ],
        error: null,
      });
    mockSingleInsertedWeekly.mockResolvedValue({
      data: {
        id: "w-new",
        description: "Read 20 pages",
        yearly_goal_id: null,
        accumulated_time_week: 0,
        order: 0,
      },
      error: null,
    });

    const { findByText, findByPlaceholderText } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));
    fireEvent.changeText(
      await findByPlaceholderText("e.g. Finish 7 pages in section4 on the textbook"),
      "Read 20 pages",
    );
    fireEvent.press(await findByText("Save"));

    await waitFor(() => expect(mockInsertWeekly).toHaveBeenCalled());
    const [payload] = mockInsertWeekly.mock.calls[0];
    const { description, ...row } = payload;
    expect(row).toEqual({
        yearly_goal_id: null,
        accumulated_time_week: 0,
        is_done: false,
        user_id: "user-123",
        order: 0,
    });
    expect(isEncryptedFieldValue(description)).toBe(true);
    expect(decryptFieldValue(description)).toBe("Read 20 pages");
  });

  test("disables the modal save button during a pending save to prevent duplicate submissions", async () => {
    mockOrderYearly.mockResolvedValue({ data: [], error: null });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });

    type InsertResult = {
      data: {
        id: string;
        description: string;
        yearly_goal_id: string | null;
        accumulated_time_week: number;
        is_done: boolean;
        order: number;
      };
      error: null;
    };
    let resolveInsert: undefined | ((value: InsertResult) => void);
    const pendingInsert = new Promise<InsertResult>((resolve) => {
      resolveInsert = resolve;
    });
    mockSingleInsertedWeekly.mockReturnValue(pendingInsert);

    const { findByText, findByPlaceholderText, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));
    fireEvent.changeText(
      await findByPlaceholderText("e.g. Finish 7 pages in section4 on the textbook"),
      "Read 20 pages",
    );

    const saveButton = getByTestId("weekly-tasks-modal-save");
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByTestId("weekly-tasks-modal-save").props.accessibilityState?.disabled).toBe(true);
    });

    expect(mockInsertWeekly).toHaveBeenCalledTimes(1);

    resolveInsert?.({
      data: {
        id: "w-new",
        description: "Read 20 pages",
        yearly_goal_id: null,
        accumulated_time_week: 0,
        is_done: false,
        order: 0,
      },
      error: null,
    });

    await waitFor(() => expect(mockUpsertWeekly).toHaveBeenCalled());
  });

  test("allows saving a weekly task with no yearly goal selected even when yearly goals exist", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Focus this year",
          year_goal_color: "#1E5EFF",
        },
      ],
      error: null,
    });
    mockOrderWeekly
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: "w-free",
            description: "Review flashcards",
            yearly_goal_id: null,
            accumulated_time_week: 0,
            order: 0,
          },
        ],
        error: null,
      });
    mockSingleInsertedWeekly.mockResolvedValue({
      data: {
        id: "w-free",
        description: "Review flashcards",
        yearly_goal_id: null,
        accumulated_time_week: 0,
        order: 0,
      },
      error: null,
    });

    const { findByText, findByPlaceholderText, findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));
    fireEvent.press(await findByTestId("weekly-tasks-yearly-goal-select"));
    fireEvent.press(await findByTestId("weekly-tasks-yearly-goal-option-none"));
    fireEvent.changeText(
      await findByPlaceholderText("e.g. Finish 7 pages in section4 on the textbook"),
      "Review flashcards",
    );
    fireEvent.press(await findByText("Save"));

    await waitFor(() => expect(mockInsertWeekly).toHaveBeenCalled());
    const [payload] = mockInsertWeekly.mock.calls[0];
    const { description, ...row } = payload;
    expect(row).toEqual({
        yearly_goal_id: null,
        accumulated_time_week: 0,
        is_done: false,
        user_id: "user-123",
        order: 0,
    });
    expect(isEncryptedFieldValue(description)).toBe(true);
    expect(decryptFieldValue(description)).toBe("Review flashcards");
  });

  test("remembers the last selected yearly goal for the next add modal", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Focus this year",
          year_goal_color: "#1E5EFF",
        },
        {
          id: "y2",
          description: "Build a portfolio",
          year_goal_color: "#F59E0B",
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });

    const { findByText, findByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));
    fireEvent.press(await findByTestId("weekly-tasks-yearly-goal-select"));
    fireEvent.press(await findByTestId("weekly-tasks-yearly-goal-option-y2"));

    await waitFor(() => expect(queryByText("Build a portfolio")).toBeTruthy());
    expect(
      await AsyncStorage.getItem("weekly_tasks_last_selected_yearly_goal_id"),
    ).toBe("y2");

    fireEvent.press(await findByText("Cancel"));
    fireEvent.press(await findByText("Add"));

    await waitFor(() => expect(queryByText("Build a portfolio")).toBeTruthy());
  });

  test("uses the last selected yearly goal from storage as the default in the add modal", async () => {
    await AsyncStorage.setItem("weekly_tasks_last_selected_yearly_goal_id", "y2");

    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Focus this year",
          year_goal_color: "#1E5EFF",
        },
        {
          id: "y2",
          description: "Build a portfolio",
          year_goal_color: "#F59E0B",
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });

    const { findByText, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));

    await waitFor(() => expect(queryByText("Build a portfolio")).toBeTruthy());
  });

  test("falls back to the first yearly goal when the stored last selection no longer exists", async () => {
    await AsyncStorage.setItem("weekly_tasks_last_selected_yearly_goal_id", "deleted-goal");

    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Focus this year",
          year_goal_color: "#1E5EFF",
        },
        {
          id: "y2",
          description: "Build a portfolio",
          year_goal_color: "#F59E0B",
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({ data: [], error: null });

    const { findByText, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrderYearly).toHaveBeenCalled());

    fireEvent.press(await findByText("Add"));

    await waitFor(() => expect(queryByText("Focus this year")).toBeTruthy());
    expect(queryByText("Build a portfolio")).toBeFalsy();
    expect(
      await AsyncStorage.getItem("weekly_tasks_last_selected_yearly_goal_id"),
    ).toBeNull();
  });

  test("does not show a success alert after deleting a weekly task", async () => {
    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Career growth",
          year_goal_color: "#1E5EFF",
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getAllByRole, getByRole } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());
    (Alert.alert as jest.Mock).mockClear();

    fireEvent.press(getByRole("button", { name: "Delete" }));
    fireEvent.press(getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => {
      expect(mockEqDeleteWeekly).toHaveBeenCalledWith("id", "w1");
      expect(Alert.alert).toHaveBeenCalledTimes(1);
    });
  });

  test("shows a bulk delete success alert when deleting all weekly tasks", async () => {
    (deleteWeeklyTasks as jest.Mock).mockResolvedValue(undefined);
    mockOrderYearly.mockResolvedValue({
      data: [
        {
          id: "y1",
          description: "Career growth",
          year_goal_color: "#1E5EFF",
        },
      ],
      error: null,
    });
    mockOrderWeekly.mockResolvedValue({
      data: [
        {
          id: "w1",
          description: "Ship UX fixes",
          yearly_goal_id: "y1",
          accumulated_time_week: 180,
          order: 0,
        },
      ],
      error: null,
    });

    const { getByRole, getAllByRole } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Delete" }));
    fireEvent.press(getAllByRole("button", { name: "Delete all" })[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenLastCalledWith("Deleted all", "All weekly tasks were deleted.");
    });
  });

  test("dismisses keyboard when tapping modal overlay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { findByText, findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());
    fireEvent.press(await findByText("Add"));
    fireEvent.press(await findByTestId("weekly-tasks-modal-overlay"));

    expect(dismissSpy).toHaveBeenCalled();
  });

  test("renders keyboard avoiding view and scroll area in modal", async () => {
    const { findByText, findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());
    fireEvent.press(await findByText("Add"));

    expect(await findByTestId("weekly-tasks-modal-kav")).toBeTruthy();
    expect(await findByTestId("weekly-tasks-modal-scroll")).toBeTruthy();
  });

  test("hides keyboard icon when keyboard is not visible", async () => {
    const { findByText, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrderWeekly).toHaveBeenCalled());
    fireEvent.press(await findByText("Add"));

    expect(queryByTestId("weekly-tasks-modal-keyboard-button")).toBeNull();
  });

});
