import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import AnnualGoalsScreen from "../components/feature/AnnualGoalsScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

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
  }: {
    data: unknown[];
    renderItem: (params: { item: unknown; index: number; drag: () => void; isActive: boolean; getIndex: () => number }) => React.ReactNode;
    onDragEnd: (params: { data: unknown[] }) => void;
  }) => {
    const firedRef = React.useRef(false);
    React.useEffect(() => {
      if (!firedRef.current && data.length > 0) {
        firedRef.current = true;
        onDragEnd({ data: [...data].reverse() });
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

  beforeEach(() => {
    jest.clearAllMocks();
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
          accumulated_time_year: 1820,
          order: 0,
          updated_at: "2025-01-06T09:30:00Z",
        },
        {
          id: "goal-2",
          description: "Career leap with shipped projects and portfolio refresh",
          year_goal_color: "#6EA8FF",
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

    mockSingleAfterUpdate.mockResolvedValue({
      data: {
        id: "goal-1",
        description: "Updated goal",
        year_goal_color: "#1E5EFF",
        accumulated_time_year: 1820,
        order: 0,
        updated_at: "2025-02-02T00:00:00Z",
      },
      error: null,
    });
    mockSelectAfterUpdate.mockReturnThis();
    mockUpdate.mockReturnValue({
      eq: () => ({
        select: mockSelectAfterUpdate,
        single: mockSingleAfterUpdate,
      }),
    });
    mockEqAfterDelete.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({
      eq: mockEqAfterDelete,
    });
  });

  test("fetches goals, renders them, and persists reordered data with user id", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("Total focus time")).toBeTruthy();
    expect(await findByText("Career leap with shipped projects and portfolio refresh")).toBeTruthy();

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const [updates, options] = mockUpsert.mock.calls[0];
    expect(updates).toEqual([
      {
        id: "goal-2",
        description: "Career leap with shipped projects and portfolio refresh",
        year_goal_color: "#6EA8FF",
        accumulated_time_year: 2450,
        order: 0,
        user_id: "user-123",
      },
      {
        id: "goal-1",
        description: "Deep health routine with consistent sleep and workouts",
        year_goal_color: "#1E5EFF",
        accumulated_time_year: 1820,
        order: 1,
        user_id: "user-123",
      },
    ]);
    expect(options).toEqual({ onConflict: "id" });
  });

  test("allows adding a new annual goal and shifts existing order", async () => {
    const { getByRole, getByPlaceholderText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(
      getByPlaceholderText("e.g. Build a stable sleep routine and prioritize recovery"),
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
        accumulated_time_year: 2450,
        order: 1,
        user_id: "user-123",
      },
      {
        id: "goal-1",
        description: "Deep health routine with consistent sleep and workouts",
        year_goal_color: "#1E5EFF",
        accumulated_time_year: 1820,
        order: 2,
        user_id: "user-123",
      },
      {
        id: "goal-3",
        description: "Launch a side product",
        year_goal_color: "#1E5EFF",
        accumulated_time_year: 0,
        order: 0,
        user_id: "user-123",
      },
    ]);
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
          accumulated_time_year: 0,
          order: 0,
          updated_at: "2025-01-06T09:30:00Z",
        },
        {
          id: "goal-2",
          description: "Build core habits",
          year_goal_color: "#6EA8FF",
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
});
