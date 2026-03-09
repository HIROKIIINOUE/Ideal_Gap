import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { I18nextProvider } from "react-i18next";
import IdealSelfScreen from "../components/feature/IdealSelfScreen";
import i18n from "../i18n";
import { supabase } from "../lib/supabaseClient";

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

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(updates).toEqual([
      { id: "ideal-2", description: "Second Ideal", order: 0, user_id: "user-123" },
      { id: "ideal-1", description: "First Ideal", order: 1, user_id: "user-123" },
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
    expect(updates).toEqual([
      { id: "ideal-2", description: "Second Ideal", order: 1, user_id: "user-123" },
      { id: "ideal-1", description: "First Ideal", order: 2, user_id: "user-123" },
      { id: "ideal-3", description: "New Ideal", order: 0, user_id: "user-123" },
    ]);
  });

  test("shows localized required message instead of generic invalid input on empty submit", async () => {
    const { getByRole, queryByText, findByText } = renderScreen();

    await waitFor(() => expect(mockOrder).toHaveBeenCalled());
    fireEvent.press(getByRole("button", { name: "Add" }));
    fireEvent.press(getByRole("button", { name: "Save" }));

    expect(queryByText("Invalid input")).toBeNull();
    expect(await findByText("Please enter at least 1 character")).toBeTruthy();
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
