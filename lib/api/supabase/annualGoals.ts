// 年間目標ページのデータベース処理

import { Database } from "../../../types/database";
import { supabase } from "../../supabaseClient";
import { upsertRows } from "./common";
import { deleteYearlyGoalWithCascade } from "./goals/cascadeDelete";

export type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];
export type YearlyGoalInsert =
  Database["public"]["Tables"]["yearly_goals"]["Insert"];
export type YearlyGoalUpdate =
  Database["public"]["Tables"]["yearly_goals"]["Update"];

export const fetchYearlyGoals = async (userId: string) => {
  return supabase
    .from("yearly_goals")
    .select(
      "id, description, year_goal_color, yearly_goal_detail, is_done, accumulated_time_year, order, updated_at"
    )
    .eq("user_id", userId)
    .order("order", { ascending: true });
};

export const insertYearlyGoal = async (payload: YearlyGoalInsert) => {
  return supabase
    .from("yearly_goals")
    .insert(payload)
    .select(
      "id, description, year_goal_color, yearly_goal_detail, is_done, accumulated_time_year, order, updated_at"
    )
    .single();
};

export const updateYearlyGoal = async (
  id: string,
  payload: YearlyGoalUpdate
) => {
  return supabase
    .from("yearly_goals")
    .update(payload)
    .eq("id", id)
    .select(
      "id, description, year_goal_color, yearly_goal_detail, is_done, accumulated_time_year, order, updated_at"
    )
    .single();
};

export const deleteYearlyGoal = async (id: string) => {
  return deleteYearlyGoalWithCascade(id);
};

export const upsertYearlyGoals = async (rows: YearlyGoalInsert[]) => {
  return upsertRows("yearly_goals", rows);
};
