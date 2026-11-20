// Đổi báo cáo đo nhận dạng thành điểm model: npm run asr:grade [-- --write]
// Đọc mọi file eval/asr/out/*.json (do `npm run asr:bench` ghi), tính điểm bằng src/lib/sub/grade-measure.ts.
// Không có --write: chỉ in. Có --write: ghi src/lib/sub/model-grade-measured.ts (đè lên số ước lượng ở model-grade.ts).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { measureGrades, MIN_CASES, type BenchEntry } from "../src/lib/sub/grade-measure.ts";
import type { Lang } from "../src/lib/sub/asr-score.ts";

const dir = "eval/asr/out";
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
if (!files.length) {
  console.error("Chưa có báo cáo nào ở eval/asr/out/. Chạy `npm run asr:bench` trước.");
  process.exit(2);
}
const entries = files.flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as BenchEntry[]);
const cases = JSON.parse(readFileSync("eval/asr/cases.json", "utf8")) as Array<{ id: string; lang: Lang; reference?: string }>;
const langOf = Object.fromEntries(cases.filter((c) => c.reference).map((c) => [c.id, c.lang]));
const grades = measureGrades(entries, langOf);
if (!Object.keys(grades).length) {
  console.log(`Chưa đủ số đo: mỗi model cần từ ${MIN_CASES} clip có đáp án (quality) hoặc ${MIN_CASES} clip Trung, Nhật, Hàn (asian). Thêm clip ở eval/asr/cases.json.`);
  process.exit(1);
}
for (const [model, g] of Object.entries(grades)) console.log(`${model.padEnd(36)} quality ${g.quality ?? "-"}  asian ${g.asian ?? "-"}  (${g.cases} clip)`);
if (process.argv.includes("--write")) {
  const body = Object.entries(grades).map(([model, g]) => `  ${JSON.stringify(model)}: { ${[g.quality !== undefined && `quality: ${g.quality}`, g.asian !== undefined && `asian: ${g.asian}`].filter(Boolean).join(", ")} },`).join("\n");
  const head = readFileSync("src/lib/sub/model-grade-measured.ts", "utf8").split("export const")[0];
  writeFileSync("src/lib/sub/model-grade-measured.ts", `${head}export const MEASURED_GRADE: Record<string, { quality?: number; asian?: number }> = {\n${body}\n};\n`);
  console.log("Đã ghi src/lib/sub/model-grade-measured.ts");
}
