/**
 * Phụ đề đã làm, lưu trên máy khách theo dấu tệp (v5.33.0). Chỉ import tương đối.
 * Tải lại trang hay điện thoại xả trang không làm mất phần khách đã trả: chọn lại đúng tệp thì app hỏi khôi phục.
 * Chỉ lưu khi nhận dạng đã xong (khôi phục xong thì chỉ còn dịch nốt, không nhận dạng lại). Không gửi lên máy chủ.
 */
import type { Seg } from "./sub/types.ts";

const SAVED_DB = "tyzo-saved-runs";
const SAVED_STORE = "runs";
/** Giữ bấy nhiêu tệp gần nhất; cũ hơn thì xóa. */
export const SAVED_MAX = 5;

export type SavedRun = {
  key: string;
  at: string;
  fileName: string;
  source: string;
  target: string;
  segs: Seg[];
  bible: unknown;
};

/** Dọn câu trước khi lưu: bỏ trạng thái tạm (đang gửi), giữ chữ, giờ, cờ sửa tay, giọng. */
export function snapshotSegs(segs: Seg[]): Seg[] {
  return segs.map(({ busy: _busy, ...rest }) => ({ ...rest }));
}

export function savedSummary(run: Pick<SavedRun, "segs" | "at">): { total: number; done: number; when: string } {
  const done = run.segs.filter((seg) => seg.translation !== null && !seg.translationFailed).length;
  const t = Date.parse(run.at);
  const when = Number.isFinite(t) ? new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";
  return { total: run.segs.length, done, when };
}

/** Bản lưu dùng được cho tệp đang chọn: đúng dấu tệp, đúng tiếng gốc, có câu. */
export function usableSaved(run: SavedRun | null | undefined, key: string, source: string): run is SavedRun {
  return Boolean(run && key && run.key === key && run.source === source && Array.isArray(run.segs) && run.segs.length > 0);
}

/** Xếp mới nhất trước, giữ SAVED_MAX; trả các khóa cần xóa. */
export function keysToDrop(runs: Pick<SavedRun, "key" | "at">[], max = SAVED_MAX): string[] {
  return [...runs].sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0)).slice(max).map((run) => run.key);
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(SAVED_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(SAVED_STORE)) req.result.createObjectStore(SAVED_STORE, { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(SAVED_STORE, mode);
          const req = work(tx.objectStore(SAVED_STORE));
          if (mode === "readonly") {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          } else {
            // Kiểm toán R5-009: ghi chỉ tính là xong khi giao dịch đã lưu (oncomplete), không phải lúc yêu cầu vừa nhận.
            tx.oncomplete = () => resolve(req.result);
            tx.onerror = () => resolve(null);
            tx.onabort = () => resolve(null);
          }
        } catch {
          resolve(null);
        } finally {
          db.close();
        }
      }),
  );
}

export async function loadSaved(key: string): Promise<SavedRun | null> {
  if (!key) return null;
  return ((await run("readonly", (store) => store.get(key))) as SavedRun | undefined) ?? null;
}

/** Lưu (đè) bản của tệp này, rồi xóa bớt bản cũ. Lỗi thì bỏ qua: lưu hỏng không làm hỏng lượt chạy. */
export async function storeSaved(item: SavedRun): Promise<void> {
  try {
    await run("readwrite", (store) => store.put(item));
    const all = ((await run("readonly", (store) => store.getAll())) as SavedRun[] | null) ?? [];
    for (const key of keysToDrop(all)) await run("readwrite", (store) => store.delete(key));
  } catch {
    /* bỏ qua */
  }
}

export async function dropSaved(key: string): Promise<void> {
  if (!key) return;
  await run("readwrite", (store) => store.delete(key));
}
