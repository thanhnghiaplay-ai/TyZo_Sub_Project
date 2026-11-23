// Nhập hàng loạt thuật ngữ cho Chủ (bước B2, HANDOFF_NANG_CAP.md): đọc file, phân loại trước khi ghi.
// Chỉ import tương đối để test được bằng Node. Không chạm CSDL: máy chủ đưa vào bảng từ đã có.
import { parseGlossaryCsv } from "./sub/glossary.ts";

const IMPORT_TERM_MAX = 80;
/** Số dòng ghi mỗi lượt gọi máy chủ (khớp `importGlossary`). */
export const IMPORT_CHUNK = 400;
/** Tối đa dòng đọc từ một file. */
export const IMPORT_MAX_ROWS = 5000;

export type ImportRow = { source: string; target: string };
type ImportRejected = { line: number; source: string; reason: string };
export type ExistingTerm = { target: string; hidden: boolean };
type ImportPlan = {
  /** Số dòng đọc được từ file (trước khi lọc). */
  total: number;
  add: ImportRow[];
  change: Array<ImportRow & { old: string; restore: boolean }>;
  /** Giống hệt từ đã có (cùng cách dịch, không ẩn): không cần ghi. */
  same: number;
  /** Lặp lại cùng từ và cùng cách dịch trong file: bỏ dòng sau. */
  duplicates: number;
  rejected: ImportRejected[];
};

/** Đọc JSON (danh sách `{source,target}` hoặc `{rows:[...]}`) hoặc CSV/TSV/«gốc = dịch». Hỏng thì ném lỗi tiếng Việt. */
export function parseImportText(text: string): ImportRow[] {
  const body = text.replace(/^\uFEFF/, "").trim();
  if (!body) throw new Error("File trống.");
  let raw: unknown[];
  if (body.startsWith("[") || body.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("File JSON bị hỏng, không đọc được.");
    }
    const list = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown })?.rows;
    if (!Array.isArray(list)) throw new Error("File JSON phải là danh sách từ, mỗi mục có source và target.");
    raw = list;
  } else {
    raw = parseGlossaryCsv(body);
  }
  if (raw.length > IMPORT_MAX_ROWS) throw new Error(`File có ${raw.length} dòng, nhiều hơn mức ${IMPORT_MAX_ROWS}. Hãy chia nhỏ file.`);
  return raw.map((item) => {
    const row = (item && typeof item === "object" ? item : {}) as { source?: unknown; target?: unknown };
    return { source: typeof row.source === "string" ? row.source : "", target: typeof row.target === "string" ? row.target : "" };
  });
}

function clean(value: string): string {
  return value.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim();
}

/** Phân loại từng dòng so với bảng từ đã có (khóa là từ gốc viết thường). */
export function planImport(rows: ImportRow[], existing: Map<string, ExistingTerm>): ImportPlan {
  const plan: ImportPlan = { total: rows.length, add: [], change: [], same: 0, duplicates: 0, rejected: [] };
  const seen = new Map<string, { line: number; target: string }>();
  rows.forEach((row, index) => {
    const line = index + 1;
    const source = clean(row.source);
    const target = clean(row.target);
    const reject = (reason: string) => plan.rejected.push({ line, source: source.slice(0, 40), reason });
    if (!source) return reject("Thiếu từ gốc.");
    if (!target) return reject("Thiếu cách dịch.");
    if (source.length > IMPORT_TERM_MAX || target.length > IMPORT_TERM_MAX) return reject(`Dài quá ${IMPORT_TERM_MAX} ký tự.`);
    const key = source.toLowerCase();
    const before = seen.get(key);
    if (before) {
      if (before.target === target) plan.duplicates += 1;
      else reject(`Trùng từ gốc với dòng ${before.line} nhưng cách dịch khác; giữ dòng ${before.line}.`);
      return;
    }
    seen.set(key, { line, target });
    const old = existing.get(key);
    if (!old) plan.add.push({ source, target });
    else if (old.target === target && !old.hidden) plan.same += 1;
    else plan.change.push({ source, target, old: old.target, restore: old.hidden && old.target === target });
  });
  return plan;
}

/** Các dòng thật sự cần ghi (thêm mới + đổi), cắt thành lượt nhỏ cho máy chủ. */
export function importBatches(plan: ImportPlan): ImportRow[][] {
  const rows: ImportRow[] = [...plan.add, ...plan.change.map(({ source, target }) => ({ source, target }))];
  const out: ImportRow[][] = [];
  for (let i = 0; i < rows.length; i += IMPORT_CHUNK) out.push(rows.slice(i, i + IMPORT_CHUNK));
  return out;
}

/** Chữ cho hộp xác nhận và dòng báo kết quả. */
export function importSummary(plan: ImportPlan): string {
  const parts = [`Đọc ${plan.total} dòng:`, `${plan.add.length} từ mới`, `${plan.change.length} từ đổi cách dịch hoặc hiện lại`];
  const tail = [`${plan.same} từ giống hệt (bỏ qua)`];
  if (plan.duplicates) tail.push(`${plan.duplicates} dòng lặp trong file (bỏ qua)`);
  if (plan.rejected.length) tail.push(`${plan.rejected.length} dòng không dùng được`);
  const shown = plan.change
    .filter((item) => !item.restore)
    .slice(0, 5)
    .map((item) => `«${item.source}»: ${item.old} → ${item.target}`);
  return [parts[0] + " " + parts[1] + ", " + parts[2] + ", " + tail.join(", ") + ".", shown.length ? "Ví dụ đổi: " + shown.join("; ") + "." : ""]
    .filter(Boolean)
    .join(" ");
}
