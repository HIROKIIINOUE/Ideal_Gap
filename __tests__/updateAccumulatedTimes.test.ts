import type { TimeTrackingClient } from "../lib/timeTracking/updateAccumulatedTimes";

const ensureTestEnv = () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key";
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV =
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV ?? "test-revenuecat-key";
};

let updateAccumulatedTimes: typeof import("../lib/timeTracking/updateAccumulatedTimes").updateAccumulatedTimes;

beforeAll(async () => {
  ensureTestEnv();
  jest.isolateModules(() => {
    ({ updateAccumulatedTimes } = require("../lib/timeTracking/updateAccumulatedTimes"));
  });
});

const createMockClient = ({
  monthlyAccumulated = 120,
  yearlyAccumulated = 600,
  yearlyGoalId = "year-1",
}: {
  monthlyAccumulated?: number;
  yearlyAccumulated?: number;
  yearlyGoalId?: string | null;
} = {}) => {
  let weeklyLogged = 0;
  let monthlyStored = monthlyAccumulated;
  let yearlyStored = yearlyAccumulated;

  const client: TimeTrackingClient = {
    updateWeeklyLogged: jest.fn(async ({ newLoggedMinutes, nextStartPoint }) => {
      weeklyLogged = newLoggedMinutes;
      if (typeof nextStartPoint !== "undefined") {
        // no-op for now, just ensure value passes through
      }
    }),
    getMonthlyGoal: jest.fn(async () => ({ accumulated: monthlyStored, yearlyGoalId })),
    updateMonthlyLogged: jest.fn(async ({ newAccumulated }) => {
      monthlyStored = newAccumulated;
    }),
    getYearlyGoal: jest.fn(async () => (yearlyGoalId ? { accumulated: yearlyStored } : null)),
    updateYearlyLogged: jest.fn(async ({ newAccumulated }) => {
      yearlyStored = newAccumulated;
    }),
  };

  return {
    client,
    getState: () => ({
      weeklyLogged,
      monthlyStored,
      yearlyStored,
    }),
  };
};

describe("updateAccumulatedTimes", () => {
  it("updates weekly, monthly, yearly accumulations by delta", async () => {
    const { client, getState } = createMockClient({
      monthlyAccumulated: 120,
      yearlyAccumulated: 600,
    });

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        monthlyGoalId: "month-1",
        newLoggedMinutes: 90,
        previousLoggedMinutes: 30,
      },
      client,
    );

    expect(result).toEqual({ delta: 60, newLoggedMinutes: 90 });
    expect(client.updateWeeklyLogged).toHaveBeenCalledTimes(1);
    expect(client.updateMonthlyLogged).toHaveBeenCalledTimes(1);
    expect(client.updateYearlyLogged).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual({
      weeklyLogged: 90,
      monthlyStored: 180,
      yearlyStored: 660,
    });
  });

  it("clamps accumulated times at zero when delta is negative", async () => {
    const { client, getState } = createMockClient({
      monthlyAccumulated: 20,
      yearlyAccumulated: 30,
    });

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        monthlyGoalId: "month-1",
        newLoggedMinutes: 10,
        previousLoggedMinutes: 50,
      },
      client,
    );

    expect(result).toEqual({ delta: -40, newLoggedMinutes: 10 });
    expect(getState()).toEqual({
      weeklyLogged: 10,
      monthlyStored: 0,
      yearlyStored: 0,
    });
  });

  it("skips all updates when there is no change", async () => {
    const { client, getState } = createMockClient();

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        monthlyGoalId: "month-1",
        newLoggedMinutes: 40,
        previousLoggedMinutes: 40,
      },
      client,
    );

    expect(result).toEqual({ delta: 0, newLoggedMinutes: 40 });
    expect(client.updateWeeklyLogged).not.toHaveBeenCalled();
    expect(client.updateMonthlyLogged).not.toHaveBeenCalled();
    expect(client.updateYearlyLogged).not.toHaveBeenCalled();
    expect(getState()).toEqual({
      weeklyLogged: 0,
      monthlyStored: 120,
      yearlyStored: 600,
    });
  });

  it("updates only weekly task when delta is zero but nextStartPoint is provided", async () => {
    const { client, getState } = createMockClient();

    const result = await updateAccumulatedTimes(
      {
        userId: "user-1",
        taskId: "task-1",
        monthlyGoalId: "month-1",
        newLoggedMinutes: 40,
        previousLoggedMinutes: 40,
        nextStartPoint: "Resume from chapter 2",
      },
      client,
    );

    expect(result).toEqual({ delta: 0, newLoggedMinutes: 40 });
    expect(client.updateWeeklyLogged).toHaveBeenCalledTimes(1);
    expect(client.updateMonthlyLogged).not.toHaveBeenCalled();
    expect(client.updateYearlyLogged).not.toHaveBeenCalled();
    expect(getState()).toEqual({
      weeklyLogged: 40,
      monthlyStored: 120,
      yearlyStored: 600,
    });
  });
});
