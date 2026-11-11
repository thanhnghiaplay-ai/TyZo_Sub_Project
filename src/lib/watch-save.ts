import type { Seg } from "@/lib/sub/types";

export type WatchFile = { fileName: string; fileSize: number; fileModified: number };

export type WatchSeg = Pick<Seg, "start" | "end" | "original" | "raw" | "translation" | "translationFailed" | "edited" | "stale" | "voice" | "voiceLock" | "pitchHz">;

export type WatchProject = WatchFile & {
  source: string;
  position: number;
  url: string;
  /** Chữ ký lần dịch đã áp cho các câu này. Trống ở bản lưu cũ. */
  appliedSig?: string;
  segs: WatchSeg[];
};

const DB = "tyzo-watch";
const STORE = "project";
const KEY = "last";

export function sameWatchFile(saved: WatchFile, file: File) {
  return saved.fileName === file.name && saved.fileSize === file.size && (!saved.fileModified || saved.fileModified === file.lastModified);
}

export function slimSeg(seg: Seg): WatchSeg {
  return {
    start: seg.start,
    end: seg.end,
    original: seg.original,
    raw: seg.raw,
    translation: seg.translation,
    translationFailed: seg.translationFailed,
    edited: seg.edited,
    stale: seg.stale,
    voice: seg.voice,
    voiceLock: seg.voiceLock,
    pitchHz: seg.pitchHz,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWatch(project: WatchProject) {
  if (!project.segs.length || typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...project, savedAt: Date.now() }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadWatch(): Promise<(WatchProject & { savedAt: number }) | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  const row = await new Promise<(WatchProject & { savedAt: number }) | null>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as WatchProject & { savedAt: number }) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!row?.segs?.length) return null;
  return row;
}
