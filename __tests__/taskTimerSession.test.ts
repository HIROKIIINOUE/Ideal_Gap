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

  it("clears a persisted session when it is older than 24 hours", async () => {
    const now = 1_000_000_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    await AsyncStorage.setItem(
      TASK_TIMER_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        taskId: "task-1",
        title: "Write report",
        yearlyGoalId: "year-1",
        loggedBaseline: 25,
        inputSeconds: 300,
        remainingSeconds: 120,
        expectedEndAt: null,
        completionElapsedSeconds: null,
        status: "paused",
        savedAt: now - 24 * 60 * 60 * 1000 - 1,
      }),
    );

    try {
      await expect(loadPersistedTaskTimerSession()).resolves.toBeNull();
      await expect(
        AsyncStorage.getItem(TASK_TIMER_SESSION_STORAGE_KEY),
      ).resolves.toBeNull();
    } finally {
      dateNowSpy.mockRestore();
    }
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
