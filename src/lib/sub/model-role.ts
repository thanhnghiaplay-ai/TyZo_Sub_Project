// Ghi chú ngắn: model này làm được việc gì. Dùng ở Admin (chọn gói) và ở mục dùng key riêng.

export type ModelRole = "asr" | "tts" | "guard" | "translate";

export function modelRoleOf(id: string): ModelRole {
  const name = id.toLowerCase();
  if (/whisper|asr|filetrans|transcri/.test(name)) return "asr";
  if (/tts|orpheus|speech|voice/.test(name)) return "tts";
  if (/guard|safeguard|moderat/.test(name)) return "guard";
  return "translate";
}

const NOTE: Record<ModelRole, string> = {
  asr: "Nhận dạng giọng nói thành chữ",
  tts: "Đọc thuyết minh (chữ thành giọng)",
  guard: "Kiểm duyệt nội dung, không dùng để dịch",
  translate: "Dịch và sửa câu (cũng dùng để nhận diện thể loại, phân tích)",
};

/** Việc model làm được, một dòng tiếng Việt. */
export function modelRoleNote(id: string): string {
  return NOTE[modelRoleOf(id)];
}
