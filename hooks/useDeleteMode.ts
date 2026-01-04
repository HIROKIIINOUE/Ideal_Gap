// 各機能ページの削除モードトグルを管理

import { useCallback, useState } from "react";

export function useDeleteMode(initial = false) {
  const [deleteMode, setDeleteMode] = useState(initial);

  const toggleDeleteMode = useCallback(() => {
    setDeleteMode((prev) => !prev);
  }, []);

  const disableDeleteMode = useCallback(() => setDeleteMode(false), []);

  return {
    deleteMode,
    toggleDeleteMode,
    disableDeleteMode,
    setDeleteMode,
  };
}
