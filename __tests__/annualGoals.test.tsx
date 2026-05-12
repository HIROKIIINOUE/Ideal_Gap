import React from "react";
import { Alert, Keyboard } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import AnnualGoalsScreen from "../components/feature/AnnualGoalsScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { deleteYearlyGoals } from "../lib/api/supabase/goals/allItemDelete";

let lastPieData: Array<{ value: number; color: string }> | null = null;

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

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("react-native-gifted-charts", () => {
  const MockPieChart = ({
    centerLabelComponent,
    data,
  }: {
    centerLabelComponent?: () => React.ReactNode;
    data?: Array<{ value: number; color: string }>;
  }) => {
    lastPieData = data ?? null;
    return <>{centerLabelComponent ? centerLabelComponent() : null}</>;
  };
  MockPieChart.displayName = "MockPieChart";
  return { PieChart: MockPieChart };
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
        {data.map((item, index) => (
          <React.Fragment key={String((item as { id?: string }).id ?? index)}>
            {renderItem({
              item,
              index,
              drag: () => {},
              isActive: false,
              getIndex: () => index,
            })}
          </React.Fragment>
        ))}
      </>
    );
  };
  MockFlatList.displayName = "MockDraggableFlatList";
  return MockFlatList;
});

jest.mock("../lib/api/supabase/goals/allItemDelete", () => ({
  deleteYearlyGoals: jest.fn(),
}));

describe("AnnualGoalsScreen", () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockUpsert = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockEqAfterDelete = jest.fn();
  const mockSelectAfterInsert = jest.fn();
  const mockSingleAfterInsert = jest.fn();
  const mockSelectAfterUpdate = jest.fn();
  const mockSingleAfterUpdate = jest.fn();

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <AnnualGoalsScreen />
      </I18nextProvider>,
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("en");
    lastPieData = null;
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      upsert: mockUpsert,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockResolvedValue({
      data: [
        {
          id: "goal-1",
          description: "Deep health routine with consistent sleep and workouts",
          year_goal_color: "#1E5EFF",
          yearly_goal_detail: "April rebuild morning routine",
          is_done: false,
          accumulated_time_year: 1820,
          order: 0,
          updated_at: "2025-01-06T09:30:00Z",
        },
        {
          id: "goal-2",
          description: "Career leap with shipped projects and portfolio refresh",
          year_goal_color: "#6EA8FF",
          yearly_goal_detail: null,
          is_done: false,
          accumulated_time_year: 2450,
          order: 1,
          updated_at: "2025-01-08T13:10:00Z",
        },
      ],
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    mockSingleAfterInsert.mockResolvedValue({
      data: {
        id: "goal-3",
        description: "Launch a side product",
        year_goal_color: "#1E5EFF",
        yearly_goal_detail: null,
        is_done: false,
        accumulated_time_year: 0,
        order: 0,
        updated_at: "2025-02-01T00:00:00Z",
      },
      error: null,
    });
    mockSelectAfterInsert.mockReturnThis();
    mockInsert.mockReturnValue({
      select: mockSelectAfterInsert,
      single: mockSingleAfterInsert,
    });

    mockUpdate.mockImplementation((payload) => ({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "goal-1",
                description: typeof payload.description === "string" ? payload.description : "Updated goal",
                year_goal_color:
                  typeof payload.year_goal_color === "string" ? payload.year_goal_color : "#1E5EFF",
                yearly_goal_detail:
                  payload.yearly_goal_detail === undefined
                    ? "April rebuild morning routine"
                    : payload.yearly_goal_detail,
                is_done: typeof payload.is_done === "boolean" ? payload.is_done : false,
                accumulated_time_year: 1820,
                order: 0,
                updated_at: "2025-02-02T00:00:00Z",
              },
              error: null,
            }),
        }),
      }),
    }));
    mockEqAfterDelete.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({
      eq: mockEqAfterDelete,
    });
  });

  test("fetches goals, renders them, and persists reordered data with user id", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("Total Focus Time")).toBeTruthy();
    expect(await findByText("Career leap with shipped projects and portfolio refresh")).toBeTruthy();

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const [updates, options] = mockUpsert.mock.calls[0];
    expect(updates).toEqual([
      {
        id: "goal-2",
        description: "Career leap with shipped projects and portfolio refresh",
        year_goal_color: "#6EA8FF",
        is_done: false,
        accumulated_time_year: 2450,
        order: 0,
        user_id: "user-123",
        yearly_goal_detail: null,
      },
      {
        id: "goal-1",
        description: "Deep health routine with consistent sleep and workouts",
        year_goal_color: "#1E5EFF",
        is_done: false,
        accumulated_time_year: 1820,
        order: 1,
        user_id: "user-123",
        yearly_goal_detail: "April rebuild morning routine",
      },
    ]);
    expect(options).toEqual({ onConflict: "id" });
  });

  test("allows adding a new annual goal and shifts existing order", async () => {
    const { getByRole, getByPlaceholderText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(
      getByPlaceholderText("e.g. Get a overall score 8 in IELTS"),
      "Launch a side product",
    );
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(2));

    const [updates] = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1];
    expect(updates).toEqual([
      {
        id: "goal-2",
        description: "Career leap with shipped projects and portfolio refresh",
        year_goal_color: "#6EA8FF",
        is_done: false,
        accumulated_time_year: 2450,
        order: 1,
        user_id: "user-123",
        yearly_goal_detail: null,
      },
      {
        id: "goal-1",
        description: "Deep health routine with consistent sleep and workouts",
        year_goal_color: "#1E5EFF",
        is_done: false,
        accumulated_time_year: 1820,
        order: 2,
        user_id: "user-123",
        yearly_goal_detail: "April rebuild morning routine",
      },
      {
        id: "goal-3",
        description: "Launch a side product",
        year_goal_color: "#1E5EFF",
        is_done: false,
        accumulated_time_year: 0,
        order: 0,
        user_id: "user-123",
        yearly_goal_detail: null,
      },
    ]);
  });

  test("uses smaller header typography for French title and buttons", async () => {
    await i18n.changeLanguage("fr");

    const { findByText, findByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const title = await findByText("Objectifs annuels");
    const addButtonLabel = await findByText("Ajouter");
    const deleteButton = await findByRole("button", { name: "Supprimer" });
    const deleteButtonLabel = within(deleteButton).getByText("Supprimer");

    expect(title).toHaveStyle({ fontSize: 24 });
    expect(addButtonLabel).toHaveStyle({ fontSize: 14 });
    expect(deleteButtonLabel).toHaveStyle({ fontSize: 14 });
  });

  test("renders detail, edit, complete, and reorder icon buttons together in the card footer", async () => {
    const { findByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const actionRow = await findByTestId("annual-goal-card-actions-goal-1");

    expect(within(actionRow).getByTestId("annual-goal-card-detail-goal-1")).toBeTruthy();
    expect(within(actionRow).getByTestId("annual-goal-card-edit-goal-1")).toBeTruthy();
    expect(within(actionRow).getByTestId("annual-goal-card-complete-goal-1")).toBeTruthy();
    expect(within(actionRow).getByTestId("annual-goal-card-reorder-goal-1")).toBeTruthy();
    expect(queryByText("Edit")).toBeNull();
  });

  test("uses an icon-only delete button in delete mode while keeping accessibility text", async () => {
    const { getByRole, findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Delete" }));

    const actionRow = await findByTestId("annual-goal-card-actions-goal-1");
    expect(within(actionRow).queryByText("Delete")).toBeNull();
    expect(within(actionRow).getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  test("toggles completed state styling on and off", async () => {
    const { findByTestId, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const card = await findByTestId("annual-goal-card-goal-1");
    const title = await findByTestId("annual-goal-card-title-goal-1");
    const completeButton = await findByTestId("annual-goal-card-complete-goal-1");

    expect(queryByTestId("annual-goal-card-completed-badge-goal-1")).toBeNull();

    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_done: true });
    });

    expect(await findByTestId("annual-goal-card-completed-badge-goal-1")).toBeTruthy();
    expect(card).toHaveStyle({ borderColor: "rgba(56,217,150,0.55)" });
    expect(queryByTestId("annual-goal-card-edit-goal-1")).toBeNull();
    expect(queryByTestId("annual-goal-card-detail-goal-1")).toBeNull();
    expect(title).toHaveStyle({ color: "rgba(233,237,247,0.78)" });
    expect(title).not.toHaveStyle({ textDecorationLine: "line-through" });

    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_done: false });
    });

    await waitFor(() => {
      expect(queryByTestId("annual-goal-card-completed-badge-goal-1")).toBeNull();
    });
    expect(await findByTestId("annual-goal-card-edit-goal-1")).toBeTruthy();
    expect(await findByTestId("annual-goal-card-detail-goal-1")).toBeTruthy();
  });

  test("opens detail modal with saved detail and updates Supabase on save", async () => {
    const { findByTestId, findByDisplayValue, getByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(await findByTestId("annual-goal-card-detail-goal-1"));

    expect(await findByDisplayValue("April rebuild morning routine")).toBeTruthy();
    expect(await findByTestId("annual-goals-detail-title")).toHaveTextContent(
      "Deep health routine with consistent sleep and workouts",
    );

    const memoInput = await findByDisplayValue("April rebuild morning routine");
    fireEvent.changeText(memoInput, "April rebuild morning routine\nMay lock the weekly review cadence");
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        yearly_goal_detail: "April rebuild morning routine\nMay lock the weekly review cadence",
      });
    });
  });

  test("truncates long accumulated time text after 9 characters", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: "goal-1",
          description: "Deep health routine with consistent sleep and workouts",
          year_goal_color: "#1E5EFF",
          yearly_goal_detail: null,
          is_done: false,
          accumulated_time_year: 740740746,
          order: 0,
          updated_at: "2025-01-06T09:30:00Z",
        },
      ],
      error: null,
    });

    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    expect(await findByTestId("annual-goal-card-time-goal-1")).toHaveTextContent("12345679h...");
  });

  test("truncates long total accumulated time text after 9 characters", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: "goal-1",
          description: "Deep health routine with consistent sleep and workouts",
          year_goal_color: "#1E5EFF",
          yearly_goal_detail: null,
          is_done: false,
          accumulated_time_year: 370370380,
          order: 0,
          updated_at: "2025-01-06T09:30:00Z",
        },
        {
          id: "goal-2",
          description: "Career leap with shipped projects and portfolio refresh",
          year_goal_color: "#6EA8FF",
          yearly_goal_detail: null,
          is_done: false,
          accumulated_time_year: 370370380,
          order: 1,
          updated_at: "2025-01-08T13:10:00Z",
        },
      ],
      error: null,
    });

    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    expect(await findByTestId("annual-goals-total-time")).toHaveTextContent("12345679h...");
  });

  test("prevents saving when required fields are empty", async () => {
    const { getByRole, findByText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const initialUpsertCalls = mockUpsert.mock.calls.length;

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByRole("button", { name: "Save" }));

    expect(await findByText("Please fill all fields")).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpsert.mock.calls.length).toBe(initialUpsertCalls);
  });

  test("shows login missing message when session is absent", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
    });
    const { findByText } = renderScreen();

    expect(await findByText("Session not found. Please log in again.")).toBeTruthy();
  });

  test("renders equal donut slices when all accumulated times are zero", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: "goal-1",
          description: "Reset routine",
          year_goal_color: "#1E5EFF",
          yearly_goal_detail: null,
          is_done: false,
          accumulated_time_year: 0,
          order: 0,
          updated_at: "2025-01-06T09:30:00Z",
        },
        {
          id: "goal-2",
          description: "Build core habits",
          year_goal_color: "#6EA8FF",
          yearly_goal_detail: null,
          is_done: false,
          accumulated_time_year: 0,
          order: 1,
          updated_at: "2025-01-08T13:10:00Z",
        },
      ],
      error: null,
    });

    renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const values = (lastPieData ?? []).map((item) => item.value);
    const colors = (lastPieData ?? []).map((item) => item.color).sort();
    expect(values).toEqual([1, 1]);
    expect(colors).toEqual(["#1E5EFF", "#6EA8FF"].sort());
  });

  test("does not show a success alert after deleting an annual goal", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const destructive = buttons?.find((button) => button.style === "destructive");
      destructive?.onPress?.();
    });

    const { getByRole, findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Delete" }));
    const actionRow = await findByTestId("annual-goal-card-actions-goal-1");
    fireEvent.press(within(actionRow).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  test("shows a bulk delete success alert when deleting all annual goals", async () => {
    (deleteYearlyGoals as jest.Mock).mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const destructive = buttons?.find((button) => button.style === "destructive");
      destructive?.onPress?.();
    });

    const { getByRole, getAllByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Delete" }));
    fireEvent.press(getAllByRole("button", { name: "Delete all" })[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenLastCalledWith("Deleted all", "All annual goals were removed.");
    });

    alertSpy.mockRestore();
  });

  test("dismisses keyboard when tapping modal overlay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByTestId("annual-goals-modal-overlay"));

    expect(dismissSpy).toHaveBeenCalled();
  });

  test("renders keyboard avoiding view and scroll area in modal", async () => {
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(getByTestId("annual-goals-modal-kav")).toBeTruthy();
    expect(getByTestId("annual-goals-modal-scroll")).toBeTruthy();
  });

  test("hides keyboard icon when keyboard is not visible", async () => {
    const { getByRole, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(queryByTestId("annual-goals-modal-keyboard-button")).toBeNull();
  });
});
