export type GiayPack = { id: string; tokens: number; days: number };

export type GiayDesk = { markup: number; buffer: number; packs: GiayPack[] };

export const GIAY_DESK_DEFAULT: GiayDesk = {
  markup: 50,
  buffer: 1.2,
  packs: [
    { id: "nho", tokens: 3600, days: 30 },
    { id: "vua", tokens: 10800, days: 30 },
    { id: "lon", tokens: 36000, days: 90 },
  ],
};

const ID_RE = /^[a-z0-9-]{1,40}$/;

function count(value: unknown, max: number, label: string) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > max) throw new Error(label);
  return n;
}

function packOf(value: unknown): GiayPack | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<GiayPack>;
  const id = typeof row.id === "string" ? row.id.trim().toLowerCase() : "";
  if (!ID_RE.test(id)) return null;
  return { id, tokens: count(row.tokens, 10_000_000, "Số giây không đúng."), days: count(row.days, 365, "Số ngày không đúng.") };
}

export function checkGiayDesk(input: GiayDesk): GiayDesk {
  const markup = Math.round(Number(input.markup));
  if (!Number.isFinite(markup) || markup < 0 || markup > 500) throw new Error("Phần trăm chênh không đúng.");
  const buffer = Math.round(Number(input.buffer) * 100) / 100;
  if (!Number.isFinite(buffer) || buffer < 1 || buffer > 3) throw new Error("Hệ số đệm không đúng.");
  const packs: GiayPack[] = [];
  const seen = new Set<string>();
  for (const row of input.packs || []) {
    const pack = packOf(row);
    if (!pack || seen.has(pack.id)) continue;
    seen.add(pack.id);
    packs.push(pack);
    if (packs.length >= 12) break;
  }
  return { markup, buffer, packs };
}

export function parseGiayDesk(raw: string | null | undefined): GiayDesk {
  const copy = (): GiayDesk => ({ ...GIAY_DESK_DEFAULT, packs: GIAY_DESK_DEFAULT.packs.map((pack) => ({ ...pack })) });
  if (!raw) return copy();
  try {
    const data = JSON.parse(raw) as Partial<GiayDesk>;
    return checkGiayDesk({
      markup: data.markup ?? GIAY_DESK_DEFAULT.markup,
      buffer: data.buffer ?? GIAY_DESK_DEFAULT.buffer,
      packs: Array.isArray(data.packs) ? (data.packs as GiayPack[]) : GIAY_DESK_DEFAULT.packs,
    });
  } catch {
    return copy();
  }
}
