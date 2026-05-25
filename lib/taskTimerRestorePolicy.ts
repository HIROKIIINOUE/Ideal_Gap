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
 * - 「紐づかないタイマー」で入った場合: unlinked(session.taskId===null) の時だけ復元
 * - 「紐づかないタイマー」で入ったのに persisted がタスク紐づきなら、初期化して開始できるよう persisted を破棄
 */
export const getTaskTimerRestorePolicy = (
  params: TaskTimerEntryParams,
  persisted: PersistedTaskTimerSession | null,
): RestorePolicyResult => {
  if (!persisted) {
    return { shouldRestore: false, shouldClearPersisted: false };
  }

  const isUnlinkedEntry =
    params.source === "dashboard" && !params.taskId;

  // 「紐づかないタイマー」から入った場合は、unlinked の persisted だけ復元する
  if (isUnlinkedEntry) {
    const isPersistedUnlinked = persisted.taskId === null;
    return {
      shouldRestore: isPersistedUnlinked,
      shouldClearPersisted: !isPersistedUnlinked,
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

