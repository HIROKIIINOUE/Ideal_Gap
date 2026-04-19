import type { TimeTrackingClient } from "../lib/api/supabase/timeTracking/updateAccumulatedTimes";

const ensureTestEnv = () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key";
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV =
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV ?? "test-revenuecat-key";
};

let updateAccumulatedTimes: typeof import("../lib/api/supabase/timeTracking/updateAccumulatedTimes").updateAccumulatedTimes;

beforeAll(async () => {
  ensureTestEnv();
  jest.isolateModules(() => {
    ({ updateAccumulatedTimes } = require("../lib/api/supabase/timeTracking/updateAccumulatedTimes"));
  });
});

const createMockClient = ({
  yearlyAccumulated = 600,
}: {
  yearlyAccumulated?: number;
} = {}) => {
  let weeklyLogged = 0;
  let yearlyStored = yearlyAccumulated;

  const client: TimeTrackingClient = {
    updateWeeklyLogged: jest.fn(async ({ newLoggedMinutes, nextStartPoint }) => {
      weeklyLogged = newLoggedMinutes;
      if (typeof nextStartPoint !== "undefined") {
        // no-op for now, just ensure value passes through
      }
    }),
    getYearlyGoal: jest.fn(async () => ({ accumulated: yearlyStored })),
    updateYearlyLogged: jest.fn(async ({ newAccumulated }) => {
      yearlyStored = newAccumulated;
    }),
  };

  return {
    client,
    getState: () => ({
      weeklyLogged,
      yearlyStored,
    }),
  };
};

describe("updateAccumulatedTimes", () => {
  it("updates weekly and yearly accumulations by delta", async () => {
    const { client, getState } = createMockClient({
      yearlyAccumulated: 600,
    });

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        newLoggedMinutes: 90,
        previousLoggedMinutes: 30,
      },
      client,
    );

    expect(result).toEqual({ delta: 60, newLoggedMinutes: 90 });
    expect(client.updateWeeklyLogged).toHaveBeenCalledTimes(1);
    expect(client.updateYearlyLogged).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual({
      weeklyLogged: 90,
      yearlyStored: 660,
    });
  });

  it("clamps yearly accumulated time at zero when delta is negative", async () => {
    const { client, getState } = createMockClient({
      yearlyAccumulated: 30,
    });

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        newLoggedMinutes: 10,
        previousLoggedMinutes: 50,
      },
      client,
    );

    expect(result).toEqual({ delta: -40, newLoggedMinutes: 10 });
    expect(getState()).toEqual({
      weeklyLogged: 10,
      yearlyStored: 0,
    });
  });

  it("skips all updates when there is no change", async () => {
    const { client, getState } = createMockClient();

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        newLoggedMinutes: 40,
        previousLoggedMinutes: 40,
      },
      client,
    );

    expect(result).toEqual({ delta: 0, newLoggedMinutes: 40 });
    expect(client.updateWeeklyLogged).not.toHaveBeenCalled();
    expect(client.updateYearlyLogged).not.toHaveBeenCalled();
    expect(getState()).toEqual({
      weeklyLogged: 0,
      yearlyStored: 600,
    });
  });

  it("updates only weekly task when delta is zero but nextStartPoint is provided", async () => {
    const { client, getState } = createMockClient();

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        newLoggedMinutes: 40,
        previousLoggedMinutes: 40,
        nextStartPoint: "Resume from chapter 2",
      },
      client,
    );

    expect(result).toEqual({ delta: 0, newLoggedMinutes: 40 });
    expect(client.updateWeeklyLogged).toHaveBeenCalledTimes(1);
    expect(client.updateYearlyLogged).not.toHaveBeenCalled();
    expect(getState()).toEqual({
      weeklyLogged: 40,
      yearlyStored: 600,
    });
  });

  it("updates only weekly task when there is no linked yearly goal", async () => {
    const { client, getState } = createMockClient();

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: null,
        newLoggedMinutes: 55,
        previousLoggedMinutes: 25,
      },
      client,
    );

    expect(result).toEqual({ delta: 30, newLoggedMinutes: 55 });
    expect(client.updateWeeklyLogged).toHaveBeenCalledTimes(1);
    expect(client.getYearlyGoal).not.toHaveBeenCalled();
    expect(client.updateYearlyLogged).not.toHaveBeenCalled();
    expect(getState()).toEqual({
      weeklyLogged: 55,
      yearlyStored: 600,
    });
  });

  it("rejects instead of hanging when weekly task update never resolves", async () => {
    jest.useFakeTimers();
    const hangingClient: TimeTrackingClient = {
      updateWeeklyLogged: jest.fn(() => new Promise<void>(() => {})),
      getYearlyGoal: jest.fn(async () => ({ accumulated: 600 })),
      updateYearlyLogged: jest.fn(async () => {}),
    };

    const promise = updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        newLoggedMinutes: 90,
        previousLoggedMinutes: 30,
      },
      hangingClient,
    );

    try {
      const assertion = expect(promise).rejects.toThrow(
        "Time tracking request timed out",
      );
      await jest.advanceTimersByTimeAsync(15_000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects instead of hanging when yearly goal fetch never resolves", async () => {
    jest.useFakeTimers();
    const hangingClient: TimeTrackingClient = {
      updateWeeklyLogged: jest.fn(async () => {}),
      getYearlyGoal: jest.fn(() => new Promise(() => {})),
      updateYearlyLogged: jest.fn(async () => {}),
    };

    const promise = updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        yearlyGoalId: "year-1",
        newLoggedMinutes: 90,
        previousLoggedMinutes: 30,
      },
      hangingClient,
    );

    try {
      const assertion = expect(promise).rejects.toThrow(
        "Time tracking request timed out",
      );
      await jest.advanceTimersByTimeAsync(15_000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});
