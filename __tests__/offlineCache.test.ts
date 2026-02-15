import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { buildOfflineCacheKey, readOfflineCache, writeOfflineCache } from "../lib/offline/cache";

describe("offline cache", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("does not save empty array cache", async () => {
    const schema = z.array(z.object({ id: z.string() }));
    const key = buildOfflineCacheKey("ideal-self", "user-1");

    const saved = await writeOfflineCache(key, schema, []);

    expect(saved).toBe(false);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  test("saves and restores successful data", async () => {
    const schema = z.array(z.object({ id: z.string(), description: z.string() }));
    const key = buildOfflineCacheKey("ideal-self", "user-1");
    const payload = [{ id: "a", description: "cached" }];

    const saved = await writeOfflineCache(key, schema, payload);
    const restored = await readOfflineCache(key, schema);

    expect(saved).toBe(true);
    expect(restored).toEqual(payload);
  });
});
