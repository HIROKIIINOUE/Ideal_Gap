import { getTaskTimerRestorePolicy } from "../lib/taskTimerRestorePolicy";
import type { PersistedTaskTimerSession } from "../lib/taskTimerSession";

const makePersisted = (
  overrides: Partial<PersistedTaskTimerSession>,
): PersistedTaskTimerSession => ({
  version: 1,
  source: "weekly_tasks",
  taskId: "task-1",
  title: "Task 1",
  yearlyGoalId: null,
  loggedBaseline: 0,
  inputSeconds: 1500,
  remainingSeconds: 1200,
  expectedEndAt: null,
  completionElapsedSeconds: null,
  status: "paused",
  savedAt: Date.now(),
  ...overrides,
});

describe("getTaskTimerRestorePolicy", () => {
  test("linked entry restores only when taskId matches", () => {
    const persisted = makePersisted({ taskId: "task-1" });
    expect(
      getTaskTimerRestorePolicy({ source: "weekly_tasks", taskId: "task-1" }, persisted),
    ).toEqual({ shouldRestore: true, shouldClearPersisted: false });

    expect(
      getTaskTimerRestorePolicy({ source: "weekly_tasks", taskId: "task-2" }, persisted),
    ).toEqual({ shouldRestore: false, shouldClearPersisted: true });
  });

  test("unlinked dashboard entry restores only when persisted is unlinked", () => {
    const linkedPersisted = makePersisted({ source: "weekly_tasks", taskId: "task-1" });
    expect(
      getTaskTimerRestorePolicy({ source: "dashboard" }, linkedPersisted),
    ).toEqual({ shouldRestore: false, shouldClearPersisted: true });

    const unlinkedPersisted = makePersisted({
      source: "dashboard",
      taskId: null,
      title: "Unlinked timer",
    });
    expect(
      getTaskTimerRestorePolicy({ source: "dashboard" }, unlinkedPersisted),
    ).toEqual({ shouldRestore: true, shouldClearPersisted: false });
  });

  test("entry without params keeps legacy restore behavior", () => {
    const persisted = makePersisted({ taskId: "task-1" });
    expect(getTaskTimerRestorePolicy({}, persisted)).toEqual({
      shouldRestore: true,
      shouldClearPersisted: false,
    });
  });
});

