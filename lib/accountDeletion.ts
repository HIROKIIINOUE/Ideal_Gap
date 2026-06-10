import { signOutCurrentSession } from "./logout";
import { supabase } from "./supabaseClient";

const DELETE_ACCOUNT_FUNCTION = "delete-account";

type DeleteAccountResponse = {
  deletedAt?: string;
};

// アカウント削除処理はsupabase上のedge function (関数名delete-account)で行う。
// 理由:DBアクセスをセキュアに守るため、処理がサーバで完結するため(中途半端な処理で止まりにくい)
// 1, 削除するアカウントをDBのdeleted_accountsテーブルに追加(既存なら更新)→無料トライアル再利用の予防
//    → ユーザのメアドを(Supabase上のSecretKeyで)ハッシュ化して保存するためプライバシーポリシーは大丈夫
// 2, DBより該当のuser,subscriptionその他全ての紐づくデータを削除
// 3, Supabase Authより該当のユーザ情報を削除
export const deleteCurrentAccount = async () => {
  const { data, error } = await supabase.functions.invoke(
    DELETE_ACCOUNT_FUNCTION,
    {
      method: "POST",
    },
  );

  if (error) {
    throw error;
  }

  await signOutCurrentSession();

  const deletedAt = (data as DeleteAccountResponse | null)?.deletedAt;
  return {
    deletedAt: deletedAt ?? new Date().toISOString(),
  };
};
