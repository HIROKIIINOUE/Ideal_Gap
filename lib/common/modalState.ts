// 各機能ページのインプットモーダルを「追加」「編集」に応じて値を返す。
// 呼び出し元では一つ状態変数(modalState)で追加も編集も管理する

export type ModalMeta = {
  updatedAt?: string | null;
};

export type ModalState = {
  visible: boolean;
  editingId: string | null;
  meta: ModalMeta | null;
};

export const createAddModalState = (): ModalState => {
  return {
    visible: true,
    editingId: null,
    meta: null,
  };
};

export const createEditModalState = (
  editingId: string,
  meta?: ModalMeta | null
): ModalState => ({
  visible: true,
  editingId,
  meta: meta ?? null,
});

export const closedModalState: ModalState = {
  visible: false,
  editingId: null,
  meta: null,
};
