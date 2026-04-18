import { robotConfig } from "@/shared/config/robot";
import type { RecordedFile } from "@/shared/types/recorder";

export async function listRecorderFiles() {
  const response = await fetch(`${robotConfig.apiBase}/api/data/list`);
  if (!response.ok) {
    throw new Error(`加载录制文件失败: ${response.status}`);
  }
  const payload = (await response.json()) as { files?: RecordedFile[] };
  return payload.files ?? [];
}

export function buildRecorderDownloadUrl(name: string) {
  return `${robotConfig.apiBase}/api/data/download/${encodeURIComponent(name)}`;
}
