import { useEffect } from "react";

import { listRecorderFiles } from "@/features/recorder/api/files-api";
import { useRecorderStore } from "@/features/recorder/model/recorder-store";

export function useRecorderFiles(autoLoad = true) {
  const setFiles = useRecorderStore((state) => state.setFiles);
  const setError = useRecorderStore((state) => state.setError);
  const setLoadingFiles = useRecorderStore((state) => state.setLoadingFiles);

  const refresh = async () => {
    setLoadingFiles(true);
    setError(undefined);
    try {
      const files = await listRecorderFiles();
      setFiles(files);
    } catch (error) {
      setError(error instanceof Error ? error.message : "未知文件列表错误");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad]);

  return { refresh };
}
