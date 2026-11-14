import { useCallback, useState } from "react";
import { videoLinkProblem } from "@/lib/link-check";

/** Kiểm link khi rời ô hoặc dán. Sửa nội dung thì xóa cảnh báo cũ, rời ô sẽ kiểm lại. */
export function useLinkCheck() {
  const [problem, setProblem] = useState<string | null>(null);
  const check = useCallback((value: string) => setProblem(videoLinkProblem(value)), []);
  const clear = useCallback(() => setProblem(null), []);
  return { problem, check, clear };
}
