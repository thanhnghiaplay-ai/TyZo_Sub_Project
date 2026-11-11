export type AsrWord = { word?: string; start?: number; end?: number };

/**
 * Whisper luôn đặt câu đầu đoạn ở mốc 0 của đoạn, dù tiếng nói bắt đầu muộn hơn
 * (đoạn bị cắt theo cửa sổ 1 giây + đệm 0,3 giây). Mốc từ đầu tiên chính xác hơn.
 * Không có từ nào nằm trong câu thì giữ nguyên mốc cũ.
 */
export function refineTimes(
  start: number,
  end: number,
  words: ReadonlyArray<AsrWord | null> | undefined,
): { start: number; end: number } {
  if (!words?.length || !Number.isFinite(start) || !Number.isFinite(end)) return { start, end };
  const inside = words.filter((w): w is AsrWord => {
    if (!w || !Number.isFinite(w.start) || !Number.isFinite(w.end)) return false;
    const mid = ((w.start as number) + (w.end as number)) / 2;
    return mid >= start - 0.05 && mid <= end + 0.05;
  });
  if (!inside.length) return { start, end };
  const first = inside[0].start as number;
  const last = inside[inside.length - 1].end as number;
  // Chỉ cho dịch mốc vào trong câu, không bao giờ kéo ra ngoài.
  const nextStart = Math.min(Math.max(start, first), end);
  const nextEnd = Math.max(Math.min(end, last), nextStart + 0.2);
  return { start: nextStart, end: nextEnd };
}
