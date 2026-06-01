import AsyncStorage from "@react-native-async-storage/async-storage";

const mockCreateClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe("supabase client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      EXPO_PUBLIC_FIELD_ENCRYPTION_KEY: "test-field-encryption-key-32-chars",
      EXPO_PUBLIC_REVENUECAT_API_KEY_DEV: "rc-test-key",
      APP_ENV: "dev",
    };

    mockCreateClient.mockReturnValue({ auth: {} });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("creates clients with AsyncStorage and auth settings", () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("../lib/supabaseClient");
    });

    expect(mockCreateClient).toHaveBeenCalledTimes(2);
    const [url, key, options] = mockCreateClient.mock.calls[0];
    const [recoveryUrl, recoveryKey, recoveryOptions] = mockCreateClient.mock.calls[1];

    expect(url).toBe("https://example.supabase.co");
    expect(key).toBe("anon-key");
    expect(recoveryUrl).toBe("https://example.supabase.co");
    expect(recoveryKey).toBe("anon-key");

    expect(options?.auth?.storage).toBeDefined();
    expect(options?.auth?.autoRefreshToken).toBe(true);
    expect(options?.auth?.persistSession).toBe(true);
    expect(options?.auth?.detectSessionInUrl).toBe(false);

    expect(recoveryOptions?.auth?.storage).toBeDefined();
    expect(recoveryOptions?.auth?.autoRefreshToken).toBe(false);
    expect(recoveryOptions?.auth?.persistSession).toBe(false);
    expect(recoveryOptions?.auth?.detectSessionInUrl).toBe(false);
  });
});
