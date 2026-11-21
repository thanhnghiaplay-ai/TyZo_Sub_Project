// Phần thuần của bước «Phân tích nội dung» (analyzeFilm ở groq.ts): dựng câu lệnh và đọc kết quả.
// Tách riêng, chỉ import tương đối, để test được bằng Node không cần mạng (bước C1, HANDOFF_NANG_CAP.md).
import { glossaryList, stripFence, type Bible } from "./text.ts";

export type AnalyzeInput = {
  language: string;
  title: string;
  notes: string;
  gloss: string;
  lines: string[];
};

export type AnalyzeMsg = { role: string; content: string };

/** Phiên bản rút gọn phần giữa khi phụ đề quá dài (giữ đầu, giữa, cuối). */
export const ANALYZE_MAX_CHARS = 40000;

export function analyzeMessages(input: AnalyzeInput): AnalyzeMsg[] {
  let text = input.lines.join("\n");
  if (text.length > ANALYZE_MAX_CHARS) {
    const h = Math.floor(text.length / 2);
    text = text.slice(0, 12000) + "\n[...]\n" + text.slice(h - 6000, h + 6000) + "\n[...]\n" + text.slice(-12000);
  }
  const sys = `You are a film analyst preparing a subtitle translation into ${input.language}. The input is a raw speech-recognition transcript; names are often misspelled. Return only JSON: {"summary":"3-5 sentences in ${input.language}","characters":[{"name":"canonical spelling","variants":["misspellings of this name that appear in the transcript"],"gender":"male|female|unknown","self":"pronoun this person uses for themselves in ${input.language}","addressed":"how others address this person in ${input.language}","note":"role and relationships"}],"terms":[{"src":"place/organization/item/term as in transcript","tgt":"best rendering in ${input.language}, or the same if it should stay"}]}. Include only names and terms actually present, at most 30 characters and 40 terms, and unify spelling variants of the same name. Infer gender from names, grammar and how people speak; do not leave gender unknown when the transcript makes it clear. self and addressed must be concrete address forms in ${input.language} (Vietnamese examples: "tự xưng tôi, được gọi là anh"), or empty strings if truly unknown.`;
  const glossPairs = glossaryList(input.gloss)
    .slice(0, 80)
    .map(([src, tgt]) => (src === tgt ? src : `${src} => ${tgt}`))
    .join("; ");
  const user = `Known info: ${[input.title.trim(), input.notes.trim().slice(0, 1500), glossPairs].filter(Boolean).join(" | ") || "(none)"}\n\nTRANSCRIPT:\n${text}`;
  return [
    { role: "system", content: sys },
    { role: "user", content: user },
  ];
}

/** Đọc JSON model trả về. Hỏng thì ném lỗi để lớp gọi báo «Không tạo được bảng». */
export function parseBible(content: string): Bible {
  const parsed: unknown = JSON.parse(stripFence(content));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Phân tích nội dung trả về dữ liệu không phải đối tượng JSON.");
  return parsed as Bible;
}
