// Đo nhận dạng giọng nói tự động. Hai chế độ:
//
// 1) CHẤM MỘT FILE SRT (không cần mạng, bất kỳ nhà cung cấp nào: xuất SRT chép thô từ app rồi chấm):
//    npm run asr:score -- <file.srt> --lang zh [--ref dap-an.srt] [--duration 34]
//
// 2) CHẠY THẬT với Groq Whisper, so các biến thể prompt × model trên các clip trong eval/asr/cases.json:
//    GROQ_API_KEY=... npm run asr:bench -- [--case id] [--models whisper-large-v3,whisper-large-v3-turbo]
//                                          [--variants default,noprompt,noguard,guard] [--repeat 1]
//    Cần ffmpeg. Âm thanh được nén giống app (mono 16 kHz Opus 20 kbps) và chỉ lấy 60 giây đầu (một đoạn như app).
//    GROQ_BASE_URL đổi địa chỉ API (dùng khi thử bằng máy chủ giả). Ghi báo cáo JSON vào eval/asr/out/ . Thoát mã 1 nếu biến thể «default» (đúng như app đang gửi) bị HỎNG.
//
// Biến thể: default = prompt đúng như app gửi (asrPrompt với thể loại của clip); noprompt = không gửi prompt;
// noguard = chỉ tên phim + thuật ngữ; guard = ép gửi cả ASR_GUARD (như phim 18+).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cuesText, parseSrt, scoreAsr, type AsrVerdict, type Cue, type Lang } from "../src/lib/sub/asr-score.ts";
import { asrPrompt } from "../src/lib/sub/text.ts";

type Case = { id: string; audio: string; lang: Lang; genre: string; title: string; gloss?: string; reference?: string; referenceStatus?: string };

function flag(name: string, fallback = ""): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function show(label: string, verdict: AsrVerdict) {
  const m = verdict.metrics;
  const er = m.errorRate === null ? "  -  " : `${(m.errorRate * 100).toFixed(0).padStart(3)}%`;
  const notes = [...verdict.fails, ...verdict.warns].join(" | ");
  console.log(`${label.padEnd(44)} ${verdict.status.toUpperCase().padEnd(5)} câu ${String(m.cues).padStart(3)}  ${m.charsPerSec.toFixed(2).padStart(5)} chữ/giây  sai khác ${er}  ${notes}`);
}

function score(): number {
  const file = process.argv[3];
  const lang = flag("lang") as Lang;
  if (!file || !["zh", "ja", "ko", "en"].includes(lang)) {
    console.error("Cách dùng: asr-bench.ts score <file.srt> --lang <zh|ja|ko|en> [--ref dap-an.srt] [--duration giây]");
    return 2;
  }
  const cues = parseSrt(readFileSync(file, "utf8"));
  const ref = flag("ref");
  const duration = Number(flag("duration")) || undefined;
  const verdict = scoreAsr({ cues, lang, durationSec: duration, reference: ref ? cuesText(parseSrt(readFileSync(ref, "utf8"))) : undefined });
  show(file, verdict);
  console.log(JSON.stringify(verdict.metrics));
  return verdict.status === "fail" ? 1 : 0;
}

const VARIANTS: Record<string, (c: Case) => string> = {
  default: (c) => asrPrompt(c.title, c.gloss ?? "", c.genre),
  noprompt: () => "",
  noguard: (c) => asrPrompt(c.title, c.gloss ?? "", ""),
  guard: (c) => asrPrompt(c.title, c.gloss ?? "", "sex"),
};

function pack(audio: string, dir: string): string {
  const out = join(dir, "clip.ogg");
  try {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", audio, "-vn", "-t", "60", "-ac", "1", "-ar", "16000", "-c:a", "libopus", "-b:a", "20k", out]);
  } catch {
    throw new Error("Không chạy được ffmpeg (cần cài ffmpeg và có libopus).");
  }
  return out;
}

// Giữ khớp với transcribeOnce ở src/lib/sub/groq.ts: verbose_json, temperature 0, mốc từ + câu, language, prompt.
async function whisper(file: string, key: string, model: string, lang: string, prompt: string): Promise<Cue[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const form = new FormData();
    form.append("file", new Blob([readFileSync(file)]), "audio.ogg");
    form.append("model", model);
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
    form.append("language", lang);
    if (prompt) form.append("prompt", prompt);
    const base = (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    if (response.status === 429) {
      const wait = Number(response.headers.get("retry-after")) || 10 * (attempt + 1);
      console.error(`  Groq giới hạn tốc độ, chờ ${wait} giây…`);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`Groq lỗi ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const data = (await response.json()) as { segments?: Array<{ text?: string; start?: number; end?: number }> };
    return (data.segments ?? []).map((s) => ({ start: s.start ?? 0, end: s.end ?? 0, text: (s.text ?? "").trim() })).filter((c) => c.text);
  }
  throw new Error("Groq vẫn giới hạn tốc độ sau 4 lần thử.");
}

async function bench(): Promise<number> {
  const key = (process.env.GROQ_API_KEY ?? "").trim();
  if (!key) {
    console.error("Cần biến môi trường GROQ_API_KEY.");
    return 2;
  }
  const only = flag("case");
  const cases = (JSON.parse(readFileSync("eval/asr/cases.json", "utf8")) as Case[]).filter((c) => !only || c.id === only);
  const models = flag("models", "whisper-large-v3,whisper-large-v3-turbo").split(",").map((s) => s.trim()).filter(Boolean);
  const variants = flag("variants", "default,noprompt,noguard").split(",").map((s) => s.trim()).filter(Boolean);
  const repeat = Math.max(1, Number(flag("repeat", "1")) || 1);
  for (const name of variants) if (!VARIANTS[name]) throw new Error(`Biến thể không có: ${name}`);
  const report: unknown[] = [];
  let defaultFailed = false;
  const work = mkdtempSync(join(tmpdir(), "asr-bench-"));
  try {
    for (const c of cases) {
      if (!existsSync(c.audio)) {
        console.error(`Bỏ qua ${c.id}: thiếu file âm thanh ${c.audio} (không đưa vào git, tự đặt vào).`);
        continue;
      }
      const reference = c.reference ? cuesText(parseSrt(readFileSync(c.reference, "utf8"))) : undefined;
      if (c.referenceStatus) console.log(`[${c.id}] đáp án: ${c.referenceStatus}`);
      const clip = pack(c.audio, work);
      for (const model of models) {
        for (const name of variants) {
          for (let run = 1; run <= repeat; run++) {
            const prompt = VARIANTS[name](c);
            const cues = await whisper(clip, key, model, c.lang, prompt);
            const verdict = scoreAsr({ cues, lang: c.lang, reference });
            show(`${c.id} · ${model.replace("whisper-", "")} · ${name}${repeat > 1 ? ` #${run}` : ""}`, verdict);
            report.push({ case: c.id, model, variant: name, run, prompt, verdict, cues });
            if (name === "default" && verdict.status === "fail") defaultFailed = true;
          }
        }
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  if (!report.length) {
    console.error("Không chạy được trường hợp nào, không ghi báo cáo.");
    return 2;
  }
  mkdirSync("eval/asr/out", { recursive: true });
  const outFile = `eval/asr/out/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nBáo cáo: ${outFile}`);
  if (defaultFailed) console.log("BIẾN THỂ «default» (đúng như app gửi) BỊ HỎNG: xem dòng FAIL ở trên.");
  return defaultFailed ? 1 : 0;
}

const mode = process.argv[2];
const code = mode === "score" ? score() : mode === "run" ? await bench() : (console.error("Cách dùng: asr-bench.ts <score|run> …"), 2);
process.exit(code);
