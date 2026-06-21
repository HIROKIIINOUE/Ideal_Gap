import type { PersistedTaskTimerSession } from "./taskTimerSession";

export type TaskTimerEntrySource = "weekly_tasks" | "dashboard";

export type TaskTimerEntryParams = {
  source?: TaskTimerEntrySource;
  taskId?: string;
};

type RestorePolicyResult = {
  shouldRestore: boolean;
  shouldClearPersisted: boolean;
};

/**
 * 「/task-timer に入った時に、既存の persisted session を復元すべきか / 破棄すべきか」
 * を UI から切り離して判定するためのポリシー。
 *
 * 要件:
 * - タスク紐づきで入った場合: taskId が一致する時だけ復元
 * - ダッシュボード直通で入った場合: 既存セッションがあればそのまま復元
 * - ダッシュボード直通で既存セッションがなければ、未紐づきタイマーとして新規開始できる
 */
export const getTaskTimerRestorePolicy = (
  params: TaskTimerEntryParams,
  persisted: PersistedTaskTimerSession | null,
): RestorePolicyResult => {
  if (!persisted) {
    return { shouldRestore: false, shouldClearPersisted: false };
  }

  // ダッシュボード直通時は、既存セッションがあれば紐づき有無を問わずそのまま復元する
  if (params.source === "dashboard" && !params.taskId) {
    return {
      shouldRestore: true,
      shouldClearPersisted: false,
    };
  }

  // タスク紐づきで入った場合は、taskId が一致する時だけ復元する
  if (params.taskId) {
    return {
      shouldRestore: persisted.taskId === params.taskId,
      shouldClearPersisted: persisted.taskId !== params.taskId,
    };
  }

  // source も taskId も指定がない時は、従来どおり復元する
  return { shouldRestore: true, shouldClearPersisted: false };
};
