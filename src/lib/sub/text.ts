import type { Seg } from "@/lib/sub/types";
import { measurePitch } from "./pitch-voice.ts";

export const SR = 16000;
export const CHUNK_SECONDS = 60;
export const OVERLAP_SECONDS = 2;
export const MIN_CHUNK_SECONDS = 10;
export const MAX_MINUTES = 120;
export const MAX_BYTES = 1024 * 1024 * 1024;
export const MAX_STREAM_HOURS = 10;
export const SILENCE_RMS = 0.005;
export const SILENCE_WINDOW_SECONDS = 1;
export const BATCH = 8;
/** Câu ngắn vẫn giữ khi Whisper đưa avg_logprob từ mốc này trở lên. Thiếu số thì giữ luật cũ. */
export const SHORT_LOGPROB_KEEP = -0.6;

export function rms(samples: Float32Array): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < samples.length; i += 8) {
    sum += samples[i] * samples[i];
    count++;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

/** RMS từng cửa sổ. Không chỉnh biên độ theo cả đoạn. */
export function windowRms(samples: Float32Array, windowSeconds = SILENCE_WINDOW_SECONDS): number[] {
  if (!samples.length) return [];
  const window = Math.max(1, Math.floor(windowSeconds * SR));
  const levels: number[] = [];
  for (let start = 0; start < samples.length; start += window) {
    levels.push(rms(samples.subarray(start, Math.min(samples.length, start + window))));
  }
  return levels;
}

/** Im lặng chỉ khi mọi cửa sổ đều dưới ngưỡng cũ. Một giây có tiếng là đủ để giữ đoạn. */
export function isSilentChunk(samples: Float32Array): boolean {
  if (!samples.length) return true;
  const window = Math.max(1, Math.floor(SILENCE_WINDOW_SECONDS * SR));
  for (let start = 0; start < samples.length; start += window) {
    if (rms(samples.subarray(start, Math.min(samples.length, start + window))) >= SILENCE_RMS) return false;
  }
  return true;
}

export function splitAudio(audio: Float32Array): Array<[number, number]> {
  const chunk = CHUNK_SECONDS * SR;
  const overlap = Math.floor(OVERLAP_SECONDS * SR);
  const minChunk = MIN_CHUNK_SECONDS * SR;
  const windowSize = Math.floor(SR / 5);
  const result: Array<[number, number]> = [];
  let start = 0;
  while (start < audio.length) {
    let end = Math.min(start + chunk, audio.length);
    if (end < audio.length && audio.length - end < minChunk) {
      end = audio.length;
    } else if (end < audio.length && windowSize > 0) {
      let bestEnergy = Infinity;
      let bestEnd = end;
      const searchFrom = Math.max(start, end - 5 * SR);
      for (let i = searchFrom; i + windowSize <= end; i += windowSize) {
        let energy = 0;
        for (let j = i; j < i + windowSize; j += 4) energy += audio[j] * audio[j];
        if (energy < bestEnergy) {
          bestEnergy = energy;
          bestEnd = i + Math.floor(windowSize / 2);
        }
      }
      end = Math.min(audio.length, Math.max(bestEnd, Math.min(start + minChunk, audio.length)));
    }
    if (end <= start) end = Math.min(audio.length, start + chunk);
    result.push([start, end]);
    if (end >= audio.length) break;
    const next = end - overlap;
    start = next > start ? next : end;
  }
  return result;
}

export function streamParts(dur: number): Array<[number, number]> {
  const total = Math.floor(dur * SR);
  const chunk = CHUNK_SECONDS * SR;
  const overlap = OVERLAP_SECONDS * SR;
  const minChunk = MIN_CHUNK_SECONDS * SR;
  const out: Array<[number, number]> = [];
  for (let st = 0; st < total; ) {
    let en = Math.min(st + chunk, total);
    if (total - en < minChunk) en = total;
    out.push([st, en]);
    if (en >= total) break;
    st = en - overlap;
  }
  return out;
}

export function speechIndex(items: Seg[], clock: number, offset: number): number {
  return findCueIndex(items, clock - offset);
}

export function findCueIndex(items: Seg[], time: number): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0) return -1;
  for (let k = found; k >= 0; k--) {
    if (time - items[k].start > 30) break;
    const end = items[k].end > items[k].start ? items[k].end : items[k].start + 0.4;
    if (time < end + 0.05) return k;
  }
  return -1;
}

export function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s % 60).padStart(2, "0");
}

function srtTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

export function cueText(seg: Seg): string {
  if (seg.translationFailed || seg.translation === null) return "";
  return seg.translation.trim();
}

function srtBlocks(items: Seg[], textOf: (seg: Seg) => string): string {
  return items
    .map((seg, index) => {
      let end = seg.end > seg.start ? seg.end : seg.start + 0.4;
      const nx = items[index + 1];
      if (nx && end > nx.start - 0.02) end = Math.max(seg.start + 0.02, Math.min(end, nx.start - 0.02));
      const text = textOf(seg)
        .replace(/\s*\n\s*/g, " ")
        .trim();
      return `${index + 1}\n${srtTimestamp(seg.start)} --> ${srtTimestamp(end)}\n${text}\n`;
    })
    .join("\n");
}

export function toSrt(items: Seg[]): string {
  return srtBlocks(items, (seg) => {
    const pending = seg.translation === null || !seg.translation.trim();
    return seg.translationFailed ? `[không dịch được] ${seg.original}` : pending ? `[chưa dịch] ${seg.original}` : cueText(seg);
  });
}

/** Bản nhận dạng gốc của Whisper, từng câu theo giờ, trước khi qua bước phân tích phim và dịch. */
export function toRawSrt(items: Seg[]): string {
  return srtBlocks(items, (seg) => seg.raw ?? seg.original);
}

export function stripFence(content: string): string {
  const raw = content.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : raw;
}

export function parseTranslations(content: string, count: number): string[] {
  let parsed: { t?: unknown };
  try {
    parsed = JSON.parse(stripFence(content)) as { t?: unknown };
  } catch {
    throw new Error("Model dịch trả về JSON không hợp lệ.");
  }
  const arr = parsed && Array.isArray(parsed.t) ? parsed.t : null;
  if (!arr) throw new Error("Kết quả dịch không đúng định dạng.");
  if (arr.length !== count) throw new Error("Model dịch trả thiếu câu.");
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const item = arr[i];
    lines.push(typeof item === "string" ? item : "");
  }
  return lines;
}

/** Ô trống sau khi parse: chỉ những vị trí này được gửi dịch lại. */
export function blankTranslationIndexes(lines: string[]): number[] {
  return lines.map((line, index) => (line.trim() ? -1 : index)).filter((index) => index >= 0);
}

export function contiguousRuns(indexes: number[]): number[][] {
  const runs: number[][] = [];
  for (const index of [...indexes].filter((n) => n >= 0).sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === index - 1) last.push(index);
    else runs.push([index]);
  }
  return runs;
}

export type TranslationOpts = {
  ctx?: Array<string | { o: string; t: string }>;
  nxt?: string[];
  fix?: boolean;
  genre: string;
  context: string;
};

/** Khi cắt một phần batch, vẫn gửi ctx / câu xung quanh và nguyên khối addressLock + bible trong `context`. */
export function optsForRange(
  opts: TranslationOpts,
  texts: string[],
  start: number,
  end: number,
  known?: Array<string | null | undefined>,
): TranslationOpts {
  const before = texts.slice(0, start).map((original, index) => {
    const done = known?.[index];
    return done && done.trim() ? { o: original, t: done } : original;
  });
  return {
    ...opts,
    ctx: [...(opts.ctx ?? []), ...before],
    nxt: [...texts.slice(end), ...(opts.nxt ?? [])],
  };
}

/** Ghi đè đúng các vị trí được dịch lại. Câu không nằm trong `indexes` giữ nguyên. */
export function applyIndexTranslations(full: string[], indexes: number[], replacements: string[]): string[] {
  const out = full.slice();
  indexes.forEach((index, k) => {
    const next = replacements[k];
    if (next && next.trim()) out[index] = next;
  });
  return out;
}

const HALLU =
  /^(thanks? for watching|thank you for (watching|listening)|subtitles? (by|from)|translated by|please (like|subscribe)|amara\.org|cảm ơn (các )?bạn (đã )?(xem|theo dõi)|đăng ký kênh|ご視聴ありがとう|チャンネル登録|시청해 주셔서|구독과 좋아요|字幕|请不吝)/i;
const VOCAL =
  /^(?:a+|ah+|aah+|ahh+|uh+|um+|uhm+|er+|err+|eh+|oh+|ooh+|hm+|hmm+|mm+|mmm+|mhm+|ngh+|ha+|hah+|heh+|sigh|sighs|moan|moans|moaning|breath|breaths|breathing|gasp|gasps|gasping|groan|groans|groaning|pant|pants|panting|sniff|sniffs|sniffing|huff|huffs|whimper|whimpers|grunt|grunts|thở|rên|rên rỉ)$/iu;
const SOUND_TAG =
  /^(?:music|applause|laughter|laughing|laughs|silence|noise|blank_audio|inaudible|background(?: noise)?|breath(?:ing)?|sigh(?:ing)?|moan(?:ing)?|gasp(?:ing)?|pant(?:ing)?|groan(?:ing)?|sniff(?:ing)?|cough(?:ing)?|crying|scream(?:ing)?|whisper(?:ing)?|non-?speech)$/iu;

/** Whisper often writes a lone "A" / "Ah" for breaths and moans. Drop those lines even when the model is confident. */
export function isNonSpeech(raw: string): boolean {
  let text = raw.trim();
  if (!text) return true;
  if (/ignore breathing|non-speech|never write a lone|only clear spoken/i.test(text)) return true;
  text = text.replace(/^[([{*«"'“‘\s]+|[)\]}*»"'”’\s]+$/g, "").trim();
  if (!text || SOUND_TAG.test(text)) return true;
  const parts = text.split(/[\s,./!?…~·|+\-–—;:]+/u).filter(Boolean);
  if (!parts.length) return true;
  return parts.every((part) => VOCAL.test(part.replace(/^[([{*]+|[)\]}*]+$/g, "")));
}

export const ASR_GUARD =
  "Ignore breathing, moaning, sighs, gasps and other non-speech. Only transcribe clear words. Never write a lone A or Ah for a sound.";

export function asrPrompt(title: string, gloss: string): string {
  const vocab = [title.trim(), ...glossaryList(gloss).map((item) => item[0])].filter(Boolean).join(", ");
  const room = 420 - ASR_GUARD.length - 2;
  return [vocab.slice(0, Math.max(0, room)), ASR_GUARD].filter(Boolean).join(". ").slice(0, 420);
}
const normT = (t: string) => t.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");

export type AcceptReject =
  | "bad_time"
  | "empty"
  | "no_letters"
  | "non_speech"
  | "hallucination"
  | "compression"
  | "low_confidence"
  | "short_uncertain"
  | "brief_uncertain"
  | "overlap"
  | "duplicate";

export type AcceptResult = {
  accepted: boolean;
  reason: AcceptReject | null;
  start: number | null;
  end: number | null;
  text: string;
};

function rejected(reason: AcceptReject, start: number | null, end: number | null, text: string): AcceptResult {
  return { accepted: false, reason, start, end, text };
}

export function acceptSegment(
  segs: Seg[],
  chunkStart: number,
  relStart: number,
  relEnd: number,
  text: string,
  partIndex: number,
  item: { no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number } = {},
  samples?: Float32Array | null,
  overlapGate = partIndex > 0,
): AcceptResult {
  if (!Number.isFinite(relStart) || !Number.isFinite(relEnd)) return rejected("bad_time", null, null, text);
  const cleaned = text.trim().replace(/(.{2,40}?)(?:[\s,.!?…]+\1){5,}/giu, "$1");
  const absStart = chunkStart + Math.max(0, relStart);
  const absEnd = chunkStart + Math.max(relStart, relEnd);
  if (!cleaned) return rejected("empty", absStart, absEnd, "");
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return rejected("no_letters", absStart, absEnd, cleaned);
  if (isNonSpeech(cleaned)) return rejected("non_speech", absStart, absEnd, cleaned);
  // Câu "cảm ơn đã xem" kéo dài nhiều giây mà chỉ có vài chữ là ảo giác, dù độ tin cậy trông cao.
  if (cleaned.length < 90 && HALLU.test(cleaned) && relEnd - relStart >= 6) return rejected("hallucination", absStart, absEnd, cleaned);
  if (cleaned.length < 90 && HALLU.test(cleaned) && ((item.no_speech_prob ?? 0) > 0.3 || (item.avg_logprob ?? 0) < -0.6))
    return rejected("hallucination", absStart, absEnd, cleaned);
  if ((item.compression_ratio ?? 0) > 2.4 && (item.avg_logprob ?? 0) < -0.5) return rejected("compression", absStart, absEnd, cleaned);
  if ((item.no_speech_prob ?? 0) > 0.8 && (item.avg_logprob ?? 0) < -0.8) return rejected("low_confidence", absStart, absEnd, cleaned);
  const span = relEnd - relStart;
  const letters = cleaned.replace(/[^\p{L}\p{N}]/gu, "");
  if (letters.length <= 1 && (item.no_speech_prob ?? 0) > 0.6 && !shortLogprobKeeps(item.avg_logprob))
    return rejected("short_uncertain", absStart, absEnd, cleaned);
  if ((item.no_speech_prob ?? 0) > 0.85 && letters.length <= 4 && span < 0.8 && !shortLogprobKeeps(item.avg_logprob))
    return rejected("brief_uncertain", absStart, absEnd, cleaned);
  const heard = hearVoice(samples, relStart, relEnd);
  const keepFrom = overlapGate ? chunkStart + OVERLAP_SECONDS * 0.5 : -Infinity;
  const midpoint = (absStart + absEnd) / 2;
  if (midpoint < keepFrom) return rejected("overlap", absStart, absEnd, cleaned);
  const key = normT(cleaned);
  const end = Math.max(absEnd, absStart + 0.2);
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(key);
  for (const prev of segs) {
    if (prev.end < absStart - 0.6) continue;
    const pk = normT(prev.original);
    const same = pk === key;
    const contains = key.length >= 2 && pk.length >= 2 && (key.includes(pk) || pk.includes(key));
    const extendable = contains && (cjk ? Math.min(key.length, pk.length) >= 2 : key.length > 8 && pk.length > 8);
    const timeOverlap = absStart < prev.end - 0.2 && end > prev.start + 0.2;
    const gapAfter = absStart - prev.end;
    const gapBefore = prev.start - end;
    const sameBreath = same && gapAfter < 0.6 && gapBefore < 0.6;
    if (!((timeOverlap && (same || extendable)) || sameBreath)) continue;
    if (timeOverlap && extendable && key.length > pk.length) {
      prev.original = cleaned;
      prev.raw = cleaned;
      prev.start = Math.min(prev.start, absStart);
      prev.end = Math.max(prev.end, end);
      if (prev.translation) {
        prev.translation = null;
        prev.translationFailed = false;
      }
    } else if (timeOverlap && extendable) {
      prev.start = Math.min(prev.start, absStart);
      prev.end = Math.max(prev.end, end);
    } else if ((timeOverlap || sameBreath) && same) {
      prev.start = Math.min(prev.start, absStart);
      if (end > prev.end) prev.end = end;
    }
    if (prev.pitchHz == null && typeof heard === "number") prev.pitchHz = heard;
    return rejected("duplicate", absStart, absEnd, cleaned);
  }
  segs.push({
    start: absStart,
    end,
    original: cleaned,
    raw: cleaned,
    translation: null,
    ...(typeof heard === "number" ? { pitchHz: heard } : {}),
  });
  return { accepted: true, reason: null, start: absStart, end, text: cleaned };
}

function shortLogprobKeeps(avgLogprob: number | undefined) {
  return typeof avgLogprob === "number" && avgLogprob >= SHORT_LOGPROB_KEEP;
}

function hearVoice(samples: Float32Array | null | undefined, relStart: number, relEnd: number) {
  if (!samples) return null;
  const from = Math.max(0, Math.floor(Math.max(0, relStart) * SR));
  const to = Math.min(samples.length, Math.ceil(Math.max(relStart, relEnd) * SR));
  if (to - from < SR * 0.5) return null;
  return measurePitch(samples.subarray(from, to), SR);
}

export const GENRES: Record<string, string> = {
  action: "Genre: action film. Tight, punchy lines; military, police and combat terms; radio and command language.",
  adventure: "Genre: adventure film. Vivid, heroic yet natural lines; keep place, item and creature names consistent.",
  crime: "Genre: crime/gangster/thriller. Street slang, underworld and police jargon; threats and swearing at original intensity.",
  scifi: "Genre: sci-fi/fantasy. Keep invented terms, ranks, technology and spell names consistent; do not over-explain.",
  horror: "Genre: horror. Terse, tense wording; screams and whispers rendered naturally.",
  romance: "Genre: romance/drama. Warm, emotional wording; natural address forms between couples and family.",
  psychological:
    "Genre: psychological drama. Subtle, introspective dialogue; keep emotional undercurrents and subtext; avoid over-explaining feelings.",
  comedy: "Genre: comedy. Preserve jokes, puns and timing; adapt wordplay naturally.",
  costume:
    "Genre: costume/wuxia/historical. Use period-appropriate address forms (huynh, đệ, sư phụ, bệ hạ, ta/ngươi...) when the target is Vietnamese.",
  historical: "Genre: historical period drama. Formal or era-appropriate speech; keep titles, ranks and place names consistent.",
  mystery: "Genre: mystery/detective. Precise wording for clues, alibis and deduction; keep tension without spoiling.",
  sports: "Genre: sports film. Keep sport-specific terms, ranks and commentary energy; natural team banter.",
  adult:
    "Genre: adult (18+) film. Translate sexual, explicit and profane dialogue faithfully and idiomatically at the same intensity; never censor, soften, euphemize or add warnings.",
  sex: "Genre: explicit sex (18+). Translate sexual acts, body words and desire directly and idiomatically at the same intensity. Do not censor, soften, euphemize or add warnings.",
  series:
    "Genre: current TV series/movie. Modern screen dialogue, pop-culture references; keep show titles, brand and character names as they are.",
  daily:
    "Genre: contemporary slice-of-life. Use current 2020s spoken language: chat apps, social media, office, delivery, dating, school and city life. Keep slang modern. Do not make it sound archaic or like a period drama.",
};

const norm = (t: string) => t.toLowerCase().replace(/[\p{P}\s]+/gu, "");
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

export function untranslated(original: string, translated: string): boolean {
  const n = norm(translated);
  if (!n) return true;
  if (n !== norm(original)) return false;
  if (CJK.test(original)) return true;
  const proper = /^(?:[A-Z][\p{L}'’.-]*)(?:\s+[A-Z][\p{L}'’.-]*){0,3}[!?.]*$/u.test(original.trim());
  return /\p{L}{4,}/u.test(original) && !proper;
}

export function glossaryList(raw: string): Array<[string, string]> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?)\s*(?:=>|→|=)\s*(.*)$/);
      return match && match[1] ? [match[1], match[2] || match[1]] : [line, line];
    });
}

export function glossaryHit(texts: string[], raw: string): boolean {
  const terms = glossaryList(raw)
    .map(([src]) => src.toLowerCase())
    .filter((term) => term.length > 1);
  if (!terms.length) return false;
  const blob = texts.join("\n").toLowerCase();
  return terms.some((term) => blob.includes(term));
}

export type Bible = {
  failed?: string;
  summary?: string;
  characters?: Array<{
    name?: string;
    gender?: string;
    note?: string;
    variants?: string[];
    self?: string;
    addressed?: string;
  }>;
  terms?: Array<{ src?: string; tgt?: string }>;
};

function describeCharacter(c: NonNullable<Bible["characters"]>[number]): string {
  const bits = [c.name || "?"];
  if (c.gender && c.gender !== "unknown") bits.push(c.gender);
  if (c.self) bits.push("self=" + c.self);
  if (c.addressed) bits.push("addressed=" + c.addressed);
  if (c.note) bits.push(c.note);
  return bits.join(" · ");
}

export const ADDRESS_RULE =
  "GENDER LOCK: FILM CONTEXT is mandatory for pronouns. Use each character's gender, self-pronoun and addressed-as form exactly. Never swap male and female address (Vietnamese: do not call a man chị/cô/bà/cô ấy, and do not call a woman anh/ông/chú/anh ấy; English and other languages: never swap he/she or the equivalent). Once two people use a pair (anh/em, tôi/cậu, huynh/đệ, he/she...), keep that exact pair for the rest of the scene. If a line has no name, continue the pair already used in context_before instead of guessing the opposite gender.";

export function addressLock(lines: string[], bible: Bible | null): string {
  const chars = bible && !bible.failed ? bible.characters || [] : [];
  if (!chars.length) return "";
  const blob = lines.join("\n").toLowerCase();
  const mentioned = chars.filter((c) => {
    const names = [c.name, ...(c.variants || [])].filter((n): n is string => Boolean(n && n.length > 1));
    return names.some((n) => blob.includes(n.toLowerCase()));
  });
  const list = (mentioned.length ? mentioned : chars).slice(0, 12);
  return [
    "THIS BATCH — apply the gender lock to these people:",
    ...list.map((c) => "- " + describeCharacter(c)),
    "Lines without a name still belong to someone in this list or to the pair already translated in context_before.",
  ].join("\n");
}

export function filmContext(input: {
  title: string;
  notes: string;
  gloss: string;
  bible: Bible | null;
}): string {
  const bible = input.bible && !input.bible.failed ? input.bible : null;
  const lines: string[] = [];
  const title = input.title.trim();
  const notes = input.notes.trim().slice(0, 1500);
  if (title) lines.push("Film/series: " + title);
  if (bible?.summary) lines.push("Summary: " + bible.summary);
  if (notes) lines.push("Notes from user (cast/plot): " + notes);
  const characters = (bible?.characters || []).slice(0, 40).map((c) => describeCharacter(c));
  if (characters.length)
    lines.push("Characters (names, gender, self-pronoun, how others address them — follow exactly): " + characters.join(" | "));
  const map = new Map<string, [string, string]>();
  for (const [src, tgt] of [
    ...(bible?.terms || []).map((term) => [term.src || "", term.tgt || term.src || ""] as [string, string]),
    ...glossaryList(input.gloss),
  ]) {
    if (src) map.set(String(src).toLowerCase(), [src, tgt || src]);
  }
  if (map.size)
    lines.push(
      "GLOSSARY (follow exactly): " +
        [...map.values()]
          .slice(0, 80)
          .map(([src, tgt]) => (src === tgt ? src : `${src} => ${tgt}`))
          .join("; "),
    );
  return lines.length ? "FILM CONTEXT (authoritative for names, genders, address forms, terminology):\n" + lines.join("\n") : "";
}

export function translationMessages(texts: string[], language: string, opts: TranslationOpts) {
  const vi = /viet/i.test(language);
  const sys = [
    `You are a professional subtitle translator for films and TV. Translate every line in "lines" into ${language}.`,
    "Translate meaning, not word by word. The result must sound like natural spoken dialogue that a real speaker would say in that situation.",
    "Keep each speaker's tone, register, slang, jokes, insults and swearing at the same intensity; never censor, soften or moralize.",
    "Preserve subject continuity and pronoun consistency across consecutive lines. Infer who is speaking to whom from context_before and keep the same address forms (pronouns, names, titles) throughout the scene.",
    ADDRESS_RULE,
    "Translate everything that is real speech: fragments, interjections, numbers and sung lyrics. Leave proper names, brands and titles unchanged. Do not invent words for breaths, moans or other non-speech. Never answer in the source language.",
    "The source lines come from speech recognition and may contain homophone or near-sound errors (for example 吐/脱, 目向き/前向き) or stray Latin letters in place of a word. Use the neighbouring lines to pick the reading that makes sense, but never invent content that is not suggested by the sounds.",
    "One subtitle per line, concise (about 40 characters per row, at most 2 rows). Do not merge, split, repeat, omit or explain lines.",
    "Glossary tokens look like {{G0}} or {{G12}}. If a line contains one, copy that exact token into the translation: same braces, the full number, and the same place in the sentence. Do not translate, delete, reorder or change the digits. {{G1}} is a different token from {{G10}}. Leave the spaces around the token as they are.",
    'Use "context_before" (earlier original lines + their translations when available) only to understand relationships, pronouns and ongoing topics. Do not translate the context itself.',
    vi
      ? "Vietnamese rules: choose pronouns from the gender lock (tôi/mình, anh/em, cậu/tớ, tao/mày, ông/bà, ngài, huynh/đệ...). A male speaker never refers to himself as chị/cô/bà, and a female speaker never refers to herself as anh/ông/chú. Keep the same pair for the same two people. Prefer natural movie-subtitle Vietnamese over a stiff word-for-word line."
      : "Keep grammatical gender (he/she and the target language's equivalents) aligned with the gender lock for the whole batch.",
    GENRES[opts.genre] || "",
    opts.context,
    'Use "context_after" (upcoming original lines) only to resolve who is speaking or answering and unfinished sentences; never translate it.',
    opts.fix
      ? "IMPORTANT: a previous attempt left some lines untranslated or empty. Translate every line fully and naturally."
      : "",
    `Return only JSON {"t":["..."]} with exactly ${texts.length} strings in the same order as "lines".`,
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: sys },
    { role: "user", content: JSON.stringify({ context_before: opts.ctx ?? [], lines: texts, context_after: opts.nxt ?? [] }) },
  ];
}

export function translationSchema() {
  return {
    type: "json_schema",
    json_schema: {
      name: "subtitle_translations",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { t: { type: "array", items: { type: "string" } } },
        required: ["t"],
      },
    },
  };
}

export const LANGS = [
  ["Vietnamese", "Tiếng Việt", "vi-VN"],
  ["English", "Tiếng Anh", "en-US"],
  ["Chinese", "Tiếng Trung", "zh-CN"],
  ["Japanese", "Tiếng Nhật", "ja-JP"],
  ["Korean", "Tiếng Hàn", "ko-KR"],
  ["Thai", "Tiếng Thái", "th-TH"],
  ["Indonesian", "Tiếng Indonesia", "id-ID"],
  ["French", "Tiếng Pháp", "fr-FR"],
  ["Spanish", "Tiếng Tây Ban Nha", "es-ES"],
  ["German", "Tiếng Đức", "de-DE"],
  ["Portuguese", "Tiếng Bồ Đào Nha", "pt-BR"],
  ["Russian", "Tiếng Nga", "ru-RU"],
  ["Italian", "Tiếng Ý", "it-IT"],
  ["Hindi", "Tiếng Hindi", "hi-IN"],
  ["Arabic", "Tiếng Ả Rập", "ar-SA"],
] as const;

export const SRC_LANGS = [
  ["zh", "Tiếng Trung"],
  ["ko", "Tiếng Hàn"],
  ["ja", "Tiếng Nhật"],
  ["en", "Tiếng Anh"],
] as const;

export function speechLang(target: string): string {
  return LANGS.find((row) => row[0] === target)?.[2] ?? "vi-VN";
}

export function orpheusReady(target: string): "en" | "ar" | null {
  if (/english/i.test(target)) return "en";
  if (/arab/i.test(target)) return "ar";
  return null;
}

export const SPEAK_SAMPLE: Record<string, string> = {
  Vietnamese: "Xin chào. Đây là giọng thuyết minh của bản dịch.",
  English: "Hello. This is the narration voice for the translated subtitles.",
  Chinese: "你好。这是译文的旁白声音。",
  Japanese: "こんにちは。これは翻訳字幕のナレーションです。",
  Korean: "안녕하세요. 번역 자막의 내레이션입니다.",
  Thai: "สวัสดี นี่คือเสียงบรรยายคำแปล",
  Indonesian: "Halo. Ini suara narasi untuk terjemahan.",
  French: "Bonjour. Voici la voix de la narration traduite.",
  Spanish: "Hola. Esta es la voz de la narración traducida.",
  German: "Hallo. Das ist die Stimme der übersetzten Untertitel.",
  Portuguese: "Olá. Esta é a voz da narração traduzida.",
  Russian: "Здравствуйте. Это голос перевода субтитров.",
  Italian: "Ciao. Questa è la voce della narrazione tradotta.",
  Hindi: "नमस्ते। यह अनुवाद की आवाज़ है।",
  Arabic: "مرحبا. هذا صوت سرد الترجمة.",
};
