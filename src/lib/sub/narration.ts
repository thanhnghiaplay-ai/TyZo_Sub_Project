import { speakOrpheus } from "@/lib/sub/groq";
import { synthesizeEdge } from "@/lib/sub/edge-speech";
import { edgeVoice, prosodyPitch, prosodyRate } from "@/lib/sub/edge-voice";
import { orpheusReady, SPEAK_SAMPLE, speechLang } from "@/lib/sub/text";
import type { NarrationSettings } from "@/lib/sub/types";

export const EN_VOICES = [
  { id: "hannah", name: "Hannah", gender: "female" },
  { id: "autumn", name: "Autumn", gender: "female" },
  { id: "diana", name: "Diana", gender: "female" },
  { id: "troy", name: "Troy", gender: "male" },
  { id: "austin", name: "Austin", gender: "male" },
  { id: "daniel", name: "Daniel", gender: "male" },
] as const;

export const AR_VOICES = [
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

export function guessGender(voice: SpeechSynthesisVoice): "female" | "male" | "any" {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (/female|woman|girl|nữ|samantha|victoria|zira|karen|moira|fiona|tessa|veena|susan|allison|ava|serena|hoaimy/.test(name))
    return "female";
  if (/male|man|nam|david|daniel|alex|fred|tom|rishi|lee|jorge|diego|thomas|aaron|namminh/.test(name)) return "male";
  return "any";
}

export function speakable(text: string, skipCues: boolean) {
  let value = text.replace(/\s*\n\s*/g, " ").trim();
  if (skipCues) value = value.replace(/\[[^\]]*\]|（[^）]*）|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return value;
}

export function createNarrator() {
  let token = 0;
  let audio: HTMLAudioElement | null = null;
  let ducked = false;
  let savedVolume = 1;
  let savedMuted = false;
  const cache = new Map<string, string>();
  let edgeCoolUntil = 0;

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

  const stop = (video?: HTMLVideoElement | null) => {
    token++;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* không có speech */
    }
    if (audio) {
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

  return {
    stop,
    async speak(opts: {
      text: string;
      settings: NarrationSettings;
      target: string;
      key: string;
      video: HTMLVideoElement | null;
      playbackRate: number;
    }) {
      const line = speakable(opts.text, opts.settings.skipCues);
      if (!line) return;
      const mine = ++token;
      const { settings } = opts;
      duck(opts.video, settings);
      const done = () => {
        if (mine === token) restore(opts.video);
      };
      try {
        const cloud = settings.engine === "orpheus" ? orpheusReady(opts.target) : null;
        if (settings.engine === "orpheus" && cloud && opts.key) {
          const voice = settings.matchCast
            ? defaultOrpheusVoice(opts.target, settings.gender)
            : orpheusVoices(opts.target).some((item) => item.id === settings.orpheusVoice)
              ? settings.orpheusVoice
              : defaultOrpheusVoice(opts.target, settings.gender);
          const cacheKey = `${cloud}|${voice}|${line}`;
          let url = cache.get(cacheKey);
          if (!url) {
            const blob = await speakOrpheus({
              key: opts.key,
              text: line,
              voice,
              arabic: cloud === "ar",
            });
            if (mine !== token) return;
            url = URL.createObjectURL(blob);
            remember(cacheKey, url);
          }
          if (mine !== token) return;
          if (!audio) audio = new Audio();
          await playUrl(audio, url, settings, opts.playbackRate, done);
          return;
        }
        if (settings.engine === "edge" && Date.now() >= edgeCoolUntil) {
          try {
            const voice = edgeVoice(opts.target, settings.gender);
            const cacheKey = `edge|${voice.id}|${prosodyRate(settings.rate)}|${prosodyPitch(settings.pitch)}|${line}`;
            let url = cache.get(cacheKey);
            if (!url) {
              const result = await synthesizeEdge({
                data: {
                  text: line,
                  voice: voice.id,
                  rate: prosodyRate(settings.rate),
                  pitch: prosodyPitch(settings.pitch),
                },
              });
              if (mine !== token) return;
              url = URL.createObjectURL(base64ToBlob(result.audio));
              remember(cacheKey, url);
            }
            if (mine !== token) return;
            if (!audio) audio = new Audio();
            await playUrl(audio, url, settings, opts.playbackRate, done);
            return;
          } catch {
            edgeCoolUntil = Date.now() + 20000;
          }
        }
        await speakBrowser(line, settings, opts.target, opts.playbackRate, done);
      } catch {
        done();
      }
    },
  };
}

function playUrl(audio: HTMLAudioElement, url: string, settings: NarrationSettings, playbackRate: number, done: () => void) {
  audio.src = url;
  audio.volume = Math.max(0, Math.min(1, settings.volume));
  const rate = settings.rate * (settings.followPlayback ? playbackRate : 1);
  audio.playbackRate = Math.max(0.5, Math.min(2, rate));
  audio.onended = done;
  return audio.play();
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
    utter.rate = Math.max(0.5, Math.min(2, rate));
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
