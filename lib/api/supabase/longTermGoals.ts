// 長期目標ページのデータベース処理

import { Database } from "../../../types/database";
import { supabase } from "../../supabaseClient";
import { upsertRows } from "./common";

export type LongTermGoalRow =
  Database["public"]["Tables"]["long_term_goals"]["Row"];
export type LongTermGoalInsert =
  Database["public"]["Tables"]["long_term_goals"]["Insert"];
export type LongTermGoalUpdate =
  Database["public"]["Tables"]["long_term_goals"]["Update"];

export const fetchLongTermGoals = async (userId: string) => {
  return supabase
    .from("long_term_goals")
    .select("id, until_when, description, is_done, order, updated_at")
    .eq("user_id", userId)
    .order("order", { ascending: true });
};

export const insertLongTermGoal = async (payload: LongTermGoalInsert) => {
  return supabase
    .from("long_term_goals")
    .insert(payload)
    .select("id, until_when, description, is_done, order, updated_at")
    .single();
};

export const updateLongTermGoal = async (
  id: string,
  payload: LongTermGoalUpdate,
) => {
  return supabase
    .from("long_term_goals")
    .update(payload)
    .eq("id", id)
    .select("id, until_when, description, is_done, order, updated_at")
    .single();
};

export const deleteLongTermGoal = async (id: string) => {
  return supabase.from("long_term_goals").delete().eq("id", id);
};

export const upsertLongTermGoals = async (rows: LongTermGoalInsert[]) => {
  return upsertRows("long_term_goals", rows);
};

export const fetchCurrentPoint = async (userId: string) => {
  return supabase
    .from("users")
    .select("current_point")
    .eq("id", userId)
    .single();
};

export const updateCurrentPoint = async (
  userId: string,
  currentPoint: string | null,
) => {
  return supabase
    .from("users")
    .update({ current_point: currentPoint })
    .eq("id", userId);
};
