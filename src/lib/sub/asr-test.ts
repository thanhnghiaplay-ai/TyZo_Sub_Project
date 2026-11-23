/**
 * Công tắc THỬ NGHIỆM cho nhận dạng (chỉ để dò lỗi Whisper bỏ lời). Mặc định TẮT: không có tham số thì app chạy y như cũ.
 * Bật bằng cách mở app với `?asrtest=...` (lưu vào trình duyệt, lần sau vẫn còn đến khi tắt):
 *   noprompt     không gửi prompt (tên phim, thuật ngữ, ASR_GUARD) lên Whisper
 *   noguard      vẫn gửi tên phim + thuật ngữ nhưng BỎ câu ASR_GUARD (tiếng Anh) khỏi prompt
 *   chunk15      cắt đoạn 15 giây thay vì 60 (số từ 8 đến 60)
 *   off          tắt hết
 * Ghép bằng dấu phẩy: `?asrtest=noprompt,chunk15`.
 */
type AsrTest = { noPrompt: boolean; noGuard: boolean; chunkSeconds: number | null };

const ASR_TEST_KEY = "tyzo-asr-test";
const OFF: AsrTest = { noPrompt: false, noGuard: false, chunkSeconds: null };

export function parseAsrTest(raw: string | null | undefined): AsrTest {
  const out: AsrTest = { ...OFF };
  for (const part of String(raw || "").toLowerCase().split(",")) {
    const word = part.trim();
    if (word === "noprompt") out.noPrompt = true;
    if (word === "noguard") out.noGuard = true;
    const match = /^chunk(\d{1,2})$/.exec(word);
    if (match) {
      const seconds = Number(match[1]);
      if (seconds >= 8 && seconds <= 60) out.chunkSeconds = seconds;
    }
  }
  return out;
}

export function asrTestLabel(test: AsrTest): string {
  const parts: string[] = [];
  if (test.noPrompt) parts.push("không gửi prompt");
  else if (test.noGuard) parts.push("bỏ câu ASR_GUARD khỏi prompt");
  if (test.chunkSeconds) parts.push(`cắt đoạn ${test.chunkSeconds} giây`);
  return parts.join(", ");
}

/** Đọc từ `?asrtest=` (ghi vào trình duyệt) hoặc từ giá trị đã lưu. Mọi lỗi (không có trình duyệt, bị chặn lưu) đều trả về TẮT. */
export function readAsrTest(): AsrTest {
  try {
    if (typeof window === "undefined") return { ...OFF };
    const fromUrl = new URLSearchParams(window.location.search).get("asrtest");
    if (fromUrl !== null) {
      const word = fromUrl.trim().toLowerCase();
      try {
        if (word === "off" || word === "") window.localStorage.removeItem(ASR_TEST_KEY);
        else window.localStorage.setItem(ASR_TEST_KEY, word);
      } catch {
        /* không lưu được thì chỉ dùng cho lần này */
      }
      return word === "off" ? { ...OFF } : parseAsrTest(word);
    }
    return parseAsrTest(window.localStorage.getItem(ASR_TEST_KEY));
  } catch {
    return { ...OFF };
  }
}
