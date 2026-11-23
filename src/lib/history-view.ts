/**
 * Lịch sử sử dụng cho khách (v5.31.0). Thuần, chỉ import tương đối.
 * Mỗi lượt trả theo lượt là một phiếu (run_tickets): tệp nào, dài bao lâu, model nào, giữ bao nhiêu, trừ bao nhiêu, trả lại bao nhiêu.
 * Từ v5.0.0 việc giữ và trả Token dịch nằm trong phiếu, không còn trong sổ tiền, nên lịch sử phải đọc phiếu.
 * Thuê phòng (key của khách) không qua phiếu: lượt chạy ghi trên máy khách (local-runs), không gửi lên máy chủ.
 */

export type TicketRecord = {
  id: string;
  fileName: string;
  seconds: number;
  held: number;
  charged: number;
  released: number;
  status: string;
  unit: string;
  asrModel: string;
  chatModel: string;
  createdAt: string;
  closedAt: string | null;
};

export type GrantRecord = { id: string; tokens: number; left: number; expiresAt: string; createdAt: string };

export type HistoryRow = {
  id: string;
  kind: "run" | "analysis" | "polish" | "speech" | "local";
  title: string;
  /** Dòng phụ: thời lượng · model · giờ. */
  detail: string;
  /** Chữ trạng thái: Xong, Lỗi, Đã dừng, Đang giữ… */
  state: string;
  tone: "ok" | "bad" | "wait" | "plain";
  /** Số Token dịch (hoặc đồng với phiếu cũ): giữ / trừ / trả lại. Rỗng với lượt thuê phòng. */
  money: string;
  at: string;
};

const nf = new Intl.NumberFormat("vi-VN");

export function formatSpan(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} giờ ${m} phút`;
  if (m) return r ? `${m} phút ${r} giây` : `${m} phút`;
  return `${r} giây`;
}

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Tên model gọn: bỏ tiền tố nhà (openai/, qwen/…), giữ phần cuối. */
export function shortModel(id: string): string {
  if (!id || id === "auto") return id === "auto" ? "Tự động" : "";
  return id.split("/").pop() ?? id;
}

const STATE: Record<string, { text: string; tone: HistoryRow["tone"] }> = {
  "dang-giu": { text: "Đang giữ", tone: "wait" },
  "da-tru": { text: "Xong", tone: "ok" },
  "dung-tien": { text: "Hết phần giữ", tone: "bad" },
  "da-nha": { text: "Không trừ", tone: "plain" },
  loi: { text: "Lỗi, không trừ", tone: "bad" },
  "da-huy": { text: "Đã hủy", tone: "plain" },
};

function kindOf(ticket: TicketRecord): HistoryRow["kind"] {
  if (ticket.id.startsWith("tts-")) return "speech";
  if (/^Phân tích nội dung/.test(ticket.fileName)) return "analysis";
  if (/^Trau chuốt/i.test(ticket.fileName)) return "polish";
  return "run";
}

export function ticketRow(ticket: TicketRecord): HistoryRow {
  const kind = kindOf(ticket);
  const token = ticket.unit === "token";
  const amount = (n: number) => (token ? `${nf.format(n)} Token dịch` : `${nf.format(n)} đ`);
  const parts: string[] = [];
  if (ticket.charged > 0) parts.push(`trừ ${amount(ticket.charged)}`);
  if (ticket.status === "dang-giu" && ticket.held > 0) parts.push(`đang giữ ${amount(ticket.held)}`);
  if (ticket.released > 0) parts.push(`trả lại ${amount(ticket.released)}`);
  if (!parts.length) parts.push(`trừ ${amount(0)}`);
  const models = [shortModel(ticket.asrModel), shortModel(ticket.chatModel)].filter(Boolean);
  const detail = [
    kind === "speech" ? "" : ticket.seconds > 0 ? formatSpan(ticket.seconds) : "",
    kind === "run" && models.length ? models.join(" · ") : "",
    formatWhen(ticket.createdAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const state = STATE[ticket.status] ?? { text: ticket.status, tone: "plain" as const };
  return {
    id: `t-${ticket.id}`,
    kind,
    title: kind === "speech" ? "Đọc thuyết minh trong ngày" : ticket.fileName || "Lượt dịch",
    detail,
    state: state.text,
    tone: state.tone,
    money: parts.join(" · "),
    at: ticket.createdAt,
  };
}

/** Lượt thuê phòng ghi trên máy (local-runs.ts). */
export type LocalRun = { at: string; file: string; seconds: number; asr: string; chat: string; lines: number; ok: boolean };

export function localRow(run: LocalRun, index: number): HistoryRow {
  const detail = [run.seconds > 0 ? formatSpan(run.seconds) : "", [shortModel(run.asr), shortModel(run.chat)].filter(Boolean).join(" · "), formatWhen(run.at)]
    .filter(Boolean)
    .join(" · ");
  return {
    id: `l-${index}-${run.at}`,
    kind: "local",
    title: run.file || "Lượt dịch",
    detail,
    state: run.ok ? `Xong · ${nf.format(run.lines)} câu` : "Chưa xong",
    tone: run.ok ? "ok" : "plain",
    money: "Key của bạn, không trừ Token dịch",
    at: run.at,
  };
}

/** Gộp và xếp mới nhất lên trên. */
export function mergeHistory(rows: HistoryRow[]): HistoryRow[] {
  return [...rows].sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
}

export type GrantRow = { id: string; title: string; detail: string; expired: boolean };

export function grantRow(grant: GrantRecord, now = Date.now()): GrantRow {
  const expired = Date.parse(grant.expiresAt) <= now;
  const day = new Date(grant.expiresAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  return {
    id: grant.id,
    title: `Gói ${nf.format(grant.tokens)} Token dịch`,
    detail: expired ? `Hết hạn ${day} · còn lại đã mất ${nf.format(grant.left)}` : `Còn ${nf.format(grant.left)} · hạn đến ${day}`,
    expired,
  };
}
