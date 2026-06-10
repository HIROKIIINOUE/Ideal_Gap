import {
  insertYearlyGoal,
  updateYearlyGoal,
  upsertYearlyGoals,
} from "../lib/api/supabase/annualGoals";
import {
  decryptFieldValue,
  decryptNullableFieldValue,
  isEncryptedFieldValue,
} from "../lib/security/fieldEncryption";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("annualGoals API encryption", () => {
  const insertMock = jest.fn();
  const updateMock = jest.fn();
  const upsertMock = jest.fn();
  const eqMock = jest.fn();
  const selectMock = jest.fn();
  const singleMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    singleMock.mockResolvedValue({
      data: {
        id: "goal-1",
        description: "Encrypted title response",
        yearly_goal_detail: "Encrypted detail response",
        year_goal_color: "#1E5EFF",
        is_done: false,
        accumulated_time_year: 0,
        order: 0,
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectMock });
    eqMock.mockReturnValue({ select: selectMock });
    updateMock.mockReturnValue({ eq: eqMock });
    upsertMock.mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      insert: insertMock,
      update: updateMock,
      upsert: upsertMock,
    });
  });

  test("encrypts yearly goal title and detail on insert", async () => {
    await insertYearlyGoal({
      user_id: "user-123",
      description: "Annual title",
      yearly_goal_detail: "Annual detail",
      year_goal_color: "#1E5EFF",
      is_done: false,
      accumulated_time_year: 0,
      order: 0,
    });

    const [payload] = insertMock.mock.calls[0];

    expect(isEncryptedFieldValue(payload.description)).toBe(true);
    expect(decryptFieldValue(payload.description)).toBe("Annual title");
    expect(isEncryptedFieldValue(payload.yearly_goal_detail)).toBe(true);
    expect(decryptNullableFieldValue(payload.yearly_goal_detail)).toBe("Annual detail");
  });

  test("encrypts yearly goal title and detail on update", async () => {
    await updateYearlyGoal("goal-1", {
      description: "Updated annual title",
      yearly_goal_detail: "Updated annual detail",
    });

    const [payload] = updateMock.mock.calls[0];

    expect(isEncryptedFieldValue(payload.description)).toBe(true);
    expect(decryptFieldValue(payload.description)).toBe("Updated annual title");
    expect(isEncryptedFieldValue(payload.yearly_goal_detail)).toBe(true);
    expect(decryptNullableFieldValue(payload.yearly_goal_detail)).toBe("Updated annual detail");
  });

  test("encrypts yearly goal title and detail on upsert", async () => {
    await upsertYearlyGoals([
      {
        id: "goal-1",
        user_id: "user-123",
        description: "Reordered annual title",
        yearly_goal_detail: "Reordered annual detail",
        year_goal_color: "#1E5EFF",
        is_done: false,
        accumulated_time_year: 0,
        order: 0,
      },
    ]);

    const [payload] = upsertMock.mock.calls[0];
    const [row] = payload;

    expect(isEncryptedFieldValue(row.description)).toBe(true);
    expect(decryptFieldValue(row.description)).toBe("Reordered annual title");
    expect(isEncryptedFieldValue(row.yearly_goal_detail)).toBe(true);
    expect(decryptNullableFieldValue(row.yearly_goal_detail)).toBe("Reordered annual detail");
  });
});
