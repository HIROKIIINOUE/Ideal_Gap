import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import {
  addSentryBreadcrumb,
  captureTaskTimerAnomaly,
} from "./sentry";

export const TASK_TIMER_SESSION_STORAGE_KEY = "task_timer_active_session";

const TASK_TIMER_SESSION_VERSION = 1 as const;
const TASK_TIMER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const persistedTaskTimerSessionSchema = z.object({
  version: z.literal(TASK_TIMER_SESSION_VERSION),
  taskId: z.string().min(1),
  title: z.string().min(1),
  yearlyGoalId: z.string().min(1).nullable(),
  loggedBaseline: z.number().int().min(0),
  inputSeconds: z.number().int().min(0),
  remainingSeconds: z.number().int().min(0),
  expectedEndAt: z.number().int().nullable(),
  completionElapsedSeconds: z.number().int().min(0).nullable(),
  status: z.enum(["running", "paused", "awaiting_completion"]),
  savedAt: z.number().int().nonnegative(),
});

export type PersistedTaskTimerSession = z.infer<
  typeof persistedTaskTimerSessionSchema
>;

const isStalePersistedTaskTimerSession = (
  session: PersistedTaskTimerSession,
) => {
  if (Date.now() - session.savedAt > TASK_TIMER_SESSION_TTL_MS) {
    return true;
  }

  if (session.status === "running" && session.expectedEndAt !== null) {
    return session.expectedEndAt < Date.now() - TASK_TIMER_SESSION_TTL_MS;
  }

  return false;
};

export const savePersistedTaskTimerSession = async (
  session: PersistedTaskTimerSession,
) => {
  addSentryBreadcrumb("task_timer.session", "persisted_session_saved", {
    status: session.status,
    taskId: session.taskId,
  });
  await AsyncStorage.setItem(
    TASK_TIMER_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
};

export const clearPersistedTaskTimerSession = async () => {
  addSentryBreadcrumb("task_timer.session", "persisted_session_cleared", {
    storageKey: TASK_TIMER_SESSION_STORAGE_KEY,
  });
  await AsyncStorage.removeItem(TASK_TIMER_SESSION_STORAGE_KEY);
};

export const loadPersistedTaskTimerSession =
  async (): Promise<PersistedTaskTimerSession | null> => {
    const raw = await AsyncStorage.getItem(TASK_TIMER_SESSION_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = persistedTaskTimerSessionSchema.parse(JSON.parse(raw));
      if (isStalePersistedTaskTimerSession(parsed)) {
        addSentryBreadcrumb("task_timer.session", "persisted_session_stale", {
          status: parsed.status,
          taskId: parsed.taskId,
        });
        await clearPersistedTaskTimerSession();
        return null;
      }
      addSentryBreadcrumb("task_timer.session", "persisted_session_loaded", {
        status: parsed.status,
        taskId: parsed.taskId,
      });
      return parsed;
    } catch {
      captureTaskTimerAnomaly("persisted_session_parse_failed", {
        storageKey: TASK_TIMER_SESSION_STORAGE_KEY,
      });
      await clearPersistedTaskTimerSession();
      return null;
    }
  };
