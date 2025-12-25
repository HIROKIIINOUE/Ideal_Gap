// 作業実績の手打ち入力と作業タイマー両方からインプットされる最新のデータをもとに、
// 該当の週間タスク、紐づく月間目標と年間目標の作業実績時間データを更新する機能

import { Database } from "../../types/database";
import { supabase } from "../supabaseClient";

type MonthlyGoalRow = Database["public"]["Tables"]["monthly_goals"]["Row"];
type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];

// 呼び出した場所から渡されたプロップス、新しい作業データの実績を含むデータの型
export type UpdateAccumulatedTimesParams = {
  userId: string;
  taskId: string;
  monthlyGoalId?: string | null;
  newLoggedMinutes: number;
  previousLoggedMinutes: number;
};

type MonthlyGoalInfo = {
  accumulated: number;
  yearlyGoalId: string | null;
} | null;
type YearlyGoalInfo = { accumulated: number } | null;

export type TimeTrackingClient = {
  updateWeeklyLogged: (args: {
    taskId: string;
    userId: string;
    newLoggedMinutes: number;
  }) => Promise<void>;
  getMonthlyGoal: (args: {
    monthlyGoalId: string;
    userId: string;
  }) => Promise<MonthlyGoalInfo>;
  updateMonthlyLogged: (args: {
    monthlyGoalId: string;
    userId: string;
    newAccumulated: number;
  }) => Promise<void>;
  getYearlyGoal: (args: {
    yearlyGoalId: string;
    userId: string;
  }) => Promise<YearlyGoalInfo>;
  updateYearlyLogged: (args: {
    yearlyGoalId: string;
    userId: string;
    newAccumulated: number;
  }) => Promise<void>;
};

// 各データベース処理をパッケージ化したもの
const supabaseTimeTrackingClient: TimeTrackingClient = {
  async updateWeeklyLogged({ taskId, userId, newLoggedMinutes }) {
    const { error } = await supabase
      .from("weekly_tasks" as any)
      .update({ accumulated_time_week: newLoggedMinutes })
      .match({ id: taskId, user_id: userId });

    if (error) {
      throw new Error(error.message);
    }
  },

  async getMonthlyGoal({ monthlyGoalId, userId }) {
    const { data, error } = await supabase
      .from("monthly_goals")
      .select("accumulated_time_month, yearly_goal_id")
      .match({ id: monthlyGoalId, user_id: userId })
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) return null;
    const row = data as MonthlyGoalRow;
    return {
      accumulated: row.accumulated_time_month ?? 0,
      yearlyGoalId: row.yearly_goal_id ?? null,
    };
  },

  async updateMonthlyLogged({ monthlyGoalId, userId, newAccumulated }) {
    const { error } = await supabase
      .from("monthly_goals")
      .update({ accumulated_time_month: newAccumulated })
      .match({ id: monthlyGoalId, user_id: userId });

    if (error) {
      throw new Error(error.message);
    }
  },

  async getYearlyGoal({ yearlyGoalId, userId }) {
    const { data, error } = await supabase
      .from("yearly_goals")
      .select("accumulated_time_year")
      .match({ id: yearlyGoalId, user_id: userId })
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) return null;
    const row = data as YearlyGoalRow;
    return {
      accumulated: row.accumulated_time_year ?? 0,
    };
  },

  async updateYearlyLogged({ yearlyGoalId, userId, newAccumulated }) {
    const { error } = await supabase
      .from("yearly_goals")
      .update({ accumulated_time_year: newAccumulated })
      .match({ id: yearlyGoalId, user_id: userId });

    if (error) {
      throw new Error(error.message);
    }
  },
};

export type UpdateAccumulatedTimesResult = {
  delta: number;
  newLoggedMinutes: number;
};

// 手動記録やタイマー記録で発生した時間差分を週間・月間・年間目標に反映する。
// クライアント計算で差分だけを加算/減算する最小実装。
export const updateAccumulatedTimes = async (
  params: UpdateAccumulatedTimesParams, //オブジェクトを一つ受け取りあとで分割代入
  client: TimeTrackingClient = supabaseTimeTrackingClient //テスト用にデフォルト引数でclientを定義
): Promise<UpdateAccumulatedTimesResult> => {
  const {
    userId,
    taskId,
    monthlyGoalId,
    newLoggedMinutes,
    previousLoggedMinutes,
  } = params;

  const safeNew = Math.max(0, Math.round(newLoggedMinutes));
  const safePrev = Math.max(0, Math.round(previousLoggedMinutes));
  const delta = safeNew - safePrev;

  // 値が変わらない場合は何も更新しない
  if (delta === 0) {
    return { delta, newLoggedMinutes: safeNew };
  }

  // 週間タスクの作業実績データをDB上で更新
  await client.updateWeeklyLogged({
    taskId,
    userId,
    newLoggedMinutes: safeNew,
  });

  if (!monthlyGoalId) {
    return { delta, newLoggedMinutes: safeNew };
  }
  // 渡された週間タスクデータ内のMonthIDをもとに紐づく月間目標を取得
  const monthly = await client.getMonthlyGoal({ monthlyGoalId, userId });
  if (!monthly) {
    throw new Error("Monthly goal not found");
  }
  // 取得した紐づく月間目標の「作業実績数値」に今回の週間タスクにおける(新)作業時間と(旧)作業時間の差分を追加
  const monthlyNew = Math.max(0, monthly.accumulated + delta);
  await client.updateMonthlyLogged({
    monthlyGoalId,
    userId,
    newAccumulated: monthlyNew,
  });

  if (!monthly.yearlyGoalId) {
    return { delta, newLoggedMinutes: safeNew };
  }

  // 上で取得した月間目標ないのYearIDから紐づく年間目標を取得
  const yearly = await client.getYearlyGoal({
    yearlyGoalId: monthly.yearlyGoalId,
    userId,
  });

  // 同様に年間目標の「作業実績数値」に今回の週間タスクにおける(新)作業時間と(旧)作業時間の差分を追加
  if (yearly) {
    const yearlyNew = Math.max(0, yearly.accumulated + delta);
    await client.updateYearlyLogged({
      yearlyGoalId: monthly.yearlyGoalId,
      userId,
      newAccumulated: yearlyNew,
    });
  }

  return { delta, newLoggedMinutes: safeNew };
};
