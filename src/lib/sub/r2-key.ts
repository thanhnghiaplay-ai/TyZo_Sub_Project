/** Luật tên đối tượng và giới hạn khi khách tải âm thanh tạm lên R2. Thuần, test được. */

/** Âm thanh đã tách ở máy khách: Opus 20 kbps khoảng 9 MB/giờ, WAV 16 kHz đơn kênh khoảng 115 MB/giờ. */
export const R2_MAX_BYTES = 600 * 1024 * 1024;
export const R2_PUT_SECONDS = 30 * 60;
/** Nhà nhận dạng có thể chờ tới 3 giờ, nên link đọc sống lâu hơn thế. */
export const R2_GET_SECONDS = 6 * 60 * 60;

const EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

export function r2ExtFor(contentType: string): string | null {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return EXT[base] ?? null;
}

export function r2UploadProblem(input: { size: number; contentType: string }): string | null {
  if (!r2ExtFor(input.contentType)) return "Chỉ nhận âm thanh webm, ogg, wav, mp3 hoặc m4a.";
  if (!Number.isFinite(input.size) || input.size <= 0) return "Tệp âm thanh rỗng.";
  if (input.size > R2_MAX_BYTES) return `Âm thanh lớn quá ${Math.round(R2_MAX_BYTES / 1024 / 1024)} MB.`;
  return null;
}

/** Mỗi khách một thư mục riêng; phần ngẫu nhiên khó đoán do máy chủ sinh. */
export function r2ObjectKey(userId: string, random: string, ext: string): string {
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, "");
  const safeRandom = random.replace(/[^A-Za-z0-9]/g, "");
  if (!safeUser || safeRandom.length < 16) throw new Error("Không dựng được tên tệp tạm.");
  return `u/${safeUser}/${safeRandom}.${ext}`;
}

/** Khách chỉ được xóa đúng tệp của mình. */
export function r2KeyOwnedBy(key: string, userId: string): boolean {
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, "");
  return !!safeUser && new RegExp(`^u/${safeUser}/[A-Za-z0-9]{16,}\\.(webm|ogg|wav|mp3|m4a)$`).test(key);
}
