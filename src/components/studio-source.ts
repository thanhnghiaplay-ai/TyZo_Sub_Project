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
  // Thẻ của màn hình dịch nằm ở studio-panels/ (đợt 5 tách file): chèn mã thẻ vào đúng chỗ <XPanel … /> để thứ tự chữ như cũ.
  const panelDir = new URL("./studio-panels/", import.meta.url);
  const panels = new Map(
    readdirSync(panelDir)
      .filter((name) => name.endsWith("-panel.tsx"))
      .map((name) => {
        const text = readFileSync(new URL(name, panelDir), "utf8");
        const comp = /export function (\w+Panel)\(/.exec(text)?.[1] ?? "";
        return [comp, text] as const;
      }),
  );
  const studio = readFileSync(new URL("studio.tsx", dir), "utf8").replace(/<(\w+Panel) [^>]*\/>/g, (tag, comp: string) => panels.get(comp) ?? tag);
  return [studio, ...parts.map((name) => readFileSync(new URL(name, dir), "utf8"))].join("\n");
}
