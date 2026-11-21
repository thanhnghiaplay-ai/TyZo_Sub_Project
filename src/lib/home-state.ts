// Hàm thuần cho trang chủ một ô: khi nào hiện ô thả lớn, và dán chữ nào thì coi là link.

/** Thể loại phim: dùng chung cho chip ở trang chủ và ô chọn trong tab Phim. */
export const GENRES: [string, string][] = [
  ["auto", "Tự động"],
  ["action", "Hành động"],
  ["adventure", "Phiêu lưu"],
  ["crime", "Hình sự / giang hồ"],
  ["scifi", "Viễn tưởng / giả tưởng"],
  ["horror", "Kinh dị"],
  ["romance", "Tình cảm / lãng mạn"],
  ["psychological", "Tâm lý"],
  ["comedy", "Hài"],
  ["costume", "Cổ trang / kiếm hiệp"],
  ["historical", "Lịch sử / thời kỳ"],
  ["mystery", "Trinh thám / bí ẩn"],
  ["sports", "Thể thao"],
  ["adult", "Phim có nhãn 18+"],
  ["daily", "Hằng ngày"],
  ["wuxia", "Kiếm hiệp"],
  ["xianxia", "Tiên hiệp"],
  ["ngontinh", "Ngôn tình"],
  ["social", "Tâm lý xã hội"],
  ["war", "Chiến tranh"],
  ["family", "Gia đình"],
  ["school", "Học đường / thanh xuân"],
  ["documentary", "Tài liệu / phóng sự"],
];

/** Thể loại nhãn 18+: một loại duy nhất (v5.20.0 gộp ba mức cũ «18+», «cấp 3», «thoại kín»). */
export const AGE_LEVELS: readonly (readonly [string, string])[] = [["adult", "18+"]];

/**
 * Mã thể loại cũ → mã đang dùng. Lựa chọn khách đã lưu trên máy, dữ liệu Admin và thuật ngữ cũ đều đổi qua đây.
 * «Phim bộ / phim mới chiếu» bỏ hẳn (không gợi ý dịch phim đang chiếu), quy về Tự động.
 */
const OLD_GENRES: Record<string, string> = { softcore: "adult", sex: "adult", series: "auto" };

export function currentGenre(genre: string): string {
  const id = (genre || "").trim().toLowerCase();
  return OLD_GENRES[id] ?? id;
}

/** Thể loại 18+: mỗi bộ đứng riêng, và khách phải xác nhận trên 18 tuổi mới được chọn. */
export const AGE_GATE_GENRES: ReadonlySet<string> = new Set(AGE_LEVELS.map(([id]) => id));

export function needsAgeConfirm(genre: string): boolean {
  return AGE_GATE_GENRES.has(currentGenre(genre));
}

export type HomeInput = {
  hasSegs: boolean;
  running: boolean;
  analyzing: boolean;
  reviewHold: boolean;
  /** Khách đã bấm một mục trong menu trái (Key, Phim, Nhân vật…): hiện khung đầy đủ. */
  forced: boolean;
};

/** Trang chủ gọn (một ô thả lớn) chỉ hiện khi chưa có gì để xem và không đang chạy. */
export function showHomeHero(input: HomeInput): boolean {
  if (input.forced) return false;
  return !input.hasSegs && !input.running && !input.analyzing && !input.reviewHold;
}

/**
 * Lấy link http/https từ chữ dán. Chỉ nhận khi cả đoạn dán là một link (không khoảng trắng giữa).
 * Trả null nếu là chữ thường, nhiều dòng, hay giao thức khác.
 */
export function pastedLink(text: string): string | null {
  const value = text.trim();
  if (!value || value.length > 2048 || /\s/.test(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** Dán trong ô gõ chữ thì để yên cho ô đó. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const node = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!node || typeof node.tagName !== "string") return false;
  const tag = node.tagName.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(node.isContentEditable);
}
