import { parseAuthTokensFromUrl } from "../lib/deepLink";

describe("deepLink helpers", () => {
  it("returns null when recovery type is disallowed", () => {
    const url = "myapp://reset-password#access_token=token&refresh_token=refresh&type=recovery";
    expect(parseAuthTokensFromUrl(url, { disallowTypes: ["recovery"] })).toBeNull();
  });

  it("returns tokens for non-recovery links", () => {
    const url = "myapp://purchases#access_token=token&refresh_token=refresh&type=signup";
    expect(parseAuthTokensFromUrl(url, { disallowTypes: ["recovery"] })).toEqual({
      accessToken: "token",
      refreshToken: "refresh",
      type: "signup",
    });
  });
});
