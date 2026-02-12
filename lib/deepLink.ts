type ParsedTokens = {
  accessToken: string;
  refreshToken: string;
  type?: string;
};

type ParseOptions = {
  disallowTypes?: string[];
};

// 標準APIであるURLSearchParams()を使用して、URLの＃以降のクエリ文字列形式 (key=value&key2=value2) を解析する
const parseHashParams = (url: string) => {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const fragment = url.slice(hashIndex + 1);
  return new URLSearchParams(fragment);
};

//　URLの＃以降からトークン(access_tokenとrefresh_token)を抽出するロジック。両方ともが揃ってなければnullを返す。
// access_token: 認証済みユーザであることを示すJWT(APIアクセス時に使う)
// refresh_token: access_token が切れたときに 新しいセッション/トークンを再取得するためのトークン
// どちらのトークンもサイン後のマジックリンク(メール内のURL)クリック時に生成される。
export const parseAuthTokensFromUrl = (
  url: string,
  options: ParseOptions = {},
): ParsedTokens | null => {
  const params = parseHashParams(url);
  if (!params) return null;
  // クエリ文字形式からsession情報(access_tokenとrefresh_token)を取得する
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type") ?? undefined;
  if (!accessToken || !refreshToken) return null;
  if (options.disallowTypes?.includes(type ?? "")) return null;
  return { accessToken, refreshToken, type };
};
