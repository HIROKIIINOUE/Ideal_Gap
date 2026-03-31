// 作業実績の手打ち入力、もしくは作業タイマーからインプットされる最新のデータをもとに、
// 該当の週間タスクと紐づく年間目標の作業実績時間データを更新する機能

import { Database } from "../../../../types/database";
import { supabase } from "../../../supabaseClient";

type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];
type WeeklyTaskUpdate = Database["public"]["Tables"]["weekly_tasks"]["Update"];

// 呼び出した場所から渡されたプロップス、新しい作業データの実績を含むデータの型
export type UpdateAccumulatedTimesParams = {
  userId: string;
  taskId: string;
  yearlyGoalId?: string | null;
  newLoggedMinutes: number;
  previousLoggedMinutes: number;
  nextStartPoint?: string | null;
};

type YearlyGoalInfo = { accumulated: number } | null;

export type TimeTrackingClient = {
  updateWeeklyLogged: (args: {
    taskId: string;
    userId: string;
    newLoggedMinutes: number;
    nextStartPoint?: string | null;
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

// 各データベース処理をパッケージ化したもの(オブジェクト形式)
const supabaseTimeTrackingClient: TimeTrackingClient = {
  async updateWeeklyLogged({
    taskId,
    userId,
    newLoggedMinutes,
    nextStartPoint,
  }) {
    const payload: WeeklyTaskUpdate = {
      accumulated_time_week: newLoggedMinutes,
    };
    if (typeof nextStartPoint !== "undefined") {
      payload.next_start_point = nextStartPoint ?? null;
    }
    const { error } = await supabase
      .from("weekly_tasks")
      .update(payload)
      .match({ id: taskId, user_id: userId });

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

// 手動記録やタイマー記録で発生した時間差分を週間・年間目標に反映する。
// クライアント計算で差分だけを加算/減算する最小実装。
export const updateAccumulatedTimes = async (
  params: UpdateAccumulatedTimesParams,
  client: TimeTrackingClient = supabaseTimeTrackingClient,
): Promise<UpdateAccumulatedTimesResult> => {
  const {
    userId,
    taskId,
    yearlyGoalId,
    newLoggedMinutes,
    previousLoggedMinutes,
    nextStartPoint,
  } = params;

  const safeNew = Math.max(0, Math.round(newLoggedMinutes));
  const safePrev = Math.max(0, Math.round(previousLoggedMinutes));
  const delta = safeNew - safePrev;

  // 値が変わらない場合は何も更新しない
  const shouldPersistWeekly =
    delta !== 0 || typeof nextStartPoint !== "undefined";

  if (shouldPersistWeekly) {
    // 週間タスクの作業実績データをDB上で更新
    await client.updateWeeklyLogged({
      taskId,
      userId,
      newLoggedMinutes: safeNew,
      nextStartPoint,
    });
  }

  if (delta === 0) {
    return { delta, newLoggedMinutes: safeNew };
  }

  if (!yearlyGoalId) {
    return { delta, newLoggedMinutes: safeNew };
  }

  // 作業が終わった週間タスクに紐づく年間目標が存在する場合、該当年間目標の積み上げ時間をDB上で更新
  const yearly = await client.getYearlyGoal({
    yearlyGoalId,
    userId,
  });

  if (yearly) {
    const yearlyNew = Math.max(0, yearly.accumulated + delta);
    await client.updateYearlyLogged({
      yearlyGoalId,
      userId,
      newAccumulated: yearlyNew,
    });
  }

  return { delta, newLoggedMinutes: safeNew };
};
