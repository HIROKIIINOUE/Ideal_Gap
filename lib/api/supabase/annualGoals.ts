// 年間目標ページのデータベース処理

import { Database } from "../../../types/database";
import {
  decryptFieldValue,
  decryptNullableFieldValue,
  encryptFieldValue,
  encryptNullableFieldValue,
} from "../../security/fieldEncryption";
import { supabase } from "../../supabaseClient";
import { upsertRows } from "./common";
import { deleteYearlyGoalWithCascade } from "./goals/cascadeDelete";

export type YearlyGoalRow = Database["public"]["Tables"]["yearly_goals"]["Row"];
export type YearlyGoalInsert =
  Database["public"]["Tables"]["yearly_goals"]["Insert"];
export type YearlyGoalUpdate =
  Database["public"]["Tables"]["yearly_goals"]["Update"];

const encryptYearlyGoalPayload = <T extends YearlyGoalInsert | YearlyGoalUpdate>(
  payload: T,
): T => ({
  ...payload,
  ...(typeof payload.description === "string"
    ? { description: encryptFieldValue(payload.description) }
    : {}),
  ...(Object.prototype.hasOwnProperty.call(payload, "yearly_goal_detail")
    ? { yearly_goal_detail: encryptNullableFieldValue(payload.yearly_goal_detail) }
    : {}),
});

const decryptYearlyGoalRow = <T extends { description: string; yearly_goal_detail: string | null }>(
  row: T,
): T => ({
  ...row,
  description: decryptFieldValue(row.description),
  yearly_goal_detail: decryptNullableFieldValue(row.yearly_goal_detail),
});

export const fetchYearlyGoals = async (userId: string) => {
  const response = await supabase
    .from("yearly_goals")
    .select(
      "id, description, year_goal_color, yearly_goal_detail, is_done, accumulated_time_year, order, updated_at"
    )
    .eq("user_id", userId)
    .order("order", { ascending: true });
  return {
    ...response,
    data: response.data?.map(decryptYearlyGoalRow) ?? response.data,
  };
};

export const insertYearlyGoal = async (payload: YearlyGoalInsert) => {
  const response = await supabase
    .from("yearly_goals")
    .insert(encryptYearlyGoalPayload(payload))
    .select(
      "id, description, year_goal_color, yearly_goal_detail, is_done, accumulated_time_year, order, updated_at"
    )
    .single();
  return {
    ...response,
    data: response.data ? decryptYearlyGoalRow(response.data) : response.data,
  };
};

export const updateYearlyGoal = async (
  id: string,
  payload: YearlyGoalUpdate
) => {
  const response = await supabase
    .from("yearly_goals")
    .update(encryptYearlyGoalPayload(payload))
    .eq("id", id)
    .select(
      "id, description, year_goal_color, yearly_goal_detail, is_done, accumulated_time_year, order, updated_at"
    )
    .single();
  return {
    ...response,
    data: response.data ? decryptYearlyGoalRow(response.data) : response.data,
  };
};

export const deleteYearlyGoal = async (id: string) => {
  return deleteYearlyGoalWithCascade(id);
};

export const upsertYearlyGoals = async (rows: YearlyGoalInsert[]) => {
  return upsertRows("yearly_goals", rows.map(encryptYearlyGoalPayload));
};
