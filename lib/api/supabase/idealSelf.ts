// 「理想の自分」ページのSupabase処理の切り出し

import { supabase } from "../../../lib/supabaseClient";
import { Database } from "../../../types/database";
import { upsertRows } from "./common";

export type IdealSelfRow = Database["public"]["Tables"]["user_ideal"]["Row"];
export type IdealSelfInsert =
  Database["public"]["Tables"]["user_ideal"]["Insert"];
export type IdealSelfUpdate =
  Database["public"]["Tables"]["user_ideal"]["Update"];

export const fetchIdealSelf = async (userId: string) => {
  return supabase
    .from("user_ideal")
    .select("id, description, order, updated_at")
    .eq("user_id", userId)
    .order("order", { ascending: true });
};

export const insertIdeal = async (payload: IdealSelfInsert) => {
  return supabase
    .from("user_ideal")
    .insert(payload)
    .select("id, description, order, updated_at")
    .single();
};

export const updateIdeal = async (id: string, payload: IdealSelfUpdate) => {
  return supabase
    .from("user_ideal")
    .update(payload)
    .eq("id", id)
    .select("id, description, order, updated_at")
    .single();
};

export const deleteIdeal = async (id: string) => {
  return supabase.from("user_ideal").delete().eq("id", id);
};

export const upsertIdeals = async (rows: IdealSelfInsert[]) => {
  return upsertRows("user_ideal", rows);
};
