import * as Linking from "expo-linking";

// 渡されたurl文字列を解析　(ホストネームとパスを〇〇/〇〇 という形に整形する)
export const getNormalizedLinkPath = (url: string) => {
  const parsed = Linking.parse(url);
  const host = `${parsed.hostname ?? ""}`.replace(/^\/+|\/+$/g, "");
  const path = `${parsed.path ?? ""}`.replace(/^\/+|\/+$/g, "");
  return [host, path].filter(Boolean).join("/");
};

// メールアドレス変更ページがリンク経由かどうか判断する
export const resolveAuthCallbackTarget = (
  url: string,
): "/profile-update" | "/dashboard?emailUpdated=1" | null => {
  if (getNormalizedLinkPath(url) !== "auth/callback") return null;

  const parsed = Linking.parse(url);
  const next = parsed.queryParams?.next;
  if (next !== "profile-update") return null;

  // メール経由(本人確認リンク経由)の場合はemailUpdated=1
  return parsed.queryParams?.email
    ? "/dashboard?emailUpdated=1"
    : "/profile-update";
};
