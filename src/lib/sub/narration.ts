import { playAudio as playUrl, cancelAudioPlayback } from "./audio-playback.ts";
import { speakOrpheus, ROOM_KEY } from "@/lib/sub/groq";
import { getRentShow, orpheusModelId, rentVoiceProblem, type RentShow } from "@/lib/rent-show";
import { synthesizeEdge } from "@/lib/sub/edge-speech";
import { edgeVoice, prosodyPitch, prosodyRate } from "@/lib/sub/edge-voice";
import { orpheusReady, SPEAK_SAMPLE, speechLang } from "@/lib/sub/text";
import { createLatencyTracker, estimateSpeechSeconds, fitBoost, holdSeconds, type SpeechEngine } from "@/lib/sub/narration-sync";
import type { NarrationSettings } from "@/lib/sub/types";

const EN_VOICES = [
  { id: "hannah", name: "Hannah", gender: "female" },
  { id: "autumn", name: "Autumn", gender: "female" },
  { id: "diana", name: "Diana", gender: "female" },
  { id: "troy", name: "Troy", gender: "male" },
  { id: "austin", name: "Austin", gender: "male" },
  { id: "daniel", name: "Daniel", gender: "male" },
] as const;

const AR_VOICES = [
  { id: "lulwa", name: "Lulwa", gender: "female" },
  { id: "noura", name: "Noura", gender: "female" },
  { id: "aisha", name: "Aisha", gender: "female" },
  { id: "abdullah", name: "Abdullah", gender: "male" },
  { id: "fahad", name: "Fahad", gender: "male" },
  { id: "sultan", name: "Sultan", gender: "male" },
] as const;

export function orpheusVoices(target: string) {
  return orpheusReady(target) === "ar" ? AR_VOICES : EN_VOICES;
}

export function defaultOrpheusVoice(target: string, gender: NarrationSettings["gender"]) {
  const list = orpheusVoices(target);
  if (gender === "any") return list[0].id;
  return list.find((voice) => voice.gender === gender)?.id ?? list[0].id;
}

function hasWord(name: string, word: string) {
  return new RegExp(`(?:^|[^a-z0-9])${word}(?:[^a-z0-9]|$)`).test(name);
}

export function guessGender(voice: SpeechSynthesisVoice): "female" | "male" | "any" {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (/female|woman|girl|nữ|samantha|victoria|zira|karen|moira|fiona|tessa|veena|susan|allison|ava|serena|hoaimy/.test(name))
    return "female";
  const maleWord = ["male", "man", "boy", "nam", "tom", "lee"].some((word) => hasWord(name, word));
  if (maleWord || /david|daniel|fred|rishi|jorge|diego|thomas|aaron|namminh/.test(name) || hasWord(name, "alex")) return "male";
  return "any";
}

/** Orpheus chỉ nhận câu ngắn. Cắt theo dấu câu, mỗi mảnh tối đa 180 ký tự. */
function orpheusPieces(text: string, max = 180): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "), window.lastIndexOf(", "), window.lastIndexOf(" "));
    if (cut < 40) cut = max - 1;
    const piece = rest.slice(0, cut + 1).trim();
    if (!piece) break;
    parts.push(piece);
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function speakable(text: string, skipCues: boolean) {
  let value = text.replace(/\s*\n\s*/g, " ").trim();
  if (skipCues) value = value.replace(/\[[^\]]*\]|（[^）]*）|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return value;
}

type SpeakJob = {
  text: string;
  settings: NarrationSettings;
  target: string;
  key: string;
  video: HTMLVideoElement | null;
  playbackRate: number;
  onBlocked?: (message: string) => void;
  onFail?: (message: string) => void;
  slot?: number;
  prefetch?: boolean;
};

export function createNarrator() {
  let token = 0;
  let audio: HTMLAudioElement | null = null;
  let ducked = false;
  let savedVolume = 1;
  let savedMuted = false;
  const cache = new Map<string, string>();
  /** Yêu cầu tạo tiếng đang chạy theo khóa, để tạo trước và đọc thật không gọi (và không tính tiền) hai lần. */
  const inflight = new Map<string, Promise<string>>();
  const tracker = createLatencyTracker();
  let epoch = 0;
  let synthesis = new AbortController();
  let edgeCoolUntil = 0;
  let rentCache: { at: number; value: RentShow | null } | null = null;
  let rentWarned = false;

  /** Danh sách Chủ mở cho thuê phòng, nhớ 60 giây. Không đọc được thì coi như chưa khóa (máy chủ không có đường chặn giọng đọc). */
  const rentShow = async () => {
    if (rentCache && Date.now() - rentCache.at < 60_000) return rentCache.value;
    const value = await getRentShow().catch(() => null);
    rentCache = { at: Date.now(), value };
    return value;
  };

  const restore = (video: HTMLVideoElement | null) => {
    if (!video) return;
    if (ducked) {
      video.volume = savedVolume;
      video.muted = savedMuted;
      ducked = false;
    }
  };

  const duck = (video: HTMLVideoElement | null, settings: NarrationSettings) => {
    if (!video) return;
    if (!ducked) {
      savedVolume = video.volume;
      savedMuted = video.muted;
      ducked = true;
    }
    if (settings.muteVideo) video.muted = true;
    else if (settings.duck) video.volume = Math.min(savedVolume, 0.16);
  };

  let speaking = false;
  let cloudMissTold = false;
  const queue: SpeakJob[] = [];
  const stop = (video?: HTMLVideoElement | null) => {
    token++;
    epoch++;
    synthesis.abort();
    synthesis = new AbortController();
    inflight.clear();
    speaking = false;
    queue.length = 0;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* không có speech */
    }
    if (audio) {
      cancelAudioPlayback(audio);
      audio.pause();
      audio.src = "";
    }
    restore(video ?? null);
  };

  const remember = (key: string, url: string) => {
    cache.set(key, url);
    if (cache.size > 48) {
      const oldest = cache.keys().next().value;
      if (oldest) {
        const gone = cache.get(oldest);
        if (gone) URL.revokeObjectURL(gone);
        cache.delete(oldest);
      }
    }
  };

  /** Lấy tiếng của một mảnh: có sẵn trong đệm thì dùng, đang tạo thì chờ chung, chưa có thì tạo và ghi lại độ trễ thật. */
  const load = (engine: SpeechEngine, cacheKey: string, make: (signal: AbortSignal) => Promise<Blob>): Promise<string> => {
    const hit = cache.get(cacheKey);
    if (hit) return Promise.resolve(hit);
    let pending = inflight.get(cacheKey);
    if (!pending) {
      const started = performance.now();
      const generation = epoch;
      const signal = synthesis.signal;
      pending = (async () => {
        const blob = await make(signal);
        if (signal.aborted || epoch !== generation) throw new DOMException("Đã hủy.", "AbortError");
        tracker.record(engine, (performance.now() - started) / 1000);
        const url = URL.createObjectURL(blob);
        remember(cacheKey, url);
        return url;
      })().finally(() => { if (inflight.get(cacheKey) === pending) inflight.delete(cacheKey); });
      inflight.set(cacheKey, pending);
    }
    return pending;
  };

  const api = {
    stop,
    busy: () => speaking,
    /** Độ trễ tạo giọng (giây) cần bù cho loại giọng này. Giọng máy đọc ngay nên không bù. */
    compensation: (engine: SpeechEngine) => (engine === "browser" ? 0 : tracker.estimate(engine)),
    async speak(opts: SpeakJob) {
      const line = speakable(opts.text, opts.settings.skipCues);
      if (!line) return;
      const prefetchOnly = Boolean(opts.prefetch);
      if (!prefetchOnly && speaking) {
        queue.push(opts);
        if (queue.length > 8) queue.shift();
        return;
      }
      const myEpoch = epoch;
      const mine = prefetchOnly ? token : ++token;
      const alive = () => (prefetchOnly ? epoch === myEpoch : mine === token);
      const { settings } = opts;
      const startedAt = performance.now();
      const comp = prefetchOnly || settings.engine === "browser" ? 0 : tracker.estimate(settings.engine);
      const slotWall = opts.slot && opts.slot > 0 ? opts.slot / Math.max(0.5, opts.playbackRate) : undefined;
      if (!prefetchOnly) {
        speaking = true;
        duck(opts.video, settings);
      }
      const done = () => {
        if (!prefetchOnly && mine === token) {
          speaking = false;
          restore(opts.video);
          const next = queue.shift();
          if (next) void api.speak(next);
        }
      };
      /** Phát một mảnh. Tiếng đã có sẵn thì chờ phần độ trễ còn thiếu, để bắt đầu đúng lúc phụ đề. */
      const play = async (url: string, last: boolean, share: number) => {
        if (prefetchOnly || !alive()) return;
        if (!audio) audio = new Audio();
        const wait = holdSeconds(comp, (performance.now() - startedAt) / 1000);
        if (wait > 0.02) {
          await new Promise<void>((resolve) => setTimeout(resolve, (wait / Math.max(0.5, opts.playbackRate)) * 1000));
          if (!alive()) return;
        }
        await playUrl(audio, url, settings, opts.playbackRate, last ? done : () => {}, slotWall ? slotWall * share : undefined);
      };
      try {
        let cloud = settings.engine === "orpheus" ? orpheusReady(opts.target) : null;
        // Thuê phòng bằng key riêng: giọng Orpheus phải nằm trong danh sách Chủ mở. Trả theo lượt (key "room") đã tính bằng Token dịch nên không qua đây.
        if (cloud && opts.key && opts.key !== ROOM_KEY) {
          const blocked = rentVoiceProblem(await rentShow(), orpheusModelId(cloud));
          if (!alive()) return;
          if (blocked) {
            cloud = null;
            if (!rentWarned && !prefetchOnly) {
              rentWarned = true;
              opts.onBlocked?.(blocked);
            }
          }
        }
        if (settings.engine === "orpheus" && cloud && opts.key) {
          try {
            const voice = settings.matchCast
              ? defaultOrpheusVoice(opts.target, settings.gender)
              : orpheusVoices(opts.target).some((item) => item.id === settings.orpheusVoice)
                ? settings.orpheusVoice
                : defaultOrpheusVoice(opts.target, settings.gender);
            const pieces = orpheusPieces(line);
            for (let i = 0; i < pieces.length; i++) {
              if (!alive()) return;
              const piece = pieces[i];
              const url = await load("orpheus", `${cloud}|${voice}|${piece}`, (signal) =>
                speakOrpheus({ key: opts.key, text: piece, voice, arabic: cloud === "ar", signal }),
              );
              if (!alive()) return;
              await play(url, i === pieces.length - 1, piece.length / line.length);
            }
            return;
          } catch (error) {
            if ((error as { name?: string })?.name === "AbortError") throw error;
            if (!alive()) return;
          }
        }
        if (settings.engine === "edge" && Date.now() >= edgeCoolUntil) {
          try {
            const voice = edgeVoice(opts.target, settings.gender);
            const cacheKey = `edge|${voice.id}|${prosodyRate(settings.rate)}|${prosodyPitch(settings.pitch)}|${line}`;
            const url = await load("edge", cacheKey, async (signal) => {
              const result = await synthesizeEdge({
                signal,
                data: {
                  text: line,
                  voice: voice.id,
                  rate: prosodyRate(settings.rate),
                  pitch: prosodyPitch(settings.pitch),
                },
              });
              return base64ToBlob(result.audio);
            });
            if (!alive()) return;
            await play(url, true, 1);
            return;
          } catch {
            edgeCoolUntil = Date.now() + 20000;
          }
        }
        if (prefetchOnly) return;
        if (settings.engine === "browser") {
          await speakBrowser(line, settings, opts.target, opts.playbackRate, done, slotWall);
          return;
        }
        if (!cloudMissTold) {
          cloudMissTold = true;
          opts.onFail?.("Giọng đã chọn không đọc được. Câu này bỏ qua, không chuyển sang giọng máy.");
        }
        done();
      } catch {
        done();
      }
    },
  };
  return api;
}

function base64ToBlob(audio: string) {
  const raw = atob(audio);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: "audio/mpeg" });
}

function pickBrowserVoice(voices: SpeechSynthesisVoice[], settings: NarrationSettings, lang: string) {
  const pinned = !settings.matchCast && settings.voiceURI ? voices.find((voice) => voice.voiceURI === settings.voiceURI) : undefined;
  if (pinned) return pinned;
  const prefix = lang.slice(0, 2).toLowerCase();
  const ranked = voices
    .map((voice) => {
      const code = voice.lang.replace("_", "-").toLowerCase();
      if (!code.startsWith(prefix)) return null;
      const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
      let score = code === lang.toLowerCase() ? 6 : 3;
      if (/neural|natural|premium|enhanced|google|wavenet/.test(name)) score += 5;
      if (/compact|espeak|android/.test(name)) score -= 1;
      if (settings.gender !== "any" && guessGender(voice) === settings.gender) score += 3;
      return { voice, score };
    })
    .filter((item): item is { voice: SpeechSynthesisVoice; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.voice;
}

function speakBrowser(
  line: string,
  settings: NarrationSettings,
  target: string,
  playbackRate: number,
  onend: () => void,
  slot?: number,
) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onend();
      resolve();
      return;
    }
    const utter = new SpeechSynthesisUtterance(line);
    const voices = window.speechSynthesis.getVoices();
    const lang = speechLang(target);
    const chosen = pickBrowserVoice(voices, settings, lang);
    if (chosen) utter.voice = chosen;
    utter.lang = chosen?.lang || lang;
    const rate = settings.rate * (settings.followPlayback ? playbackRate : 1);
    const boost = slot ? fitBoost(estimateSpeechSeconds(line, rate), slot) : 1;
    utter.rate = Math.max(0.5, Math.min(2, rate * boost));
    utter.pitch = Math.max(0.5, Math.min(2, settings.pitch));
    utter.volume = Math.max(0, Math.min(1, settings.volume));
    utter.onend = () => {
      onend();
      resolve();
    };
    utter.onerror = () => {
      onend();
      resolve();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utter);
  });
}

export function sampleLine(target: string) {
  return SPEAK_SAMPLE[target] || SPEAK_SAMPLE.Vietnamese;
}
