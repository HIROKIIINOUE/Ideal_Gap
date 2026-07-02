import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import React from "react";
import { Keyboard } from "react-native";
import { I18nextProvider } from "react-i18next";
import Dashboard from "../app/dashboard";
import FunPlanScreen from "../components/feature/FunPlanScreen";
import i18n from "../i18n";
import { decryptFieldValue, isEncryptedFieldValue } from "../lib/security/fieldEncryption";
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

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockDateTimePicker = ({ testID }: { testID?: string }) => (
    <Text testID={testID ?? "mock-datetime-picker"}>MockDateTimePicker</Text>
  );
  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: {
      open: jest.fn(),
    },
  };
});

jest.mock("react-native-draggable-flatlist", () => {
  const { createMockDraggableFlatList } = require("./helpers/mockDraggableFlatList");
  return createMockDraggableFlatList({ autoDragOnMount: true });
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
    expect(updates.map(({ description, ...row }: { description: string }) => row)).toEqual([
      { id: "plan-2", event_date: null, order: 0, user_id: "user-123" },
      { id: "plan-1", event_date: null, order: 1, user_id: "user-123" },
    ]);
    expect(updates.map((row: { description: string }) => isEncryptedFieldValue(row.description))).toEqual([true, true]);
    expect(updates.map((row: { description: string }) => decryptFieldValue(row.description))).toEqual([
      "Second Plan",
      "First Plan",
    ]);
    expect(options).toEqual({ onConflict: "id" });
  });

  test("shows upgrade alert when a free user already has five plans", async () => {
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
    mockGetAccessStateForUser.mockResolvedValueOnce({
      canAccessApp: true,
      accessMode: "free",
      subscription: null,
      accessOverride: null,
    });

    const { findByRole, findByTestId, findByText } = renderScreen();

    const addButton = await findByRole("button", { name: "Add" });
    fireEvent.press(addButton);

    expect(await findByText("Limit reached")).toBeTruthy();
    expect(
      await findByText(
        "The free plan allows up to 5 items. Upgrade your plan to go beyond 5.",
      ),
    ).toBeTruthy();

    fireEvent.press(await findByTestId("usage-limit-upgrade-modal-upgrade"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/purchases");
  });

  test("shows page subtitle only in the empty state between title and CTA", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { findAllByText, findByText } = renderScreen();

    const emptyTitle = await findByText("No fun plans yet");
    const emptyBody = await findByText(
      "Keep your next exciting events in sight and stay motivated. (Only the top item appears on the dashboard)",
    );
    const emptyCta = await findByText("Add your first plan");

    expect(
      await findAllByText(
        "Keep your next exciting events in sight and stay motivated. (Only the top item appears on the dashboard)",
      ),
    ).toHaveLength(1);
    expect(emptyTitle.props.children).toBe("No fun plans yet");
    expect(emptyBody.props.children).toBe(
      "Keep your next exciting events in sight and stay motivated. (Only the top item appears on the dashboard)",
    );
    expect(emptyCta.props.children).toBe("Add your first plan");
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

  test("saves a fun plan without a date when event_date is not set", async () => {
    const { getByPlaceholderText, getByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(
      getByPlaceholderText("e.g. Dinner with friends on Friday"),
      "New Plan",
    );
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const [payload] = mockInsert.mock.calls[0];
    const { description, ...row } = payload;
    expect(row).toEqual({
      user_id: "user-123",
      event_date: null,
      order: 0,
    });
    expect(isEncryptedFieldValue(description)).toBe(true);
    expect(decryptFieldValue(description)).toBe("New Plan");
  });

  test("saves a fun plan with a past event_date when description is filled", async () => {
    const { getByPlaceholderText, getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(
      getByPlaceholderText("e.g. Dinner with friends on Friday"),
      "Past Plan",
    );
    fireEvent.press(getByRole("button", { name: "Select date" }));
    fireEvent(getByTestId("fun-plan-event-date-picker"), "onChange", {}, new Date("2026-05-20T12:00:00"));
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const [payload] = mockInsert.mock.calls[0];
    const { description, ...row } = payload;
    expect(row).toEqual({
      user_id: "user-123",
      event_date: "2026-05-20",
      order: 0,
    });
    expect(isEncryptedFieldValue(description)).toBe(true);
    expect(decryptFieldValue(description)).toBe("Past Plan");
  });

  test("shows the dashboard note under the title card heading", async () => {
    const { findByText } = renderScreen();

    expect(await findByText("(Only the top item appears on the dashboard)")).toBeTruthy();
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

  test("keeps card action buttons icon-only while preserving accessibility labels", async () => {
    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const actionRow = await findByTestId("fun-plan-card-actions-plan-1");

    expect(within(actionRow).queryByText("Edit")).toBeNull();
    expect(within(actionRow).getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(within(actionRow).getByRole("button", { name: "Drag to reorder" })).toBeTruthy();
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

  test("shows the iOS date picker after pressing the select date button", async () => {
    const { getByRole, queryByRole, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(queryByTestId("fun-plan-event-date-picker")).toBeNull();
    expect(queryByRole("button", { name: "Clear" })).toBeNull();

    fireEvent.press(getByRole("button", { name: "Select date" }));

    expect(queryByTestId("fun-plan-event-date-picker")).toBeTruthy();
  });

  test("shows the selected event date below the date button after input", async () => {
    const { getByRole, getByTestId, findByText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByRole("button", { name: "Select date" }));
    fireEvent(getByTestId("fun-plan-event-date-picker"), "onChange", {}, new Date("2026-05-20T12:00:00"));

    expect(
      await findByText(
        `Selected date: ${new Intl.DateTimeFormat("en-CA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date("2026-05-20T12:00:00"))}`,
      ),
    ).toBeTruthy();
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
      data: [{ id: "plan-1", description: "Weekend brunch", order: 0, event_date: "2026-05-30" }],
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("shows the first fun plan description in the hero when visible", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-30T12:00:00"));
    const { findByText } = renderDashboard();

    expect(await findByText("Weekend brunch")).toBeTruthy();
    expect(await findByText("今日")).toBeTruthy();
  });

  test("hides the countdown when event_date is null", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-30T12:00:00"));
    mockLimit.mockResolvedValueOnce({
      data: [{ id: "plan-1", description: "Weekend brunch", order: 0, event_date: null }],
      error: null,
    });

    const { findByText, queryByText } = renderDashboard();

    expect(await findByText("Weekend brunch")).toBeTruthy();
    await waitFor(() => expect(queryByText("今日")).toBeNull());
  });
});
