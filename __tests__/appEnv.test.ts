describe("getAppEnv", () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalPublicAppEnv = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    process.env.APP_ENV = originalAppEnv;
    process.env.EXPO_PUBLIC_APP_ENV = originalPublicAppEnv;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("prefers expo extra.appEnv when available", () => {
    process.env.APP_ENV = "dev";
    process.env.EXPO_PUBLIC_APP_ENV = "dev";

    jest.doMock("expo-constants", () => ({
      expoConfig: {
        extra: {
          appEnv: "prod",
        },
      },
    }));

    jest.isolateModules(() => {
      const { getAppEnv } = require("../lib/appEnv");
      expect(getAppEnv()).toBe("prod");
    });
  });

  test("falls back to EXPO_PUBLIC_APP_ENV and then APP_ENV", () => {
    process.env.EXPO_PUBLIC_APP_ENV = "preview";
    process.env.APP_ENV = "prod";

    jest.doMock("expo-constants", () => ({
      expoConfig: undefined,
    }));

    jest.isolateModules(() => {
      const { getAppEnv } = require("../lib/appEnv");
      expect(getAppEnv()).toBe("preview");
    });

    delete process.env.EXPO_PUBLIC_APP_ENV;
    process.env.APP_ENV = "prod";

    jest.isolateModules(() => {
      const { getAppEnv } = require("../lib/appEnv");
      expect(getAppEnv()).toBe("prod");
    });
  });

  test("returns dev for unknown values", () => {
    process.env.EXPO_PUBLIC_APP_ENV = "staging";

    jest.doMock("expo-constants", () => ({
      expoConfig: undefined,
    }));

    jest.isolateModules(() => {
      const { getAppEnv } = require("../lib/appEnv");
      expect(getAppEnv()).toBe("dev");
    });
  });
});
