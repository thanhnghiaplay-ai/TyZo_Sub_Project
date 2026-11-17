/**
 * ĐIỂM MODEL (0 đến 10) cho bảng kéo thanh tự dựng gói (pack-auto.ts).
 * quality: độ chính xác chung · speed: độ nhanh (10 nhanh nhất) · asian: mạnh tiếng Trung, Nhật, Hàn.
 * Model chat của Groq lấy thẳng từ CHAT_MODELS (speed token/giây chia 100, tối đa 10), không chép hai lần.
 * Các model còn lại (Alibaba, nhận dạng, đọc) là ƯỚC LƯỢNG của người làm, Chủ cần xem lại. Sửa ở GRADE_FIX.
 * Model chưa có điểm thì gradeOf trả null và tự dựng gói bỏ qua model đó (không đoán).
 */
import { CHAT_MODELS } from "./models.ts";

export type ModelGrade = { quality: number; speed: number; asian: number };

/** ƯỚC LƯỢNG, chưa đo. Chủ sửa số ở đây khi có kết quả thật. */
const GRADE_FIX: Record<string, ModelGrade> = {
  // Alibaba, dịch bằng mô hình ngôn ngữ
  "qwen-turbo": { quality: 6.5, speed: 8, asian: 8 },
  "qwen-plus": { quality: 8, speed: 6, asian: 9 },
  "qwen-max": { quality: 9, speed: 3.5, asian: 9.5 },
  // Nhận dạng
  "whisper-large-v3-turbo": { quality: 7, speed: 9, asian: 6.5 },
  "whisper-large-v3": { quality: 8, speed: 6, asian: 7 },
  "qwen-audio-3.0-asr-flash-filetrans": { quality: 8, speed: 5, asian: 9 },
  "qwen3-asr-flash": { quality: 7.5, speed: 8, asian: 9 },
  "deepgram-nova-3": { quality: 8.5, speed: 7, asian: 8 },
  "deepgram-nova-3-multi": { quality: 8, speed: 7, asian: 8 },
  // Đọc thuyết minh
  "canopylabs/orpheus-v1-english": { quality: 7.5, speed: 7, asian: 0 },
  "canopylabs/orpheus-arabic-saudi": { quality: 7.5, speed: 7, asian: 0 },
};

const CHAT_GRADE = new Map<string, ModelGrade>(
  CHAT_MODELS.map((m) => [m.id, { quality: m.quality, speed: Math.min(10, m.speed / 100), asian: m.asian }]),
);

export function gradeOf(model: string): ModelGrade | null {
  return GRADE_FIX[model] ?? CHAT_GRADE.get(model) ?? null;
}
