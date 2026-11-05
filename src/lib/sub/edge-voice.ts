import { speechLang } from "@/lib/sub/text";
import type { NarrationSettings } from "@/lib/sub/types";

const VOICES: Record<string, { female: string; male: string; femaleLabel: string; maleLabel: string }> = {
  "vi-VN": { female: "vi-VN-HoaiMyNeural", male: "vi-VN-NamMinhNeural", femaleLabel: "Hoài My", maleLabel: "Nam Minh" },
  "en-US": { female: "en-US-AriaNeural", male: "en-US-AndrewNeural", femaleLabel: "Aria", maleLabel: "Andrew" },
  "zh-CN": { female: "zh-CN-XiaoxiaoNeural", male: "zh-CN-YunxiNeural", femaleLabel: "Xiaoxiao", maleLabel: "Yunxi" },
  "ja-JP": { female: "ja-JP-NanamiNeural", male: "ja-JP-KeitaNeural", femaleLabel: "Nanami", maleLabel: "Keita" },
  "ko-KR": { female: "ko-KR-SunHiNeural", male: "ko-KR-InJoonNeural", femaleLabel: "SunHi", maleLabel: "InJoon" },
  "th-TH": { female: "th-TH-PremwadeeNeural", male: "th-TH-NiwatNeural", femaleLabel: "Premwadee", maleLabel: "Niwat" },
  "id-ID": { female: "id-ID-GadisNeural", male: "id-ID-ArdiNeural", femaleLabel: "Gadis", maleLabel: "Ardi" },
  "fr-FR": { female: "fr-FR-DeniseNeural", male: "fr-FR-HenriNeural", femaleLabel: "Denise", maleLabel: "Henri" },
  "es-ES": { female: "es-ES-ElviraNeural", male: "es-ES-AlvaroNeural", femaleLabel: "Elvira", maleLabel: "Alvaro" },
  "de-DE": { female: "de-DE-KatjaNeural", male: "de-DE-ConradNeural", femaleLabel: "Katja", maleLabel: "Conrad" },
  "pt-BR": { female: "pt-BR-FranciscaNeural", male: "pt-BR-AntonioNeural", femaleLabel: "Francisca", maleLabel: "Antonio" },
  "ru-RU": { female: "ru-RU-SvetlanaNeural", male: "ru-RU-DmitryNeural", femaleLabel: "Svetlana", maleLabel: "Dmitry" },
  "it-IT": { female: "it-IT-ElsaNeural", male: "it-IT-DiegoNeural", femaleLabel: "Elsa", maleLabel: "Diego" },
  "hi-IN": { female: "hi-IN-SwaraNeural", male: "hi-IN-MadhurNeural", femaleLabel: "Swara", maleLabel: "Madhur" },
  "ar-SA": { female: "ar-SA-ZariyahNeural", male: "ar-SA-HamedNeural", femaleLabel: "Zariyah", maleLabel: "Hamed" },
};

export function edgeVoice(target: string, gender: NarrationSettings["gender"]) {
  const lang = speechLang(target);
  const row = VOICES[lang] ?? VOICES["vi-VN"];
  const male = gender === "male";
  return {
    id: male ? row.male : row.female,
    label: male ? row.maleLabel : row.femaleLabel,
    lang,
  };
}

export function prosodyRate(rate: number) {
  const pct = Math.round((Math.max(0.5, Math.min(2, rate)) - 1) * 100);
  return pct === 0 ? "default" : `${pct > 0 ? "+" : ""}${pct}%`;
}

export function prosodyPitch(pitch: number) {
  const hz = Math.round((Math.max(0.5, Math.min(2, pitch)) - 1) * 40);
  return hz === 0 ? "default" : `${hz > 0 ? "+" : ""}${hz}Hz`;
}
