/**
 * Khách tự xác nhận quyền với nội dung, MỖI TỆP MỘT LẦN, trước lần xử lý đầu (v5.20.0).
 * Mô hình công cụ theo yêu cầu: người dùng tự chọn nội dung và tự chịu trách nhiệm về quyền với nội dung đó.
 * Thuần, chỉ import tương đối. Máy khách chỉ nhớ MÃ BĂM của tệp (không nhớ tên tệp); máy chủ ghi cùng mã băm làm bằng chứng.
 */

export const RIGHTS_TITLE = "Xác nhận quyền với nội dung";

export const RIGHTS_TEXT = [
  "TyZo Sub là công cụ AI xử lý nội dung theo yêu cầu của bạn. Trước khi xử lý tệp này, bạn xác nhận:",
  "• Bạn sở hữu nội dung, hoặc đã được chủ sở hữu cho phép nhận dạng, dịch, tạo phụ đề hay thuyết minh cho nó, hoặc pháp luật cho phép bạn dùng nội dung theo cách này.",
  "• Bạn tự chịu trách nhiệm khi đăng, phát hay chia sẻ kết quả.",
  "TyZo Sub không kiểm tra nội dung trước khi xử lý, và tạm dừng xử lý khi nhận khiếu nại bản quyền hợp lệ (Điều khoản, mục 3).",
].join("\n");

export const RIGHTS_CONFIRM = "Tôi xác nhận";
export const RIGHTS_DECLINED = "Chưa xác nhận quyền với nội dung, nên chưa xử lý tệp này.";

/** Khóa lưu trên máy: danh sách mã băm đã xác nhận. */
export const RIGHTS_KEY = "tyzo-rights";
const MAX_REMEMBERED = 500;

/** Mã băm ngắn (FNV-1a 64 bit, hex) của dấu tệp. Không đảo ngược ra tên tệp; chỉ để nhận lại cùng tệp. */
export function mediaHash(mediaId: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const byte of new TextEncoder().encode(mediaId)) {
    h ^= BigInt(byte);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

export function isMediaHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{16}$/.test(value);
}

type Store = Pick<Storage, "getItem" | "setItem">;

function read(store: Store | null): string[] {
  try {
    const raw = JSON.parse(store?.getItem(RIGHTS_KEY) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter(isMediaHash) : [];
  } catch {
    return [];
  }
}

/** Tệp này đã được xác nhận trên máy này chưa. Không có dấu tệp (chưa chọn gì) thì coi như chưa. */
export function rightsConfirmed(mediaId: string, store: Store | null = safeStore()): boolean {
  if (!mediaId) return false;
  return read(store).includes(mediaHash(mediaId));
}

/** Nhớ đã xác nhận (giữ tối đa MAX_REMEMBERED tệp gần nhất). Máy không cho lưu thì lần sau hỏi lại. */
export function rememberRights(mediaId: string, store: Store | null = safeStore()): string {
  const hash = mediaHash(mediaId);
  const next = [...read(store).filter((item) => item !== hash), hash].slice(-MAX_REMEMBERED);
  try {
    store?.setItem(RIGHTS_KEY, JSON.stringify(next));
  } catch {
    /* máy chặn lưu: lần sau hỏi lại */
  }
  return hash;
}

function safeStore(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
