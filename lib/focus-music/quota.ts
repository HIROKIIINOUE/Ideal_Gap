import { z } from "zod";
import { getAccessStateForUser } from "../subscription";
import { supabase } from "../supabaseClient";
import { getLimitedAccessMode, getUsageLimit } from "../usageLimits";

const FOCUS_MUSIC_RESET_INTERVAL_DAYS = 30;

const FocusMusicDownloadQuotaRowSchema = z.object({
  download_count: z.number().int().nonnegative(),
  reset_at: z.string().datetime({ offset: true }),
  window_started_at: z.string().datetime({ offset: true }),
  plan_snapshot: z.enum(["free", "paid", "friend_free"]),
});

export type FocusMusicDownloadQuotaAccessMode = z.infer<
  typeof FocusMusicDownloadQuotaRowSchema
>["plan_snapshot"];

type FocusMusicDownloadQuotaRow = z.infer<
  typeof FocusMusicDownloadQuotaRowSchema
>;

export type FocusMusicDownloadQuota = {
  accessMode: FocusMusicDownloadQuotaAccessMode;
  limit: number;
  count: number;
  remaining: number;
  resetAt: string | null;
  windowStartedAt: string | null;
};

// 初回ダウンロードから30日後のリセット日を算出
const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

// ユーザの課金状況とDL最大上限数を返す
const resolveFocusMusicQuotaAccess = async (userId: string) => {
  const accessState = await getAccessStateForUser(userId);
  const accessMode = getLimitedAccessMode(accessState.accessMode);
  const limit = getUsageLimit("focusMusicDownloads", accessMode);

  if (limit === null) {
    throw new Error("Focus music download limit is not configured");
  }

  return { accessMode, limit };
};

// focus_music_download_quotasにおいて「行が無ければcount: 0」「reset_atが過去なら新しい30日窓として扱うべき状態に見せる」「DL残り回数(remaining)を計算する」をして、アプリ側で使いやすい quota 状態オブジェクトに整形して返す
const buildQuotaState = ({
  accessMode,
  limit,
  row,
  now,
}: {
  accessMode: FocusMusicDownloadQuotaAccessMode;
  limit: number;
  row: FocusMusicDownloadQuotaRow | null;
  now: Date;
}): FocusMusicDownloadQuota => {
  // 行がない場合は初期値を返す
  if (!row) {
    return {
      accessMode,
      limit,
      count: 0,
      remaining: limit,
      resetAt: null,
      windowStartedAt: null,
    };
  }

  const resetAtTime = Date.parse(row.reset_at);
  if (Number.isNaN(resetAtTime) || resetAtTime <= now.getTime()) {
    return {
      accessMode,
      limit,
      count: 0,
      remaining: limit,
      resetAt: addDays(now, FOCUS_MUSIC_RESET_INTERVAL_DAYS).toISOString(),
      windowStartedAt: now.toISOString(),
    };
  }

  return {
    accessMode,
    limit,
    count: row.download_count,
    remaining: Math.max(limit - row.download_count, 0),
    resetAt: row.reset_at,
    windowStartedAt: row.window_started_at,
  };
};

// エラーメッセージが「ユーザの月間DL上限に達したためのエラー」かどうかをBooleanで判定
const isMonthlyLimitError = (message: string | undefined) =>
  typeof message === "string" &&
  message.toLowerCase().includes("monthly download limit reached");

// ユーザのfocus_music_download_quotas.plan_snapshotとsubscription.statusが異なる場合はDL残数を同期するべきとしてtrueを返す。
const shouldSyncQuotaAccessMode = (
  row: FocusMusicDownloadQuotaRow,
  accessMode: FocusMusicDownloadQuotaAccessMode,
) => row.plan_snapshot !== accessMode;

// アクセスモード(paid or free)の変更に際してquotaの「ユーザDL数」を同期する。(Free -> Paidの時はDL数が0になり、Paid->FREEの場合は既存のDL数が持ち越される)
// ※ 実際のfree or paid判定やデータの同期処理はrpcでDB側で行われる
const syncFocusMusicDownloadQuotaAccess = async ({
  userId,
  accessMode,
}: {
  userId: string;
  accessMode: FocusMusicDownloadQuotaAccessMode;
}) => {
  const { data, error } = await supabase.rpc(
    "sync_focus_music_download_quota_access",
    {
      p_user_id: userId,
      p_plan_snapshot: accessMode,
      p_reset_interval_days: FOCUS_MUSIC_RESET_INTERVAL_DAYS,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const rawRow = Array.isArray(data) ? data[0] : data;
  const parsed = FocusMusicDownloadQuotaRowSchema.safeParse(rawRow);
  if (!parsed.success) {
    throw new Error("Invalid focus music quota row");
  }

  return parsed.data;
};

// userIDと現在時刻を受け取り、そのユーザに紐付くfocus_music_download_quotasが存在するかどうかを確かめ、存在する場合はそのデータを用いて表示・事前判定用の現在状態を用意して返す。focus_music_download_quotasが存在しない場合は「DLをまだしていないもの」として表示・事前判定用の状態を返す
export const loadFocusMusicDownloadQuota = async (
  userId: string,
  now = new Date(),
): Promise<FocusMusicDownloadQuota> => {
  const { accessMode, limit } = await resolveFocusMusicQuotaAccess(userId);
  const { data, error } = await supabase
    .from("focus_music_download_quotas")
    .select("download_count, reset_at, window_started_at, plan_snapshot")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const parsed = data ? FocusMusicDownloadQuotaRowSchema.safeParse(data) : null;
  // データは取得できたがparsed.success=falseの場合はデータが壊れていると判定
  if (parsed && !parsed.success) {
    throw new Error("Invalid focus music quota row");
  }

  // ユーザのsubscription.status と focus_music_download_quotas.plan_snapshotの値が異なる時はquotaを正しいDL数に更新する(Free -> Paidの場合はリセット、Paid -> Freeの場合はDL数を持ち越し)
  const syncedRow =
    parsed?.success && shouldSyncQuotaAccessMode(parsed.data, accessMode)
      ? await syncFocusMusicDownloadQuotaAccess({ userId, accessMode })
      : parsed?.success
        ? parsed.data
        : null;

  return buildQuotaState({
    accessMode,
    limit,
    row: syncedRow,
    now,
  });
};

// DB側(rpc)でfocus_music_download_quotasと連携し「ユーザの月間DLの上限に達していないか」「達成していたらNG,DL可能ならOKを返す」「ダウンロード可能なら最新のfocus_music_download_quotas(月間DL数を+1する)を返す」　※ダウンロード処理は別で実行
// rpc...フロントで叩きDB上で行う関数処理。全て成功か全て失敗のアトミックな処理ができ、RLSと組み合わせることで高いセキュリティも担保できる。
export const consumeFocusMusicDownloadQuota = async (
  userId: string,
  now = new Date(),
): Promise<
  | { ok: true; quota: FocusMusicDownloadQuota }
  | { ok: false; reason: "monthly_limit" }
> => {
  const { accessMode, limit } = await resolveFocusMusicQuotaAccess(userId);
  const { data, error } = await supabase.rpc(
    "increment_focus_music_download_quota",
    {
      p_user_id: userId,
      p_plan_snapshot: accessMode,
      p_increment: 1,
      p_max_downloads: limit,
      p_reset_interval_days: FOCUS_MUSIC_RESET_INTERVAL_DAYS,
    },
  );

  if (error) {
    if (isMonthlyLimitError(error.message)) {
      return { ok: false, reason: "monthly_limit" };
    }
    throw new Error(error.message);
  }

  const rawRow = Array.isArray(data) ? data[0] : data;
  const parsed = FocusMusicDownloadQuotaRowSchema.safeParse(rawRow);
  if (!parsed.success) {
    throw new Error("Invalid focus music quota row");
  }

  return {
    ok: true,
    quota: buildQuotaState({
      accessMode,
      limit,
      row: parsed.data,
      now,
    }),
  };
};
