describe("getValidatedEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("throws when required env vars are missing", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      jest.isolateModules(() => {
        require("../lib/env");
      });
    }).toThrow("Missing environment variables");
  });

  test("returns validated env when vars are set", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    let moduleEnv: typeof import("../lib/env");
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      moduleEnv = require("../lib/env");
    });

    expect(moduleEnv!.env).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    });

    expect(moduleEnv!.getValidatedEnv()).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    });
  });
});
