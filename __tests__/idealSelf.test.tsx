import React from "react";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { I18nextProvider } from "react-i18next";
import IdealSelfScreen from "../components/feature/IdealSelfScreen";
import { spacing } from "../constants/theme";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { decryptFieldValue, isEncryptedFieldValue } from "../lib/security/fieldEncryption";
import { getAccessStateForUser } from "../lib/subscription";

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

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: jest.fn(),
}));

jest.mock("react-native-draggable-flatlist", () => {
  const { createMockDraggableFlatList } = require("./helpers/mockDraggableFlatList");
  return createMockDraggableFlatList({
    testID: "ideal-self-list-content",
    autoDragOnMount: true,
  });
});

describe("IdealSelfScreen reordering", () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockUpsert = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockSelectAfterInsert = jest.fn();
  const mockSingleAfterInsert = jest.fn();

  const renderScreen = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <IdealSelfScreen />
      </I18nextProvider>,
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage("en");
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      subscription: { status: "active" },
      accessOverride: null,
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
        { id: "ideal-1", description: "First Ideal", order: 0, updated_at: "2024-01-01T00:00:00Z" },
        { id: "ideal-2", description: "Second Ideal", order: 1, updated_at: "2024-01-02T00:00:00Z" },
      ],
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockSingleAfterInsert.mockResolvedValue({
      data: { id: "ideal-3", description: "New Ideal", order: 0, updated_at: "2024-01-03T00:00:00Z" },
      error: null,
    });
    mockSelectAfterInsert.mockReturnThis();
    mockInsert.mockReturnValue({
      select: mockSelectAfterInsert,
      single: mockSingleAfterInsert,
    });
  });

  test("sends full rows with user when persisting drag order", async () => {
    renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());

    const [updates, options] = mockUpsert.mock.calls[0];
    expect(updates.map(({ description, ...row }: { description: string }) => row)).toEqual([
      { id: "ideal-2", order: 0, user_id: "user-123" },
      { id: "ideal-1", order: 1, user_id: "user-123" },
    ]);
    expect(updates.map((row: { description: string }) => isEncryptedFieldValue(row.description))).toEqual([true, true]);
    expect(updates.map((row: { description: string }) => decryptFieldValue(row.description))).toEqual([
      "Second Ideal",
      "First Ideal",
    ]);
    expect(options).toEqual({ onConflict: "id" });
  });

  test("shows localized login missing message when no session is found", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
    });

    const { findByText } = renderScreen();

    expect(await findByText("Session not found. Please log in again.")).toBeTruthy();
  });

  test("does not render the drag hint text in cards", async () => {
    const { findByText, queryByText } = renderScreen();

    expect(await findByText("Second Ideal")).toBeTruthy();
    expect(queryByText("Drag to reorder")).toBeNull();
  });

  test("moves list label and updated info into the edit modal and hides hero subtitle", async () => {
    const { findAllByRole, queryByText, getByText, findByText } = renderScreen();

    expect(queryByText("Write down who you want to become so you can stay aligned every day.")).toBeNull();
    await findByText("Second Ideal");

    const editButtons = await findAllByRole("button", { name: "Edit" });
    fireEvent.press(editButtons[0]);

    expect(getByText(/Updated/)).toBeTruthy();
  });

  test("adds a new ideal to the top and shifts existing orders", async () => {
    const { getByRole, getByPlaceholderText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.changeText(getByPlaceholderText("e.g. Travel around the world as nomad worker"), "New Ideal");
    fireEvent.press(getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());

    const lastUpsertCall = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1];
    const updates = lastUpsertCall[0];
    expect(updates.map(({ description, ...row }: { description: string }) => row)).toEqual([
      { id: "ideal-2", order: 1, user_id: "user-123" },
      { id: "ideal-1", order: 2, user_id: "user-123" },
      { id: "ideal-3", order: 0, user_id: "user-123" },
    ]);
    expect(updates.map((row: { description: string }) => decryptFieldValue(row.description))).toEqual([
      "Second Ideal",
      "First Ideal",
      "New Ideal",
    ]);
  });

  test("uses smaller header typography for French title and buttons", async () => {
    await i18n.changeLanguage("fr");

    const { findByText, findByRole } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const title = await findByText("Mon moi idéal");
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

    const actionRow = await findByTestId("ideal-self-card-actions-ideal-1");

    expect(within(actionRow).getByTestId("ideal-self-card-edit-ideal-1")).toBeTruthy();
    expect(within(actionRow).getByTestId("ideal-self-card-reorder-ideal-1")).toBeTruthy();
  });

  test("keeps card action buttons icon-only while preserving accessibility labels", async () => {
    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    const actionRow = await findByTestId("ideal-self-card-actions-ideal-1");

    expect(within(actionRow).queryByText("Edit")).toBeNull();
    expect(within(actionRow).getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(within(actionRow).getByRole("button", { name: "Drag to reorder" })).toBeTruthy();
  });

  test("uses a tighter gap between ideal self cards", async () => {
    const { findByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    expect(await findByTestId("ideal-self-list-content")).toHaveStyle({
      gap: spacing.sm,
    });
  });

  test("shows localized required message instead of generic invalid input on empty submit", async () => {
    const { getByRole, queryByText, findByText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByRole("button", { name: "Save" }));

    expect(queryByText("Invalid input")).toBeNull();
    expect(await findByText("Please enter at least 1 character")).toBeTruthy();
  });

  test("shows upgrade alert for free users when 10 ideals already exist", async () => {
    mockOrder.mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, index) => ({
        id: `ideal-${index + 1}`,
        description: `Ideal ${index + 1}`,
        order: index,
        updated_at: "2024-01-01T00:00:00Z",
      })),
      error: null,
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValueOnce({
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
        "The free plan allows up to 10 items. Upgrade your plan to go beyond 10.",
      ),
    ).toBeTruthy();

    fireEvent.press(await findByTestId("usage-limit-upgrade-modal-upgrade"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/purchases");
  });

  test("dismisses keyboard when tapping modal overlay", async () => {
    const dismissSpy = jest.spyOn(Keyboard, "dismiss");
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByTestId("ideal-self-modal-overlay"));

    expect(dismissSpy).toHaveBeenCalled();
  });

  test("renders keyboard avoiding view and scroll area in modal", async () => {
    const { getByRole, getByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(getByTestId("ideal-self-modal-kav")).toBeTruthy();
    expect(getByTestId("ideal-self-modal-scroll")).toBeTruthy();
  });

  test("hides keyboard icon when keyboard is not visible", async () => {
    const { getByRole, queryByTestId } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));

    expect(queryByTestId("ideal-self-modal-keyboard-button")).toBeNull();
  });
});
