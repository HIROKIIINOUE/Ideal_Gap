describe("getValidatedEnv", () => {
  const originalEnv = process.env;
  const loadEnvModule = () => {
    let moduleEnv: typeof import("../lib/env");
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      moduleEnv = require("../lib/env");
    });
    return moduleEnv!;
  };

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
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV;
    delete process.env.APP_ENV;

    expect(() => {
      jest.isolateModules(() => {
        require("../lib/env");
      });
    }).toThrow("Missing environment variables");
  });

  test("returns validated env when vars are set", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV = "rc-test-key";
    process.env.APP_ENV = "dev";

    const moduleEnv = loadEnvModule();

    expect(moduleEnv.env).toEqual({
      appEnv: "dev",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      revenueCatApiKey: "rc-test-key",
    });

    expect(moduleEnv.getValidatedEnv()).toEqual({
      appEnv: "dev",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      revenueCatApiKey: "rc-test-key",
    });
  });

  test("uses iOS specific production RevenueCat key when available", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_IOS = "rc-prod-ios";
    process.env.APP_ENV = "prod";

    const moduleEnv = loadEnvModule();

    expect(moduleEnv.getValidatedEnv().revenueCatApiKey).toBe("rc-prod-ios");
  });

  test("uses iOS specific development RevenueCat key when available", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV_IOS = "rc-dev-ios";
    process.env.APP_ENV = "dev";

    const moduleEnv = loadEnvModule();

    expect(moduleEnv.resolveRevenueCatApiKey("dev", "ios")).toBe("rc-dev-ios");
    expect(moduleEnv.getValidatedEnv().revenueCatApiKey).toBe("rc-dev-ios");
  });

  test("uses Android specific production RevenueCat key when available", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_ANDROID = "rc-prod-android";
    process.env.APP_ENV = "prod";

    const moduleEnv = loadEnvModule();

    expect(moduleEnv.resolveRevenueCatApiKey("prod", "android")).toBe("rc-prod-android");
    expect(moduleEnv.getValidatedEnv().revenueCatApiKey).toBe("rc-prod-android");
  });

  test("falls back to legacy production key when platform specific key is absent", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD = "rc-prod-legacy";
    process.env.APP_ENV = "prod";

    const moduleEnv = loadEnvModule();

    expect(moduleEnv.getValidatedEnv().revenueCatApiKey).toBe("rc-prod-legacy");
  });
});
