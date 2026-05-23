const mockInvoke = jest.fn();
const mockSignOutCurrentSession = jest.fn();

jest.mock("../supabaseClient", () => ({
  __esModule: true,
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock("../logout", () => ({
  __esModule: true,
  signOutCurrentSession: (...args: unknown[]) =>
    mockSignOutCurrentSession(...args),
}));

const { deleteCurrentAccount } = require("../accountDeletion");

describe("deleteCurrentAccount", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockSignOutCurrentSession.mockReset();
  });

  it("invokes the delete-account function and signs out locally", async () => {
    mockInvoke.mockResolvedValue({
      data: { deletedAt: "2026-05-21T00:00:00.000Z" },
      error: null,
    });
    mockSignOutCurrentSession.mockResolvedValue(undefined);

    await expect(deleteCurrentAccount()).resolves.toEqual({
      deletedAt: "2026-05-21T00:00:00.000Z",
    });

    expect(mockInvoke).toHaveBeenCalledWith("delete-account", { method: "POST" });
    expect(mockSignOutCurrentSession).toHaveBeenCalledTimes(1);
  });

  it("does not sign out when the delete-account function fails", async () => {
    const error = new Error("delete failed");
    mockInvoke.mockResolvedValue({
      data: null,
      error,
    });

    await expect(deleteCurrentAccount()).rejects.toThrow("delete failed");

    expect(mockSignOutCurrentSession).not.toHaveBeenCalled();
  });
});
