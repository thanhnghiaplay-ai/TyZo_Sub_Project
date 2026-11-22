import type { Sql } from "../db.ts";
import { latencyRows, type LatencyRow } from "./live-latency.ts";
import type { LiveSessionStats } from "./live-bridge.ts";

/** Giữ số đo bao lâu. Đổi thì sửa cả điều khoản mục dữ liệu. */
export const LATENCY_KEEP_DAYS = 30;

/** Cầu nối ghi một dòng khi phiên đóng. Phiên chưa gửi tiếng nào thì bỏ qua (không có gì để đo). */
export async function saveLatency(sql: Sql, stats: LiveSessionStats): Promise<void> {
  if (stats.readyMs == null && !stats.audioSeconds) return;
  await sql`
    insert into live_latency (model, via, events, ready_ms, first_text_ms, tam_ms, chot_ms, audio_seconds, reconnects, end_reason)
    values (${stats.model}, ${stats.via}, ${stats.events}, ${stats.readyMs}, ${stats.firstTextMs}, ${stats.tam}, ${stats.chot}, ${stats.audioSeconds}, ${stats.reconnects}, ${stats.endReason.slice(0, 40)})
  `;
  // Dọn dòng cũ thỉnh thoảng (khoảng 1 phiên trong 20), đỡ thêm truy vấn mỗi phiên.
  if (Math.random() < 0.05) await sql`delete from live_latency where at < now() - make_interval(days => ${LATENCY_KEEP_DAYS})`;
}

/** Bảng cho Admin: gom theo model trong `days` ngày gần nhất. */
export async function loadLatencyRows(sql: Sql, days: number): Promise<LatencyRow[]> {
  const rows = await sql<{ model: string; via: string; events: number; audio_seconds: number; ready_ms: number | null; first_text_ms: number | null; tam_ms: number[] | null; chot_ms: number[] | null; end_reason: string }>`
    select model, via, events, audio_seconds, ready_ms, first_text_ms, tam_ms, chot_ms, end_reason from live_latency
    where at > now() - make_interval(days => ${days})
    order by at desc limit 2000
  `;
  return latencyRows(
    rows.map((row) => ({
      model: row.model,
      via: row.via === "app" ? "app" : "web",
      events: row.events,
      audioSeconds: row.audio_seconds,
      readyMs: row.ready_ms,
      firstTextMs: row.first_text_ms,
      tam: row.tam_ms ?? [],
      chot: row.chot_ms ?? [],
      endReason: row.end_reason,
    })),
  );
}
