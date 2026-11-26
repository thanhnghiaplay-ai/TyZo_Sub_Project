import type { Sql } from "../db.ts";

/**
 * Lịch sử Dịch trực tiếp đồng bộ giữa web và ứng dụng Android (Chủ yêu cầu 23/11/2026).
 * Máy chủ giữ chữ của phiên (giờ, chữ gốc, bản dịch) theo tài khoản, để mở ở nơi nào cũng thấy và tải lại được.
 * Giữ tối đa KEEP_SESSIONS phiên, mỗi phiên tối đa KEEP_DAYS ngày; khách xóa được từng phiên hoặc xóa hết.
 * Đổi số giữ hay loại dữ liệu thì sửa điều khoản mục dữ liệu và nâng TERMS_VERSION.
 */
export const KEEP_SESSIONS = 30;
export const KEEP_DAYS = 30;
/** Một phiên tối đa chừng này câu (cùng giới hạn bản lưu trên máy, packSavedLive). */
export const MAX_CUES = 2000;
const MAX_TEXT = 600;

/** Dạng gọn của một câu, cùng dạng ứng dụng lưu (Session.kt): giây bắt đầu, giây kết thúc, chữ gốc, bản dịch. */
export type HistoryCue = { s: number; e: number; o: string; t: string | null };
export type HistoryInput = { clientId: string; via: "web" | "app"; model: string; target: string; startedAt: number; cues: HistoryCue[] };
export type HistoryItem = { id: string; via: "web" | "app"; model: string; target: string; startedAt: string; durationMs: number; lines: number; preview: string };

const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
/** Một phiên dài nhất 2 ngày (giây). Kiểm toán DEEP-007: số giây lớn hơn làm tràn cột duration_ms (integer). */
const MAX_SECONDS = 2 * 86_400;
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_SECONDS, Math.max(0, Math.round(value * 1000) / 1000)) : 0);

/** Kiểm dữ liệu khách gửi lên. Sai hoặc không có câu nào có chữ thì trả null (không lưu). */
export function cleanHistory(raw: unknown, via: "web" | "app", now = Date.now()): HistoryInput | null {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return null;
  const clientId = str(row.clientId, 64).trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clientId)) return null;
  const startedAt = Number(row.startedAt);
  // Không nhận giờ lạ: tương lai, hay cũ hơn hạn giữ.
  if (!Number.isFinite(startedAt) || startedAt > now + 5 * 60_000 || startedAt < now - KEEP_DAYS * 86_400_000) return null;
  const list = Array.isArray(row.cues) ? row.cues.slice(0, MAX_CUES) : [];
  const cues: HistoryCue[] = [];
  for (const item of list) {
    const cue = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!cue) continue;
    const o = str(cue.o, MAX_TEXT).trim();
    const t = cue.t == null ? null : str(cue.t, MAX_TEXT).trim() || null;
    if (!o && !t) continue;
    const s = num(cue.s);
    cues.push({ s, e: Math.max(s, num(cue.e)), o, t });
  }
  if (!cues.length) return null;
  return { clientId, via, model: str(row.model, 80), target: str(row.target, 16), startedAt, cues };
}

function preview(cues: HistoryCue[]): string {
  const first = cues.find((cue) => (cue.t ?? cue.o).trim());
  const text = (first?.t ?? first?.o ?? "").trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/** Lưu (gửi lại cùng clientId thì ghi đè, không tạo bản trùng), rồi dọn phiên quá số giữ hoặc quá hạn. */
export async function saveHistoryWith(sql: Sql, userId: string, input: HistoryInput): Promise<string> {
  const id = `lh_${input.clientId}_${userId}`.slice(0, 120);
  const last = input.cues[input.cues.length - 1];
  const durationMs = Math.round(Math.max(last.e, last.s) * 1000);
  const startedAt = new Date(input.startedAt).toISOString();
  const cues = JSON.stringify(input.cues);
  await sql`
    insert into live_history (id, user_id, client_id, via, model, target, started_at, duration_ms, line_count, preview, cues)
    values (${id}, ${userId}, ${input.clientId}, ${input.via}, ${input.model}, ${input.target}, ${startedAt}::timestamptz, ${durationMs}, ${input.cues.length}, ${preview(input.cues)}, ${cues}::jsonb)
    on conflict (user_id, client_id) do update set
      duration_ms = excluded.duration_ms, line_count = excluded.line_count, preview = excluded.preview, cues = excluded.cues
  `;
  await sql`
    delete from live_history where user_id = ${userId} and (
      started_at < now() - make_interval(days => ${KEEP_DAYS})
      or id not in (select id from live_history where user_id = ${userId} order by started_at desc limit ${KEEP_SESSIONS})
    )
  `;
  return id;
}

export async function listHistoryWith(sql: Sql, userId: string): Promise<HistoryItem[]> {
  const rows = await sql<{ id: string; via: string; model: string; target: string; started_at: string | Date; duration_ms: number; line_count: number; preview: string }>`
    select id, via, model, target, started_at, duration_ms, line_count, preview from live_history
    where user_id = ${userId} and started_at >= now() - make_interval(days => ${KEEP_DAYS})
    order by started_at desc limit ${KEEP_SESSIONS}
  `;
  return rows.map((row) => ({
    id: row.id,
    via: row.via === "app" ? "app" : "web",
    model: row.model,
    target: row.target,
    startedAt: new Date(row.started_at).toISOString(),
    durationMs: row.duration_ms,
    lines: row.line_count,
    preview: row.preview,
  }));
}

/** Chữ của một phiên. Chỉ đúng chủ tài khoản đọc được. */
export async function readHistoryWith(sql: Sql, userId: string, id: string): Promise<{ startedAt: string; cues: HistoryCue[] } | null> {
  const rows = await sql<{ started_at: string | Date; cues: unknown }>`select started_at, cues from live_history where user_id = ${userId} and id = ${id}`;
  if (!rows[0]) return null;
  const raw = typeof rows[0].cues === "string" ? JSON.parse(rows[0].cues) : rows[0].cues;
  return { startedAt: new Date(rows[0].started_at).toISOString(), cues: Array.isArray(raw) ? (raw as HistoryCue[]) : [] };
}

/** Xóa một phiên (id) hoặc xóa hết (id null). Trả số phiên đã xóa. */
export async function deleteHistoryWith(sql: Sql, userId: string, id: string | null): Promise<number> {
  const rows = id
    ? await sql<{ id: string }>`delete from live_history where user_id = ${userId} and id = ${id} returning id`
    : await sql<{ id: string }>`delete from live_history where user_id = ${userId} returning id`;
  return rows.length;
}
