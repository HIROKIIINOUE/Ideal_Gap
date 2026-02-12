// 「理想の自分」「年間目標」「月間目標」「週間タスク」で共通のSupabase処理をまとめるファイル

import { supabase } from "../../../lib/supabaseClient";
import { Database } from "../../../types/database";

type TableName = keyof Database["public"]["Tables"];

//　ユーザの取得
export const getUserId = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

// 各カードの長押し＋ドラッグで順番を変えた時にSupabaseに反映させる処理
export const reindexOrder = <T extends Record<string, any>>(
  items: T[],
  key: keyof T = "order"
): T[] => items.map((item, idx) => ({ ...item, [key]: idx }));

// upsert処理、onConflictで衝突キーを指定(この衝突キーがDBに既存ならUpdate、存在しなければInsertが実行される)
export const upsertRows = async <T extends Record<string, any>>(
  table: TableName,
  rows: T[],
  onConflict = "id"
) => {
  return supabase.from(table).upsert(rows as any, { onConflict });
};
