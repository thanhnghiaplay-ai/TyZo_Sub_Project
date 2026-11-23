import { parseSrt, scoreAsr, type AsrVerdict, type Lang } from "./asr-score.ts";

type ScoreRun =
  | { ok: false; error: string }
  | { ok: true; verdict: AsrVerdict; statusLabel: string; rows: [string, string][] };

const STATUS_LABEL: Record<AsrVerdict["status"], string> = {
  pass: "Đạt",
  warn: "Đạt, có cảnh báo",
  fail: "Không đạt",
};

/** Hiện số thập phân kiểu Việt (dấu phẩy). */
function num(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Chấm một bản SRT dán vào Admin. Thuần, không mạng; chạy được trong trình duyệt. */
export function runScore(input: { srt: string; lang: Lang; durationText?: string; reference?: string }): ScoreRun {
  if (!input.srt.trim()) return { ok: false, error: "Dán nội dung tệp SRT vào ô trên." };
  const cues = parseSrt(input.srt);
  if (!cues.length) return { ok: false, error: "Không đọc được câu nào. SRT cần có dòng mốc giờ dạng 00:00:01,000 --> 00:00:03,500." };
  const raw = (input.durationText ?? "").trim().replace(",", ".");
  let durationSec: number | undefined;
  if (raw) {
    durationSec = Number(raw);
    if (!Number.isFinite(durationSec) || durationSec <= 0) return { ok: false, error: "Độ dài video phải là số giây lớn hơn 0, hoặc để trống." };
  }
  const reference = (input.reference ?? "").trim();
  const verdict = scoreAsr({ cues, lang: input.lang, durationSec, reference: reference ? reference : undefined });
  const m = verdict.metrics;
  const rows: [string, string][] = [
    ["Số câu", String(m.cues)],
    ["Độ dài", `${num(m.durationSec, 1)} giây`],
    ["Thời gian có lời", `${num(m.speechSec, 1)} giây (${Math.round(m.coverage * 100)}%)`],
    ["Số chữ", String(m.chars)],
    ["Chữ mỗi giây", num(m.charsPerSec, 2)],
    ["Câu dài mà ít chữ", String(m.sparseCues)],
    ["Câu quá ngắn", `${Math.round(m.tinyCueRatio * 100)}%`],
    ["Cặp câu lặp", String(m.duplicatePairs)],
    ["Chữ đúng ngôn ngữ", m.scriptShare === null ? "—" : `${Math.round(m.scriptShare * 100)}%`],
  ];
  if (m.errorRate !== null) rows.push(["Sai khác so với đáp án", `${Math.round(m.errorRate * 100)}%`]);
  return { ok: true, verdict, statusLabel: STATUS_LABEL[verdict.status], rows };
}
