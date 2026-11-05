import type { Bible } from "@/lib/sub/text";
import type { NarrationSettings } from "@/lib/sub/types";

export type CastGender = NarrationSettings["gender"];

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function norm(value: string) {
  return value.trim().toLowerCase();
}

/** Tự xưng đứng đầu câu. Chỉ dùng khi token đó không phải cách gọi người khác. */
function leadingToken(text: string, token: string) {
  const body = text.trim().replace(/^[\s"'“”«»（(【\[]+/, "");
  if (!body || token.length < 2) return false;
  return new RegExp(`^${escapeReg(token)}(?=$|[^\\p{L}\\p{N}])`, "iu").test(body);
}

function speakerPrefix(text: string, name: string) {
  const body = text.trim();
  if (!body || name.length < 2) return false;
  return new RegExp(`^${escapeReg(name)}\\s*[:：\\-—]`, "iu").test(body);
}

function selfPieces(self: string | undefined) {
  return (self || "")
    .split(/[/|,，、;；]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 16);
}

function addressedPieces(addressed: string | undefined) {
  return selfPieces(addressed);
}

type CastCharacter = NonNullable<Bible["characters"]>[number];

/** Token tự xưng bị bỏ nếu một nhân vật khác dùng đúng từ đó để gọi người ta. */
function blockedByAddress(token: string, owner: CastCharacter, known: CastCharacter[]) {
  const key = norm(token);
  return known.some(
    (other) => other !== owner && addressedPieces(other.addressed).some((piece) => norm(piece) === key),
  );
}

/**
 * Chọn giọng nam/nữ cho một câu dựa trên bảng nhân vật.
 * Trả về null khi không đủ chắc — người gọi sẽ dùng giọng dự phòng.
 * Không đoán theo tên được nhắc giữa câu.
 * Không dùng tự xưng nếu từ đó cũng là cách người khác được gọi (anh/em).
 */
export function voiceGenderForLine(original: string, spoken: string, bible: Bible | null): "female" | "male" | null {
  const chars = (bible && !bible.failed ? bible.characters : []) || [];
  const known = chars.filter((c) => c.gender === "male" || c.gender === "female");
  if (!known.length) return null;

  const selfOwners = new Map<string, number>();
  for (const character of known) {
    for (const piece of selfPieces(character.self)) {
      const key = norm(piece);
      selfOwners.set(key, (selfOwners.get(key) || 0) + 1);
    }
  }

  let best: { gender: "female" | "male"; score: number } | null = null;
  let second = 0;
  for (const character of known) {
    const gender = character.gender === "male" ? "male" : "female";
    let score = 0;
    const names = [character.name, ...(character.variants || [])]
      .map((name) => (name || "").trim())
      .filter((name) => name.length > 1);
    for (const name of names) {
      if (speakerPrefix(original, name) || speakerPrefix(spoken, name)) score += 10;
    }
    for (const piece of selfPieces(character.self)) {
      if ((selfOwners.get(norm(piece)) || 0) !== 1) continue;
      if (blockedByAddress(piece, character, known)) continue;
      if (leadingToken(spoken, piece) || leadingToken(original, piece)) score += 6;
    }
    if (score <= 0) continue;
    if (!best || score > best.score) {
      second = best?.score ?? 0;
      best = { gender, score };
    } else if (score > second) second = score;
  }
  if (!best || best.score < 6) return null;
  if (second >= 6 && best.score - second < 3) return null;
  return best.gender;
}

/** Bảng nhân vật thắng. Không khớp thì dùng cao độ. Cả hai không có thì giữ giọng dự phòng. */
export function narrationChoice(
  matchCast: boolean,
  fallback: CastGender,
  original: string,
  spoken: string,
  pitchVoice: "female" | "male" | undefined,
  bible: Bible | null,
): { gender: CastGender; locked: boolean } {
  if (!matchCast) return { gender: fallback, locked: false };
  const fromCast = voiceGenderForLine(original, spoken, bible);
  if (fromCast) return { gender: fromCast, locked: true };
  if (pitchVoice === "male" || pitchVoice === "female") return { gender: pitchVoice, locked: true };
  return { gender: fallback, locked: false };
}
