// 全件削除機能ファイル

import { supabase } from "../../../supabaseClient";
import { Database } from "../../../../types/database";

type MonthlyGoalIdRow = Pick<
  Database["public"]["Tables"]["monthly_goals"]["Row"],
  "id"
>;

type DeleteMonthlyGoalsParams = {
  userId: string;
  month?: number | null;
};

type DeleteByUserParams = {
  userId: string;
};

type GoalDeletionClient = {
  deleteMonthlyGoals: (
    params: DeleteMonthlyGoalsParams
  ) => Promise<{ deletedCount: number }>;
  deleteYearlyGoals: (
    params: DeleteByUserParams
  ) => Promise<{ deletedCount: number }>;
  deleteWeeklyTasks: (
    params: DeleteByUserParams
  ) => Promise<{ deletedCount: number }>;
};

export const deleteMonthlyGoals = async ({
  userId,
  month,
}: DeleteMonthlyGoalsParams) => {
  const filters: Record<string, string | number> = { user_id: userId };
  // 月が指定され引数として渡された場合はそのデータを使用してその月の月間目標データのみを全削除する
  if (month) {
    filters.month = month;
  }
  const { data: monthlyRows, error: selectError } = await supabase
    .from("monthly_goals" as any)
    .select("id")
    .match(filters);
  if (selectError) {
    throw new Error(selectError.message);
  }

  const monthlyIds = ((monthlyRows as unknown as MonthlyGoalIdRow[] | null | undefined) ?? [])
    .map((row) => row.id)
    .filter(Boolean);
  if (monthlyIds.length > 0) {
    const { error: weeklyError } = await supabase
      .from("weekly_tasks")
      .delete()
      .in("monthly_goal_id", monthlyIds);
    if (weeklyError) {
      throw new Error(weeklyError.message);
    }
  }

  // eq()ではなくmatch()を使用することで複数の条件でもフィルターできる(「ユーザ」「指定の月」二つのデータを参照する場合に対応)
  const { error: deleteError } = await supabase
    .from("monthly_goals" as any)
    .delete()
    .match(filters);
  if (deleteError) {
    throw new Error(deleteError.message);
  }
  return { deletedCount: 0 };
};

// 年間目標を全削除
export const deleteYearlyGoals = async ({ userId }: DeleteByUserParams) => {
  const { error: weeklyError } = await supabase
    .from("weekly_tasks")
    .delete()
    .eq("user_id", userId);
  if (weeklyError) {
    throw new Error(weeklyError.message);
  }

  const { error: monthlyError } = await supabase
    .from("monthly_goals" as any)
    .delete()
    .eq("user_id", userId);
  if (monthlyError) {
    throw new Error(monthlyError.message);
  }

  const { error: yearlyError } = await supabase
    .from("yearly_goals" as any)
    .delete()
    .eq("user_id", userId);
  if (yearlyError) {
    throw new Error(yearlyError.message);
  }

  return { deletedCount: 0 };
};

// 週間タスクを全削除
export const deleteWeeklyTasks = async ({ userId }: DeleteByUserParams) => {
  const { error } = await supabase
    .from("weekly_tasks")
    .delete()
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return { deletedCount: 0 };
};

export const goalDeletionClient: GoalDeletionClient = {
  deleteMonthlyGoals,
  deleteYearlyGoals,
  deleteWeeklyTasks,
};
