describe("app config bundle identifiers", () => {
  const originalEnv = process.env;

  const loadConfig = () => {
    let configFactory: typeof import("../app.config").default;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      configFactory = require("../app.config").default;
    });
    return configFactory!;
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("uses dev iOS bundle identifier when APP_ENV=dev", () => {
    process.env.APP_ENV = "dev";
    const configFactory = loadConfig();

    const config = configFactory();

    expect(config.ios?.bundleIdentifier).toBe(
      "com.hirokiiinoue.appIdealGap.dev"
    );
  });

  test("uses production iOS bundle identifier when APP_ENV=prod", () => {
    process.env.APP_ENV = "prod";
    const configFactory = loadConfig();

    const config = configFactory();

    expect(config.ios?.bundleIdentifier).toBe("com.idealgap.app");
  });

  test("uses dev Android package when APP_ENV=dev", () => {
    process.env.APP_ENV = "dev";
    const configFactory = loadConfig();

    const config = configFactory();

    expect(config.android?.package).toBe("com.hirokiiinoue.appIdealGap.dev");
  });

  test("uses production Android package when APP_ENV=prod", () => {
    process.env.APP_ENV = "prod";
    const configFactory = loadConfig();

    const config = configFactory();

    expect(config.android?.package).toBe("com.idealgap.app");
  });

  test("keeps required iOS infoPlist flags without static app.json", () => {
    process.env.APP_ENV = "dev";
    const configFactory = loadConfig();

    const config = configFactory();

    expect(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(config.ios?.infoPlist?.UIBackgroundModes).toEqual(["audio"]);
  });

  test("requests exact alarm permission on Android", () => {
    process.env.APP_ENV = "dev";
    const configFactory = loadConfig();

    const config = configFactory();

    expect(config.android?.permissions).toContain(
      "android.permission.SCHEDULE_EXACT_ALARM"
    );
  });
});
