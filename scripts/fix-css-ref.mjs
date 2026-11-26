// Bản dựng cho VPS (NITRO_PRESET=node-server): phần máy chủ gắn styles.css bằng tên băm riêng của nó
// (vd /assets/styles-S5yy….css) nhưng tệp thật chỉ có tên băm của phần trình duyệt (styles-B4Dv….css).
// Trang khi đó hiện trần (chữ mặc định, ô vuông) cho tới lúc JavaScript chèn CSS đúng. Bước này sửa chỗ trỏ trong
// mã máy chủ sang tệp CSS thật (máy chủ Nitro chỉ phục vụ tệp có trong danh sách lúc dựng, nên chép tệp không đủ).
// Chạy sau `vite build`. Không lệch thì không làm gì.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] || ".output";
const pub = join(root, "public", "assets");
if (!existsSync(pub)) {
  console.log(`fix-css-ref: không có ${pub}, bỏ qua.`);
  process.exit(0);
}
const real = readdirSync(pub).filter((name) => /^styles-[\w-]+\.css$/.test(name));
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.m?js$/.test(name)) files.push(path);
  }
};
walk(join(root, "server"));
/** Tên CSS mã máy chủ đang trỏ tới mà không có tệp thật. */
const missingRefs = () => {
  const out = new Set();
  for (const path of files) for (const m of readFileSync(path, "utf8").matchAll(/\/assets\/(styles-[\w-]+\.css)/g)) if (!existsSync(join(pub, m[1]))) out.add(m[1]);
  return [...out];
};
if (real.length !== 1) {
  // Kiểm toán NEW-008: không đoán được tệp đúng thì vẫn kiểm; còn chỗ trỏ sai là làm hỏng lần dựng (VPS giữ bản cũ),
  // không để lên bản trang hiện trần.
  const bad = missingRefs();
  if (bad.length) {
    console.error(`fix-css-ref: thấy ${real.length} tệp styles-*.css và mã máy chủ trỏ tới tệp không có: ${bad.join(", ")}. Dừng.`);
    process.exit(1);
  }
  console.log(`fix-css-ref: thấy ${real.length} tệp styles-*.css, chỗ trỏ đều đúng, không sửa.`);
  process.exit(0);
}
let fixed = 0;
for (const path of files) {
  const text = readFileSync(path, "utf8");
  const next = text.replace(/\/assets\/(styles-[\w-]+\.css)/g, (whole, name) => {
    if (existsSync(join(pub, name))) return whole;
    fixed++;
    console.log(`fix-css-ref: ${name} không có, trỏ sang ${real[0]} (${path}).`);
    return `/assets/${real[0]}`;
  });
  if (next !== text) writeFileSync(path, next);
}
if (!fixed) console.log("fix-css-ref: tên CSS khớp, không cần sửa.");
const left = missingRefs();
if (left.length) {
  console.error(`fix-css-ref: sau khi sửa vẫn còn chỗ trỏ tới tệp không có: ${left.join(", ")}. Dừng.`);
  process.exit(1);
}
