import { deleteMonthlyGoalWithWeeklyTasks, deleteYearlyGoalWithCascade } from "../lib/api/supabase/goals/cascadeDelete";
import { deleteMonthlyGoals, deleteYearlyGoals } from "../lib/api/supabase/goals/allItemDelete";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("goal deletion cascade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deleteMonthlyGoalWithWeeklyTasks deletes weekly tasks then monthly goal", async () => {
    const mockEqWeekly = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteWeekly = jest.fn().mockReturnValue({ eq: mockEqWeekly });

    const mockEqMonthly = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteMonthly = jest.fn().mockReturnValue({ eq: mockEqMonthly });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return { delete: mockDeleteWeekly };
      }
      if (table === "monthly_goals") {
        return { delete: mockDeleteMonthly };
      }
      return {};
    });

    await deleteMonthlyGoalWithWeeklyTasks("m1");

    expect(mockDeleteWeekly).toHaveBeenCalledTimes(1);
    expect(mockEqWeekly).toHaveBeenCalledWith("monthly_goal_id", "m1");
    expect(mockDeleteMonthly).toHaveBeenCalledTimes(1);
    expect(mockEqMonthly).toHaveBeenCalledWith("id", "m1");
  });

  test("deleteYearlyGoalWithCascade deletes weekly tasks via monthly ids", async () => {
    const mockEqMonthlySelect = jest.fn().mockResolvedValue({
      data: [{ id: "m1" }, { id: "m2" }],
      error: null,
    });
    const mockSelectMonthly = jest.fn().mockReturnValue({ eq: mockEqMonthlySelect });

    const mockEqMonthlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteMonthly = jest.fn().mockReturnValue({ eq: mockEqMonthlyDelete });

    const mockInWeekly = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteWeekly = jest.fn().mockReturnValue({ in: mockInWeekly });

    const mockEqYearlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteYearly = jest.fn().mockReturnValue({ eq: mockEqYearlyDelete });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "monthly_goals") {
        return { select: mockSelectMonthly, delete: mockDeleteMonthly };
      }
      if (table === "weekly_tasks") {
        return { delete: mockDeleteWeekly };
      }
      if (table === "yearly_goals") {
        return { delete: mockDeleteYearly };
      }
      return {};
    });

    await deleteYearlyGoalWithCascade("y1");

    expect(mockSelectMonthly).toHaveBeenCalledWith("id");
    expect(mockEqMonthlySelect).toHaveBeenCalledWith("yearly_goal_id", "y1");
    expect(mockDeleteWeekly).toHaveBeenCalledTimes(1);
    expect(mockInWeekly).toHaveBeenCalledWith("monthly_goal_id", ["m1", "m2"]);
    expect(mockEqMonthlyDelete).toHaveBeenCalledWith("yearly_goal_id", "y1");
    expect(mockEqYearlyDelete).toHaveBeenCalledWith("id", "y1");
  });

  test("deleteYearlyGoalWithCascade skips weekly delete when no monthly goals", async () => {
    const mockEqMonthlySelect = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelectMonthly = jest.fn().mockReturnValue({ eq: mockEqMonthlySelect });

    const mockEqMonthlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteMonthly = jest.fn().mockReturnValue({ eq: mockEqMonthlyDelete });

    const mockDeleteWeekly = jest.fn();

    const mockEqYearlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteYearly = jest.fn().mockReturnValue({ eq: mockEqYearlyDelete });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "monthly_goals") {
        return { select: mockSelectMonthly, delete: mockDeleteMonthly };
      }
      if (table === "weekly_tasks") {
        return { delete: mockDeleteWeekly };
      }
      if (table === "yearly_goals") {
        return { delete: mockDeleteYearly };
      }
      return {};
    });

    await deleteYearlyGoalWithCascade("y2");

    expect(mockDeleteWeekly).not.toHaveBeenCalled();
    expect(mockEqMonthlyDelete).toHaveBeenCalledWith("yearly_goal_id", "y2");
    expect(mockEqYearlyDelete).toHaveBeenCalledWith("id", "y2");
  });

  test("deleteMonthlyGoals removes weekly tasks for targeted months", async () => {
    const mockMatchMonthlySelect = jest.fn().mockResolvedValue({
      data: [{ id: "m1" }, { id: "m2" }],
      error: null,
    });
    const mockSelectMonthly = jest.fn().mockReturnValue({ match: mockMatchMonthlySelect });

    const mockInWeekly = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteWeekly = jest.fn().mockReturnValue({ in: mockInWeekly });

    const mockMatchMonthlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteMonthly = jest.fn().mockReturnValue({ match: mockMatchMonthlyDelete });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "monthly_goals") {
        return { select: mockSelectMonthly, delete: mockDeleteMonthly };
      }
      if (table === "weekly_tasks") {
        return { delete: mockDeleteWeekly };
      }
      return {};
    });

    await deleteMonthlyGoals({ userId: "user-1", month: 4 });

    expect(mockSelectMonthly).toHaveBeenCalledWith("id");
    expect(mockMatchMonthlySelect).toHaveBeenCalledWith({ user_id: "user-1", month: 4 });
    expect(mockInWeekly).toHaveBeenCalledWith("monthly_goal_id", ["m1", "m2"]);
    expect(mockMatchMonthlyDelete).toHaveBeenCalledWith({ user_id: "user-1", month: 4 });
  });

  test("deleteYearlyGoals removes weekly tasks, monthly goals, and yearly goals for user", async () => {
    const mockEqWeeklyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteWeekly = jest.fn().mockReturnValue({ eq: mockEqWeeklyDelete });

    const mockEqMonthlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteMonthly = jest.fn().mockReturnValue({ eq: mockEqMonthlyDelete });

    const mockEqYearlyDelete = jest.fn().mockResolvedValue({ error: null });
    const mockDeleteYearly = jest.fn().mockReturnValue({ eq: mockEqYearlyDelete });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "weekly_tasks") {
        return { delete: mockDeleteWeekly };
      }
      if (table === "monthly_goals") {
        return { delete: mockDeleteMonthly };
      }
      if (table === "yearly_goals") {
        return { delete: mockDeleteYearly };
      }
      return {};
    });

    await deleteYearlyGoals({ userId: "user-1" });

    expect(mockEqWeeklyDelete).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockEqMonthlyDelete).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockEqYearlyDelete).toHaveBeenCalledWith("user_id", "user-1");
  });
});
