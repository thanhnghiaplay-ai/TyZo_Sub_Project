// Ước giá trau chuốt trước khi gửi (bước A3 trong HANDOFF_NANG_CAP.md).
// File thuần, chỉ import tương đối. KHÔNG trừ gì, KHÔNG gọi mạng: chỉ tính và soạn chữ để hộp xác nhận hiện.
// Việc trừ Token đúng số thực khi chạy là bước A5 (dùng cơ chế phiếu `run_tickets` có sẵn).
//
// Cách ước: dựng đúng các lệnh `polishMessages` sẽ gửi cho từng lô (cùng `sendableIndexes` và `batchContext`
// với `polishAll`), đo số ký tự, đổi ra token. Đây là ƯỚC LƯỢNG THẬN TRỌNG (hơi cao), không phải số thật.
// Số trừ cuối cùng ở A5 phải là số thật theo lượng model báo về, phần ước dư không thu.

import { bareChatVnd, formatGiay, giayForBaseCost } from "./token-math.ts";
import { chatPerMillion, type PriceBook } from "./run-bill.ts";
import { pickAutoModel } from "./sub/models.ts";
import {
  POLISH_BATCH,
  batchContext,
  polishMessages,
  sendableIndexes,
  type PolishItem,
  type PolishOpts,
} from "./sub/polish.ts";

/** Ký tự mỗi token khi ước. Tiếng Việt có dấu và chữ CJK tốn token hơn tiếng Anh, nên lấy thấp để ước hơi cao. */
export const POLISH_CHARS_PER_TOKEN = 2.5;
/** Mỗi câu trả về thêm khoảng này token cho dấu ngoặc kép, dấu phẩy của JSON. */
const OUT_JSON_PER_LINE = 4;
/** Bản trau chuốt có thể dài hơn bản cũ một chút. */
const OUT_GROWTH = 1.15;
/** Dự phòng cho lô phải chia đôi hoặc gọi lại. */
export const POLISH_RETRY_MARGIN = 1.15;

export type PolishPlan = {
  /** Số câu sẽ gửi (không `edited`, không dịch lỗi, có bản dịch). */
  sendable: number;
  /** Số lượt gọi model dự kiến, chưa tính lượt chia đôi khi lỗi. */
  batches: number;
  /** Token vào ước tính (đã nhân dự phòng). */
  inn: number;
  /** Token ra ước tính (đã nhân dự phòng). */
  out: number;
};

function tokensOfChars(chars: number): number {
  return Math.ceil(chars / POLISH_CHARS_PER_TOKEN);
}

export function planPolish(items: PolishItem[], opts: PolishOpts, batchSize: number = POLISH_BATCH): PolishPlan {
  const size = Math.max(1, Math.floor(batchSize));
  const sendable = sendableIndexes(items);
  const current = items.map((item) => String(item.translation ?? ""));
  let inn = 0;
  let out = 0;
  let batches = 0;
  for (let from = 0; from < sendable.length; from += size) {
    const idx = sendable.slice(from, from + size);
    const { before, after } = batchContext(items, current, idx);
    const messages = polishMessages(
      idx.map((i) => ({ o: items[i].original, t: current[i] })),
      opts,
      before,
      after,
    );
    inn += tokensOfChars(messages.reduce((sum, m) => sum + m.content.length, 0));
    const lineChars = idx.reduce((sum, i) => sum + current[i].length, 0);
    out += tokensOfChars(lineChars * OUT_GROWTH) + idx.length * OUT_JSON_PER_LINE + 8;
    batches += 1;
  }
  return {
    sendable: sendable.length,
    batches,
    inn: Math.ceil(inn * POLISH_RETRY_MARGIN),
    out: Math.ceil(out * POLISH_RETRY_MARGIN),
  };
}

export type PolishQuote = {
  /** Có đủ giá để ước chưa. false thì KHÔNG cho chạy, vì không biết sẽ tốn bao nhiêu. */
  ready: boolean;
  /** Lý do khi chưa sẵn sàng, chữ cho khách. */
  reason: string | null;
  /** Ước theo Token dịch (1 Token dịch = giá gốc 1 giây nhận dạng Turbo). null khi chưa ước được. */
  tokens: number | null;
  /** Ước theo đồng, giá khách trả (đã gồm phần chênh của cửa trả). null khi chưa ước được. */
  vnd: number | null;
};

/**
 * Quy kế hoạch ra Token dịch (và đồng). `chatBook` là bảng giá của nhà cung cấp model trau chuốt,
 * `groqBook` là bảng giá Groq (để đổi sang Token dịch theo giá Turbo). Thiếu giá thì `ready: false`.
 */
export function quotePolish(input: {
  plan: PolishPlan;
  model: string;
  chatBook: PriceBook | undefined;
  groqBook: PriceBook | undefined;
}): PolishQuote {
  const { plan, model, chatBook, groqBook } = input;
  if (plan.sendable === 0) return { ready: false, reason: "Không có câu nào cần trau chuốt.", tokens: 0, vnd: 0 };
  if (!chatBook || !groqBook) return { ready: false, reason: "Chưa lấy được bảng giá, chưa ước được.", tokens: null, vnd: null };
  const bare: PriceBook = { rate: chatBook.rate, rows: chatBook.rows, desk: { markup: 0, custom: {} } };
  if (!chatPerMillion(bare, model)) return { ready: false, reason: "Model này chưa có giá, chưa ước được.", tokens: null, vnd: null };
  const baseVnd = bareChatVnd(chatBook, model, plan.inn, plan.out);
  const tokens = giayForBaseCost(groqBook, baseVnd);
  if (tokens == null) return { ready: false, reason: "Chưa có giá quy đổi Token dịch, chưa ước được.", tokens: null, vnd: null };
  const per = chatPerMillion(chatBook, model);
  const vnd = per ? Math.max(1, Math.ceil((plan.inn * per.inn + plan.out * per.out) / 1_000_000 - 1e-9)) : null;
  return { ready: true, reason: null, tokens, vnd };
}

/**
 * Model trau chuốt mặc định: model dịch mạnh nhất đang có trong danh mục (theo hồ sơ «chính xác» của bộ chọn tự động,
 * không đoán tên model). Chủ chạy phim mẫu để chốt; người dùng đổi được ở hộp chọn model (A3/A5).
 */
export function defaultPolishModel(input: {
  sourceLang: string;
  genre: string;
  available: Set<string> | null;
  allowEnterprise: boolean;
}): string {
  return pickAutoModel({
    profile: "accurate",
    texts: [],
    sourceLang: input.sourceLang,
    genre: input.genre,
    glossaryHit: false,
    allowEnterprise: input.allowEnterprise,
    available: input.available,
    cooling: new Map(),
    blocked: new Set(),
    escalate: false,
  }).id;
}

/** Chữ cho hộp xác nhận (dùng `askConfirm`, KHÔNG dùng `confirm()` của trình duyệt). */
export function polishConfirmText(input: { plan: PolishPlan; quote: PolishQuote; modelName: string; skippedEdited: number }): {
  title: string;
  text: string;
  confirmLabel: string;
} {
  const { plan, quote, modelName, skippedEdited } = input;
  const lines = [
    `Gửi ${plan.sendable.toLocaleString("vi-VN")} câu cho ${modelName} để trau chuốt.`,
    quote.ready && quote.tokens != null
      ? `Ước tính khoảng ${formatGiay(quote.tokens)}. Số trừ thật tính theo lượng dùng thật, có thể thấp hơn.`
      : (quote.reason ?? "Chưa ước được chi phí."),
    "Kết quả hiện cạnh bản cũ, bạn chọn câu nào dùng. Bản cũ không bị ghi đè.",
  ];
  if (skippedEdited > 0) lines.push(`${skippedEdited.toLocaleString("vi-VN")} câu bạn đã sửa tay sẽ được giữ nguyên.`);
  lines.push("Chọn Hủy thì không gửi gì và không trừ gì.");
  return { title: "Trau chuốt bản dịch?", text: lines.join("\n"), confirmLabel: "Đồng ý, trau chuốt" };
}
