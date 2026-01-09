// 全件削除機能ファイル

import { supabase } from "../../../supabaseClient";

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
  // eq()ではなくmatch()を使用することで複数の条件でもフィルターできる(「ユーザ」「指定の月」二つのデータを参照する場合に対応)
  const { error } = await supabase
    .from("monthly_goals" as any)
    .delete()
    .match(filters);
  if (error) {
    throw new Error(error.message);
  }
  return { deletedCount: 0 };
};

// 年間目標を全削除
export const deleteYearlyGoals = async ({ userId }: DeleteByUserParams) => {
  const { error } = await supabase
    .from("yearly_goals" as any)
    .delete()
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return { deletedCount: 0 };
};

// 週間タスクを全削除
export const deleteWeeklyTasks = async ({ userId }: DeleteByUserParams) => {
  const { error } = await supabase
    .from("weekly_tasks" as any)
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
