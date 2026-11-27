// RE6-005: phần đo dùng chung cho do-live.ts, tách để kiểm thử với cầu nối giả.
// Đồng hồ monotonic (performance.now). Dọn bộ đếm gửi khung khi đóng/lỗi/hết giờ. Lượt lỗi hoặc thiếu mốc được đếm riêng,
// không trộn vào phân vị. Mốc đo là lúc MÁY ĐO NHẬN sự kiện (onset→nhận), chưa phải lúc giao diện Web/Android vẽ chữ.
import WebSocket from "ws";

export const pct = (xs: number[], p: number) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil((p / 100) * xs.length) - 1)] : null;
const s3 = (ms: number | null | undefined) => (ms == null ? null : Math.round(ms) / 1000);

/** Mốc có tiếng nói đầu và cuối (năng lượng khung 100 ms vượt ngưỡng), tính bằng ms từ đầu đoạn. */
export function speechSpan(pcm: Buffer) {
  const frame = 3200; const rms: number[] = [];
  for (let o = 0; o + frame <= pcm.length; o += frame) {
    let s = 0; for (let i = o; i < o + frame; i += 2) { const v = pcm.readInt16LE(i); s += v * v; }
    rms.push(Math.sqrt(s / (frame / 2)));
  }
  const thr = Math.max(300, (pct(rms, 90) ?? 0) * 0.15);
  const first = rms.findIndex((v) => v > thr);
  if (first < 0) return null;
  const last = rms.length - 1 - [...rms].reverse().findIndex((v) => v > thr);
  return { onsetMs: first * 100, offsetMs: (last + 1) * 100 };
}

export type Row = {
  lang: string; why: string; ok: boolean; connectMs: number | null; onsetMs: number | null; offsetMs: number | null;
  firstSource_s: number | null; firstTranslation_s: number | null; lastFinalAfterSpeechEnd_s: number | null;
  finals: number; framesAfterClose: number; errors: string[]; usage: unknown;
};

export function measure(o: { url: string; lang: string; pcm: Buffer; timeoutMs?: number; frameMs?: number; now?: () => number }): Promise<Row> {
  const now = o.now ?? (() => performance.now());
  const span = speechSpan(o.pcm);
  const frameMs = o.frameMs ?? 100;
  return new Promise((resolve) => {
    const ws = new WebSocket(o.url);
    const tOpen = now(); let t0 = -1; let opened: number | null = null; let closed = false; let afterClose = 0;
    const src: number[] = []; const tr: number[] = []; const finals: number[] = []; const errors: string[] = [];
    let usage: unknown = null; let timer: ReturnType<typeof setInterval> | null = null; let settled = false;
    const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
    const done = (why: string) => {
      if (settled) return; settled = true;
      stopTimer(); clearTimeout(kill); closed = true;
      const onset = span?.onsetMs ?? null; const offset = span?.offsetMs ?? null;
      const rel = (ts: number[], base: number | null) => (ts.length && base != null ? s3(ts[0] - base) : null);
      const row: Row = {
        lang: o.lang, why, ok: false, connectMs: opened == null ? null : Math.round(opened - tOpen), onsetMs: onset, offsetMs: offset,
        firstSource_s: rel(src, onset), firstTranslation_s: rel(tr, onset),
        lastFinalAfterSpeechEnd_s: finals.length && offset != null ? s3(finals[finals.length - 1] - offset) : null,
        finals: finals.length, framesAfterClose: afterClose, errors, usage,
      };
      row.ok = !errors.length && why === "dong-1000" && row.firstSource_s != null && row.firstTranslation_s != null && row.finals > 0;
      resolve(row);
    };
    const kill = setTimeout(() => { ws.terminate(); done("het-gio"); }, o.timeoutMs ?? 120_000);
    ws.on("message", (data, isBinary) => {
      if (isBinary) return;
      let m: { type: string; event?: { kind: string; final?: boolean; usage?: unknown; message?: string }; message?: string };
      try { m = JSON.parse(data.toString()); } catch { errors.push("tin không phải JSON"); return; }
      const at = () => now() - t0;
      if (m.type === "ready" && t0 < 0) {
        opened = now(); t0 = opened; let off = 0;
        timer = setInterval(() => {
          if (closed || ws.readyState !== WebSocket.OPEN) { if (closed) afterClose++; stopTimer(); return; }
          if (off >= o.pcm.length) { stopTimer(); ws.send(JSON.stringify({ type: "stop" })); return; }
          ws.send(o.pcm.subarray(off, off + 3200)); off += 3200;
        }, frameMs);
      } else if (m.type === "event" && m.event && t0 >= 0) {
        const k = m.event.kind;
        if (k === "source" || k === "source-delta") src.push(at());
        if (k === "translation" || k === "translation-delta") { tr.push(at()); if (m.event.final) finals.push(at()); }
        if (k === "usage") usage = m.event.usage;
        if (k === "error") errors.push(String(m.event.message).slice(0, 160));
      } else if (m.type === "error") errors.push(String(m.message).slice(0, 160));
    });
    ws.on("close", (code) => done(`dong-${code}`));
    ws.on("error", (e) => { errors.push(String(e).slice(0, 160)); });
  });
}

/** Phân vị chỉ trên lượt đạt; lượt lỗi/thiếu mốc đếm riêng theo lý do. */
export function summarize(rows: Row[]) {
  const ok = rows.filter((r) => r.ok);
  const dist = (k: "firstSource_s" | "firstTranslation_s" | "lastFinalAfterSpeechEnd_s") => {
    const xs = ok.map((r) => r[k]).filter((x): x is number => x != null);
    return { n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), p99: pct(xs, 99), max: xs.length ? Math.max(...xs) : null };
  };
  const failed: Record<string, number> = {};
  for (const r of rows) if (!r.ok) {
    const why = r.errors.length ? "loi" : r.why !== "dong-1000" ? r.why : r.firstSource_s == null ? "thieu-chu-goc" : r.firstTranslation_s == null ? "thieu-ban-dich" : "thieu-cau-chot";
    failed[why] = (failed[why] ?? 0) + 1;
  }
  return {
    samples: rows.length, ok: ok.length, failed,
    onsetToSourceReceive_s: dist("firstSource_s"), onsetToTranslationReceive_s: dist("firstTranslation_s"),
    speechEndToFinalReceive_s: dist("lastFinalAfterSpeechEnd_s"),
    note: "Mốc nhận tại máy đo, chưa gồm thời gian vẽ trên Web/Android.",
  };
}
