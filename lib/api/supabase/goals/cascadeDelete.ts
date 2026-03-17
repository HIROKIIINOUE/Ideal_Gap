// 年間ゴール、月間ゴールの削除処理
// ユーザが年間ゴール削除を実行した時は紐づく月間ゴールと週間タスクが、
// 月間ゴール削除を実行した時は日もづく週間タスクが同時に削除されるようになっている。

import { Database } from "../../../../types/database";
import { supabase } from "../../../supabaseClient";

type MonthlyGoalIdRow = Pick<
  Database["public"]["Tables"]["monthly_goals"]["Row"],
  "id"
>;

const toMonthlyIds = (rows: MonthlyGoalIdRow[] | null | undefined) =>
  (rows ?? []).map((row) => row.id).filter((id) => Boolean(id));

// 月間ゴールを削除する時に紐づく週間タスクを同時に削除する処理
// 先に子データの紐づく週間タスクを削除してから月間データを削除する
export const deleteMonthlyGoalWithWeeklyTasks = async (
  monthlyGoalId: string,
) => {
  const { error: weeklyError } = await supabase
    .from("weekly_tasks")
    .delete()
    .eq("monthly_goal_id", monthlyGoalId);
  if (weeklyError) {
    throw new Error(weeklyError.message);
  }

  const { error: monthlyError } = await supabase
    .from("monthly_goals")
    .delete()
    .eq("id", monthlyGoalId);
  if (monthlyError) {
    throw new Error(monthlyError.message);
  }

  return { deletedCount: 0 };
};

// 年間ゴールを削除するときに紐づく月間ゴール、週間タスクを同時に削除する処理
export const deleteYearlyGoalWithCascade = async (yearlyGoalId: string) => {
  const { data: monthlyRows, error: monthlySelectError } = await supabase
    .from("monthly_goals")
    .select("id")
    .eq("yearly_goal_id", yearlyGoalId);
  if (monthlySelectError) {
    throw new Error(monthlySelectError.message);
  }

  const monthlyIds = toMonthlyIds(
    monthlyRows as MonthlyGoalIdRow[] | null | undefined,
  );

  if (monthlyIds.length > 0) {
    const { error: weeklyError } = await supabase
      .from("weekly_tasks")
      .delete()
      .in("monthly_goal_id", monthlyIds);
    if (weeklyError) {
      throw new Error(weeklyError.message);
    }
  }

  const { error: monthlyDeleteError } = await supabase
    .from("monthly_goals")
    .delete()
    .eq("yearly_goal_id", yearlyGoalId);
  if (monthlyDeleteError) {
    throw new Error(monthlyDeleteError.message);
  }

  const { error: yearlyDeleteError } = await supabase
    .from("yearly_goals")
    .delete()
    .eq("id", yearlyGoalId);
  if (yearlyDeleteError) {
    throw new Error(yearlyDeleteError.message);
  }

  return { deletedCount: 0 };
};
