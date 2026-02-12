import { resolveAuthCallbackTarget } from "../lib/authCallbackRouting";

describe("resolveAuthCallbackTarget", () => {
  test("returns dashboard with completion flag when email update callback is received", () => {
    const url = "idealgap://auth/callback?next=profile-update&email=1";
    expect(resolveAuthCallbackTarget(url)).toBe("/dashboard?emailUpdated=1");
  });

  test("returns profile-update when callback has no email completion flag", () => {
    const url = "idealgap://auth/callback?next=profile-update";
    expect(resolveAuthCallbackTarget(url)).toBe("/profile-update");
  });

  test("returns null for unrelated callback", () => {
    const url = "idealgap://auth/callback?next=dashboard";
    expect(resolveAuthCallbackTarget(url)).toBeNull();
  });
});
