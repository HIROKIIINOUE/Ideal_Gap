import { navigateToPaymentScreen } from "../lib/paymentNavigation";
import { getAccessStateForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/subscription", () => ({
  getAccessStateForUser: jest.fn(),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

describe("navigateToPaymentScreen", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("routes free users to purchases", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValue({
      canAccessApp: true,
      accessMode: "free",
      subscription: null,
      accessOverride: null,
    });

    await navigateToPaymentScreen({ push: mockPush } as never);

    expect(mockPush).toHaveBeenCalledWith("/purchases");
  });

  test("routes paid-equivalent users to payment management", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    (getAccessStateForUser as jest.Mock).mockResolvedValue({
      canAccessApp: true,
      accessMode: "friend_free",
      subscription: null,
      accessOverride: { access_type: "friend_free", is_active: true },
    });

    await navigateToPaymentScreen({ push: mockPush } as never);

    expect(mockPush).toHaveBeenCalledWith("/payment-management");
  });

  test("routes users without a session to login", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await navigateToPaymentScreen({ push: mockPush } as never);

    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(getAccessStateForUser).not.toHaveBeenCalled();
  });
});
