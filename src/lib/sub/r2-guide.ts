/** Chữ hướng dẫn cài kho tạm R2 cho Chủ. Thuần, để test được và dùng lại ở trang hướng dẫn dời web. */

export const R2_ENV_NAMES = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;

/** Quy tắc CORS dán vào bucket (Cloudflare → R2 → bucket → Settings → CORS policy). */
export function r2CorsRules(origins: string[]): string {
  const clean = Array.from(new Set(origins.map((o) => o.trim().replace(/\/+$/, "")).filter((o) => /^https?:\/\/[^\s/]+$/.test(o))));
  return JSON.stringify(
    [
      {
        AllowedOrigins: clean,
        AllowedMethods: ["PUT"],
        AllowedHeaders: ["content-type"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
    null,
    2,
  );
}

export const R2_STEPS: string[] = [
  "Cloudflare → R2 → tạo bucket (để RIÊNG TƯ, không bật truy cập công khai).",
  "R2 → Manage API tokens → tạo token quyền Object Read & Write chỉ cho bucket này; lấy Access Key ID và Secret Access Key.",
  "Dán quy tắc CORS bên dưới vào Settings → CORS policy của bucket (thêm tên miền mới mỗi khi dời web).",
  "Settings → Object lifecycle rules: xóa đối tượng sau 1 ngày (lưới an toàn nếu khách đóng trang giữa chừng).",
  "Đặt 4 biến môi trường ở nơi chạy web (Vercel hoặc VPS): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, rồi chạy lại bản web.",
  "Bấm «Kiểm tra kết nối» ở trên: máy chủ thử ghi, đọc và xóa một tệp nhỏ.",
];
