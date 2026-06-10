import { resolveAuthenticatedEntryDestination } from "../lib/authEntry";
import {
  ensureSignupAwaitSubscription,
  ensureUserProfileForAuthUser,
  getAccessStateForUser,
} from "../lib/subscription";

jest.mock("../lib/subscription", () => ({
  ensureSignupAwaitSubscription: jest.fn(),
  ensureUserProfileForAuthUser: jest.fn(),
  getAccessStateForUser: jest.fn(),
}));

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  app_metadata: {},
  user_metadata: {},
} as any;

describe("resolveAuthenticatedEntryDestination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureUserProfileForAuthUser as jest.Mock).mockResolvedValue({ id: "user-123" });
    (ensureSignupAwaitSubscription as jest.Mock).mockResolvedValue({
      user_id: "user-123",
      status: "signupAwait",
    });
  });

  it("routes to dashboard when access cannot be verified", async () => {
    (getAccessStateForUser as jest.Mock).mockResolvedValue({
      canAccessApp: true,
      accessMode: "paid",
      resolution: "unknown",
      unknownReason: "subscription_fetch_failed",
      subscription: null,
      accessOverride: null,
      source: "last_known_cache",
    });

    await expect(
      resolveAuthenticatedEntryDestination({
        source: "login",
        user: mockUser,
        language: "en",
      }),
    ).resolves.toBe("/dashboard");

    expect(ensureSignupAwaitSubscription).not.toHaveBeenCalled();
  });
});
