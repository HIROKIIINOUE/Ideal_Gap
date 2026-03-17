import { Database } from "../types/database";

describe("Database types", () => {
  test("includes weekly_tasks table types", () => {
    const row: Database["public"]["Tables"]["weekly_tasks"]["Row"] = {
      id: "weekly-1",
      user_id: "user-1",
      monthly_goal_id: "monthly-1",
      description: "Ship UX fixes",
      next_start_point: "Resume from checklist",
      accumulated_time_week: 90,
      order: 0,
      created_at: null,
      updated_at: null,
    };

    expect(row.description).toBe("Ship UX fixes");
  });
});
