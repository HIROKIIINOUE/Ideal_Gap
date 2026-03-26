// 年間目標の削除処理時、紐づく週間タスクを先に削除(cascade deletion)してから該当の年間目標削除処理を実行させる

import { supabase } from "../../../supabaseClient";

// 今後月間目標機能を復活させる時用に念の為月間目標-週間タスクのcascade削除機能の枠のみ残す(現在はどこにも使用していない)
export const deleteMonthlyGoalWithWeeklyTasks = async (
  monthlyGoalId: string,
) => {
  const { error: monthlyError } = await supabase
    .from("monthly_goals")
    .delete()
    .eq("id", monthlyGoalId);
  if (monthlyError) {
    throw new Error(monthlyError.message);
  }

  return { deletedCount: 0 };
};

// 年間ゴールを削除するときに紐づく週間タスクを先に削除してから年間ゴールを削除する処理
export const deleteYearlyGoalWithCascade = async (yearlyGoalId: string) => {
  const { error: weeklyError } = await supabase
    .from("weekly_tasks")
    .delete()
    .eq("yearly_goal_id", yearlyGoalId);
  if (weeklyError) {
    throw new Error(weeklyError.message);
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
