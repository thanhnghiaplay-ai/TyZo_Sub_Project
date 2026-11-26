// @ts-check
/**
 * Chốt chặn migration (hồ sơ sửa triệt để v5.49.1, R8-003 — Chủ duyệt: CSDL preview riêng, không migration production
 * từ preview; production có sao lưu và chốt). Dùng chung cho scripts/migrate.mjs (lúc dựng) và src/lib/db.ts (lúc chạy).
 */

/**
 * Bản xem trước (VERCEL_ENV=preview) chỉ được chạy migration khi Chủ đã khai báo nó dùng CSDL RIÊNG
 * (TYZO_PREVIEW_DB=rieng, đặt ở biến môi trường Preview của Vercel cùng DATABASE_URL riêng).
 * @param {Record<string, string | undefined>} env
 * @returns {{ run: boolean, reason: string }}
 */
export function previewGate(env) {
  if (env.VERCEL_ENV !== "preview") return { run: true, reason: "" };
  if (env.TYZO_PREVIEW_DB === "rieng") return { run: true, reason: "" };
  return {
    run: false,
    reason: "Bản xem trước chưa khai báo CSDL riêng (TYZO_PREVIEW_DB=rieng): không chạy migration để không đụng CSDL chính thức.",
  };
}

/** Lệnh có thể làm mất dữ liệu hoặc cấu trúc. */
const DESTRUCTIVE = /\b(drop\s+(table|schema|column|database)|truncate\b|delete\s+from\b|alter\s+table\b[^;]*\bdrop\b)/i;

/** @param {string} text */
export function isDestructive(text) {
  const code = text.replace(/--[^\n]*/g, "");
  return DESTRUCTIVE.test(code);
}

/**
 * Migration có lệnh phá dữ liệu chỉ chạy khi Chủ đã sao lưu và cho phép ĐÚNG tệp đó bằng
 * TYZO_ALLOW_DESTRUCTIVE=<tên tệp> (nhiều tệp cách nhau dấu phẩy).
 * @param {string} name
 * @param {string} text
 * CSDL mới tinh (chưa ghi migration nào) thì không chặn: không có dữ liệu để mất (cài VPS mới, CSDL thử).
 * @param {Record<string, string | undefined>} env
 * @param {{ fresh?: boolean }} [db]
 * @returns {string | null} lý do từ chối, hoặc null nếu được chạy
 */
export function destructiveGate(name, text, env, db = {}) {
  if (db.fresh || !isDestructive(text)) return null;
  const allowed = (env.TYZO_ALLOW_DESTRUCTIVE ?? "").split(",").map((x) => x.trim());
  if (allowed.includes(name)) return null;
  return `${name} có lệnh xóa/bỏ dữ liệu. Sao lưu CSDL trước, rồi đặt TYZO_ALLOW_DESTRUCTIVE=${name} để cho phép đúng tệp này.`;
}
