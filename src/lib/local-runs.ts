/**
 * Lượt thuê phòng (key của khách) ghi trên máy khách để có lịch sử «dịch tệp nào, bao lâu, model nào» (v5.31.0).
 * Không gửi lên máy chủ. Giữ 50 lượt gần nhất. Thuần, chỉ import tương đối.
 */
import type { LocalRun } from "./history-view.ts";

const LOCAL_RUNS_KEY = "tyzo_runs";
export const LOCAL_RUNS_MAX = 50;

type Store = Pick<Storage, "getItem" | "setItem">;

export function readLocalRuns(store: Store | null): LocalRun[] {
  try {
    const raw = store?.getItem(LOCAL_RUNS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((item): item is LocalRun => Boolean(item) && typeof item === "object" && typeof (item as LocalRun).at === "string").slice(0, LOCAL_RUNS_MAX);
  } catch {
    return [];
  }
}

export function addLocalRun(store: Store | null, run: LocalRun) {
  try {
    const next = [{ ...run, file: String(run.file).slice(0, 160) }, ...readLocalRuns(store)].slice(0, LOCAL_RUNS_MAX);
    store?.setItem(LOCAL_RUNS_KEY, JSON.stringify(next));
  } catch {
    /* máy chặn lưu: bỏ qua */
  }
}
