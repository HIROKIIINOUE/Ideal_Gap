// 「理想の自分」ページのSupabase処理の切り出し

import { supabase } from "../../../lib/supabaseClient";
import { Database } from "../../../types/database";
import { decryptFieldValue, encryptFieldValue } from "../../security/fieldEncryption";
import { upsertRows } from "./common";

export type IdealSelfRow = Database["public"]["Tables"]["user_ideal"]["Row"];
export type IdealSelfInsert =
  Database["public"]["Tables"]["user_ideal"]["Insert"];
export type IdealSelfUpdate =
  Database["public"]["Tables"]["user_ideal"]["Update"];

const encryptIdealPayload = <T extends IdealSelfInsert | IdealSelfUpdate>(
  payload: T,
): T => ({
  ...payload,
  ...(typeof payload.description === "string"
    ? { description: encryptFieldValue(payload.description) }
    : {}),
});

const decryptIdealRow = <T extends { description: string }>(row: T): T => ({
  ...row,
  description: decryptFieldValue(row.description),
});

export const fetchIdealSelf = async (userId: string) => {
  const response = await supabase
    .from("user_ideal")
    .select("id, description, order, updated_at")
    .eq("user_id", userId)
    .order("order", { ascending: true });
  return {
    ...response,
    data: response.data?.map(decryptIdealRow) ?? response.data,
  };
};

export const insertIdeal = async (payload: IdealSelfInsert) => {
  const response = await supabase
    .from("user_ideal")
    .insert(encryptIdealPayload(payload))
    .select("id, description, order, updated_at")
    .single();
  return {
    ...response,
    data: response.data ? decryptIdealRow(response.data) : response.data,
  };
};

export const updateIdeal = async (id: string, payload: IdealSelfUpdate) => {
  const response = await supabase
    .from("user_ideal")
    .update(encryptIdealPayload(payload))
    .eq("id", id)
    .select("id, description, order, updated_at")
    .single();
  return {
    ...response,
    data: response.data ? decryptIdealRow(response.data) : response.data,
  };
};

export const deleteIdeal = async (id: string) => {
  return supabase.from("user_ideal").delete().eq("id", id);
};

export const upsertIdeals = async (rows: IdealSelfInsert[]) => {
  return upsertRows("user_ideal", rows.map(encryptIdealPayload));
};
