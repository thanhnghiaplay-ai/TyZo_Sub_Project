import { readFileSync, readdirSync } from "node:fs";

/**
 * Chỉ dùng trong test: mã nguồn của phòng dịch = studio.tsx rồi tới các phần con studio-*.ts(x) (tách 23/11/2026).
 * Test đọc mã để kiểm luật bố cục và chữ; luật vẫn đúng dù đoạn mã nằm ở tệp con nào. studio.tsx đứng đầu
 * nên thứ tự trong chính studio.tsx giữ nguyên.
 */
export function studioSource(): string {
  const dir = new URL("./", import.meta.url);
  const parts = readdirSync(dir)
    .filter((name) => /^studio-[a-z-]+\.tsx?$/.test(name) && !name.endsWith(".test.ts") && name !== "studio-source.ts")
    .sort();
  return ["studio.tsx", ...parts].map((name) => readFileSync(new URL(name, dir), "utf8")).join("\n");
}
