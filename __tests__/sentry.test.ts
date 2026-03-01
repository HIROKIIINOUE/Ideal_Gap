import { stripSensitiveDataFromEvent, shouldIgnoreSentryError } from "../lib/sentry";

describe("Sentry filtering", () => {
  it("ignores configured minor cancellation errors", () => {
    expect(shouldIgnoreSentryError("AbortError: The operation was aborted")).toBe(true);
    expect(shouldIgnoreSentryError("Purchase was cancelled by user")).toBe(true);
    expect(shouldIgnoreSentryError("ERR_CANCELED")).toBe(true);
  });

  it("does not ignore unknown errors", () => {
    expect(shouldIgnoreSentryError("TypeError: undefined is not an object")).toBe(false);
  });

  it("strips email and auth-like headers from event", () => {
    const sanitized = stripSensitiveDataFromEvent({
      user: {
        id: "user-123",
        email: "user@example.com",
        username: "hiroki",
      },
      request: {
        headers: {
          authorization: "Bearer token",
          cookie: "session=abc",
          "x-api-key": "secret",
        },
      },
    });

    expect(sanitized.user).toEqual({ id: "user-123" });
    expect(sanitized.request?.headers).toEqual({
      authorization: "[Filtered]",
      cookie: "[Filtered]",
      "x-api-key": "[Filtered]",
    });
  });
});
