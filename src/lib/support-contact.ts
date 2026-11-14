/**
 * Thông tin liên hệ hỗ trợ do Chủ nhập ở trang quản lý (tab Cấu hình), hiện ở trang Hướng dẫn.
 * Hàm thuần, không import gì từ máy chủ, chạy được trong test Node.
 * Mọi giá trị đi qua `cleanSupportContact` trước khi lưu và qua `readSupportContact` trước khi hiện,
 * nên liên kết dựng ra chỉ có thể là mailto: hoặc https: tới nơi đã cho phép.
 */
export type SupportContact = { email: string; zalo: string; facebook: string; note: string };

export const EMPTY_CONTACT: SupportContact = { email: "", zalo: "", facebook: "", note: "" };

export const NOTE_MAX = 200;

const EMAIL = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/;
const FACEBOOK_HOSTS = ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com", "fb.me", "m.me", "messenger.com", "www.messenger.com"];

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim() : "";
}

function cleanEmail(value: string): string {
  if (!value) return "";
  if (value.length > 120 || !EMAIL.test(value)) throw new Error("Email liên hệ chưa đúng dạng.");
  return value;
}

function cleanZalo(value: string): string {
  if (!value) return "";
  const phone = value.replace(/[\s.\-()]/g, "");
  if (/^\+?\d{8,15}$/.test(phone)) return phone.replace(/^\+/, "");
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol === "https:" && (url.hostname === "zalo.me" || url.hostname === "www.zalo.me") && value.length <= 200) return url.href;
  } catch {
    /* rơi xuống báo lỗi bên dưới */
  }
  throw new Error("Zalo nhập số điện thoại hoặc link dạng https://zalo.me/…");
}

function cleanFacebook(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol === "https:" && FACEBOOK_HOSTS.includes(url.hostname) && value.length <= 200) return url.href;
  } catch {
    /* rơi xuống báo lỗi bên dưới */
  }
  throw new Error("Facebook nhập link https của facebook.com, fb.com hoặc m.me.");
}

function cleanNote(value: string): string {
  if (value.length > NOTE_MAX) throw new Error(`Ghi chú quá ${NOTE_MAX} ký tự.`);
  return value;
}

/** Kiểm tra và chuẩn hóa khi Chủ bấm Lưu. Sai thì ném câu lỗi tiếng Việt. */
export function cleanSupportContact(input: unknown): SupportContact {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    email: cleanEmail(text(raw.email)),
    zalo: cleanZalo(text(raw.zalo)),
    facebook: cleanFacebook(text(raw.facebook)),
    note: cleanNote(text(raw.note)),
  };
}

/** Đọc giá trị đã lưu. Ô nào hỏng thì bỏ trống ô đó, không làm hỏng cả trang. */
export function readSupportContact(stored: unknown): SupportContact {
  let raw: unknown = stored;
  if (typeof stored === "string") {
    try {
      raw = JSON.parse(stored);
    } catch {
      return { ...EMPTY_CONTACT };
    }
  }
  if (!raw || typeof raw !== "object") return { ...EMPTY_CONTACT };
  const source = raw as Record<string, unknown>;
  const pick = (name: keyof SupportContact, clean: (value: string) => string) => {
    try {
      return clean(text(source[name]));
    } catch {
      return "";
    }
  };
  return { email: pick("email", cleanEmail), zalo: pick("zalo", cleanZalo), facebook: pick("facebook", cleanFacebook), note: pick("note", cleanNote) };
}

export type ContactLink = { kind: "email" | "zalo" | "facebook"; label: string; value: string; href: string };

/** Các cách liên hệ đã điền, kèm liên kết an toàn để bấm. */
export function contactLinks(contact: SupportContact): ContactLink[] {
  const list: ContactLink[] = [];
  if (contact.email) list.push({ kind: "email", label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  if (contact.zalo) {
    const phone = /^\d+$/.test(contact.zalo);
    list.push({ kind: "zalo", label: "Zalo", value: phone ? contact.zalo : "Mở Zalo", href: phone ? `https://zalo.me/${contact.zalo}` : contact.zalo });
  }
  if (contact.facebook) list.push({ kind: "facebook", label: "Facebook", value: "Mở Facebook", href: contact.facebook });
  return list;
}

export function hasContact(contact: SupportContact): boolean {
  return contactLinks(contact).length > 0;
}

/** Tên các ô đã điền, để ghi vào nhật ký thao tác mà không chép lại giá trị. */
export function filledFields(contact: SupportContact): string {
  const names = [contact.email && "email", contact.zalo && "zalo", contact.facebook && "facebook", contact.note && "ghi chu"].filter(Boolean);
  return names.length ? `co: ${names.join(", ")}` : "xoa het";
}
