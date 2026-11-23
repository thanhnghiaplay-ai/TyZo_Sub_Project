import { type Bible } from "@/lib/sub/text";
import { type GlossaryTerm } from "@/lib/sub/glossary";
import { suggestTerms } from "@/lib/glossary-room";

/** Lưu trên máy cho luồng dịch: giọng đã khóa, giới tính nhân vật, thuật ngữ của khách. Tách từ use-pipeline.ts (23/11/2026). */

export function readGenderMap(key: string): Record<string, "female" | "male"> {
  try {
    const data = JSON.parse(readStore(key) || "{}") as Record<string, string>;
    const out: Record<string, "female" | "male"> = {};
    for (const [name, value] of Object.entries(data)) {
      if (value === "male" || value === "female") out[name] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function voiceStore(kind: "line" | "cast", film: string) {
  return `g${kind}_` + (film.trim().toLowerCase() || "_");
}

export function overlayCastLocks(bible: Bible, film: string) {
  const saved = readGenderMap(voiceStore("cast", film));
  for (const character of bible.characters || []) {
    const gender = saved[(character.name || "").trim().toLowerCase()];
    if (gender) character.gender = gender;
  }
}

export function cloneBible(bible: Bible): Bible {
  return JSON.parse(JSON.stringify(bible)) as Bible;
}

export function readStore(key: string) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
export function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}
export function removeStore(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

export function shareUserTerms(source: string, genre: string, terms: GlossaryTerm[]) {
  try {
    if (localStorage.getItem("gshare") !== "1") return;
  } catch {
    return;
  }
  void suggestTerms({ data: { lang: source, genre, terms } }).catch(() => {});
}

export function userGlossKey(source: string, genre: string) {
  return "guser_" + (source || "_") + "_" + (genre || "auto");
}

export function readUserTerms(source: string, genre: string): GlossaryTerm[] {
  try {
    const raw = readStore(userGlossKey(source, genre));
    if (!raw) return [];
    const data = JSON.parse(raw) as GlossaryTerm[];
    return Array.isArray(data) ? data.filter((t) => t && t.source) : [];
  } catch {
    return [];
  }
}

export function safeStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
