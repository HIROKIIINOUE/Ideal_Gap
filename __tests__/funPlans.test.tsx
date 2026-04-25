import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import React from "react";
import { Keyboard } from "react-native";
import { I18nextProvider } from "react-i18next";
import Dashboard from "../app/dashboard";
import FunPlanScreen from "../components/feature/FunPlanScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { FunPlanProvider } from "../providers/FunPlanProvider";
import { LanguageProvider } from "../providers/LanguageProvider";
import { TimerAlarmPreferenceProvider } from "../providers/TimerAlarmPreferenceProvider";

const mockGetAccessStateForUser = jest.fn();

jest.mock("@expo/vector-icons", () => {
  const MockIcon = () => null;
  MockIcon.displayName = "MockMaterialCommunityIcons";
  return { MaterialCommunityIcons: MockIcon };
});

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
    useLocalSearchParams: () => ({}),
    Stack: { Screen: () => null },
    router: {
      push: jest.fn(),
      replace: jest.fn(),
    },
  };
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
            drag: () => { },
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

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: (...args: unknown[]) => mockGetAccessStateForUser(...args),
}));

describe("FunPlanScreen interactions", () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockUpsert = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockLimit = jest.fn();
  const mockSelectAfterInsert = jest.fn();
  const mockSingleAfterInsert = jest.fn();

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <FunPlanScreen />
      </I18nextProvider>,
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("en");
    mockGetAccessStateForUser.mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
    });
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
      limit: mockLimit,
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
        { id: "plan-1", description: "First Plan", order: 0, updated_at: "2024-01-01T00:00:00Z" },
        { id: "plan-2", description: "Second Plan", order: 1, updated_at: "2024-01-02T00:00:00Z" },
      ],
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockSingleAfterInsert.mockResolvedValue({
      data: { id: "plan-3", description: "New Plan", order: 0, updated_at: "2024-01-03T00:00:00Z" },
      error: null,
    });
    mockSelectAfterInsert.mockReturnThis();
    mockInsert.mockReturnValue({
      select: mockSelectAfterInsert,
      single: mockSingleAfterInsert,
    });
  });

  test("persists reordered fun plans with user id", async () => {
    renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());

    const [updates, options] = mockUpsert.mock.calls[0];
    expect(updates).toEqual([
      { id: "plan-2", description: "Second Plan", order: 0, user_id: "user-123" },
      { id: "plan-1", description: "First Plan", order: 1, user_id: "user-123" },
    ]);
    expect(options).toEqual({ onConflict: "id" });
  });

  test("disables add when five plans already exist", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        { id: "plan-1", description: "Plan 1", order: 0 },
        { id: "plan-2", description: "Plan 2", order: 1 },
        { id: "plan-3", description: "Plan 3", order: 2 },
        { id: "plan-4", description: "Plan 4", order: 3 },
        { id: "plan-5", description: "Plan 5", order: 4 },
      ],
      error: null,
    });

    const { findByRole, findByText } = renderScreen();

    const addButton = await findByRole("button", { name: "Add" });
    expect(addButton.props.accessibilityState?.disabled).toBe(true);
    expect(await findByText("Up to 5 plans can be added")).toBeTruthy();
  });

  test("adds a new fun plan using the updated placeholder", async () => {
    const { getByPlaceholderText, getByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(
      getByPlaceholderText("e.g. Dinner with friends on Friday"),
      "New Plan",
    );
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
  });

  test("uses smaller header typography for French title and buttons", async () => {
    await i18n.changeLanguage("fr");

    const { findByText, findByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const title = await findByText("Plans sympas à venir");
    const addButtonLabel = await findByText("Ajouter");
    const deleteButton = await findByRole("button", { name: "Supprimer" });
    const deleteButtonLabel = within(deleteButton).getByText("Supprimer");

    expect(title).toHaveStyle({ fontSize: 24 });
    expect(addButtonLabel).toHaveStyle({ fontSize: 14 });
    expect(deleteButtonLabel).toHaveStyle({ fontSize: 14 });
  });

  test("renders edit and reorder buttons together in the card footer", async () => {
    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const actionRow = await findByTestId("fun-plan-card-actions-plan-1");

    expect(within(actionRow).getByTestId("fun-plan-card-edit-plan-1")).toBeTruthy();
    expect(within(actionRow).getByTestId("fun-plan-card-reorder-plan-1")).toBeTruthy();
  });

  test("dismisses keyboard when tapping modal overlay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByTestId("fun-plan-modal-overlay"));

    expect(dismissSpy).toHaveBeenCalled();
  });

  test("renders keyboard avoiding view and scroll area in modal", async () => {
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(getByTestId("fun-plan-modal-kav")).toBeTruthy();
    expect(getByTestId("fun-plan-modal-scroll")).toBeTruthy();
  });

  test("hides keyboard icon when keyboard is not visible", async () => {
    const { getByRole, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(queryByTestId("fun-plan-modal-keyboard-button")).toBeNull();
  });
});

describe("Dashboard next fun plan hero", () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockLimit = jest.fn();

  const renderDashboard = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <TimerAlarmPreferenceProvider>
            <FunPlanProvider>
              <Dashboard />
            </FunPlanProvider>
          </TimerAlarmPreferenceProvider>
        </LanguageProvider>
      </I18nextProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
      limit: mockLimit,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockResolvedValue({
      data: [{ id: "plan-1", description: "Weekend brunch", order: 0 }],
      error: null,
    });
  });

  test("shows the first fun plan description in the hero when visible", async () => {
    const { findByText } = renderDashboard();

    expect(await findByText("Weekend brunch")).toBeTruthy();
  });
});
