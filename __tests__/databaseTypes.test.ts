import { Database } from "../types/database";

describe("Database types", () => {
  test("includes users base profile fields without deprecated fields", () => {
    const row: Database["public"]["Tables"]["users"]["Row"] = {
      id: "user-1",
      email: "hiroki@example.com",
      name: "Hiroki",
      language: "ja",
      had_account_before: false,
      is_canceled: false,
      created_at: null,
      updated_at: null,
    };

    expect(row.email).toBe("hiroki@example.com");
  });

  test("includes long_term_goals table types", () => {
    const row: Database["public"]["Tables"]["long_term_goals"]["Row"] = {
      id: "long-1",
      user_id: "user-1",
      until_when: "32歳までに",
      description: "IELTS 8.0以上",
      is_done: false,
      order: 0,
      created_at: null,
      updated_at: null,
    };

    expect(row.until_when).toBe("32歳までに");
  });

  test("includes weekly_tasks table types", () => {
    const row: Database["public"]["Tables"]["weekly_tasks"]["Row"] = {
      id: "weekly-1",
      user_id: "user-1",
      yearly_goal_id: "yearly-1",
      description: "Ship UX fixes",
      is_done: false,
      next_start_point: "Resume from checklist",
      accumulated_time_week: 90,
      order: 0,
      created_at: null,
      updated_at: null,
    };

    expect(row.description).toBe("Ship UX fixes");
  });

  test("includes access_overrides table types", () => {
    const row: Database["public"]["Tables"]["access_overrides"]["Row"] = {
      id: "override-1",
      user_id: "user-1",
      access_type: "friend_free",
      starts_at: "2026-04-24T00:00:00.000Z",
      ends_at: null,
      is_active: true,
      note: "friend beta access",
      created_at: null,
      updated_at: null,
    };

    expect(row.access_type).toBe("friend_free");
  });
});
