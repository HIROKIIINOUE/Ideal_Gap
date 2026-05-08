import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearPersistedTaskTimerSession,
  loadPersistedTaskTimerSession,
  TASK_TIMER_SESSION_STORAGE_KEY,
} from "../lib/taskTimerSession";
import { captureTaskTimerAnomaly } from "../lib/sentry";

jest.mock("../lib/sentry", () => ({
  addSentryBreadcrumb: jest.fn(),
  captureTaskTimerAnomaly: jest.fn(),
}));

describe("taskTimerSession", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("reports a persisted session parse failure and clears the invalid payload", async () => {
    await AsyncStorage.setItem(
      TASK_TIMER_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        taskId: "task-1",
      }),
    );

    await expect(loadPersistedTaskTimerSession()).resolves.toBeNull();

    expect(captureTaskTimerAnomaly).toHaveBeenCalledWith(
      "persisted_session_parse_failed",
      expect.objectContaining({
        storageKey: TASK_TIMER_SESSION_STORAGE_KEY,
      }),
    );
    await expect(
      AsyncStorage.getItem(TASK_TIMER_SESSION_STORAGE_KEY),
    ).resolves.toBeNull();
  });

  it("clears the persisted session storage key", async () => {
    await AsyncStorage.setItem(TASK_TIMER_SESSION_STORAGE_KEY, "{}");

    await clearPersistedTaskTimerSession();

    await expect(
      AsyncStorage.getItem(TASK_TIMER_SESSION_STORAGE_KEY),
    ).resolves.toBeNull();
  });
});
