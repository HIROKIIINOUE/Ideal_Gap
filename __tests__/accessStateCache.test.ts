import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildLastKnownAccessStateKey,
  clearLastKnownAccessState,
  readLastKnownAccessState,
  writeLastKnownAccessState,
} from "../lib/accessStateCache";

describe("accessStateCache", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("saves and restores last known entitled access", async () => {
    await writeLastKnownAccessState("user-1", "paid");

    await expect(readLastKnownAccessState("user-1")).resolves.toEqual(
      expect.objectContaining({ accessMode: "paid" }),
    );
  });

  test("clears persisted access state", async () => {
    await writeLastKnownAccessState("user-1", "friend_free");
    await clearLastKnownAccessState("user-1");

    await expect(readLastKnownAccessState("user-1")).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem(buildLastKnownAccessStateKey("user-1")),
    ).resolves.toBeNull();
  });
});
