// ⭐️⭐️⭐️現在の仕様では「長期目標機能」を取り除いたため、本コードは一切使用されていない。
// ⭐️⭐️⭐️今後長期目標機能復活の可能性が0ではないので残している
// ⭐️⭐️⭐️テストなどの関連コードと紐づくため、エラーが起きないように月間目標のようにコメントアウトはしていない。
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
