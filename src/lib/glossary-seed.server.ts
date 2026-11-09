import type { Sql } from "@/lib/db";

type RawTerm = {
  source?: string;
  target?: string;
  renders?: unknown;
  note?: string;
  whole_word?: boolean;
  case_sensitive?: boolean;
};

const files = import.meta.glob("/data/glossaries/*/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function fileTerms(lang?: string, genre?: string) {
  const rows: { lang: string; genre: string; source: string; target: string }[] = [];
  for (const [path, raw] of Object.entries(files)) {
    const match = path.match(/glossaries\/([^/]+)\/([^/]+)\.json$/i);
    if (!match) continue;
    const fileLang = match[1].toLowerCase();
    const fileGenre = match[2].toLowerCase();
    if (lang && lang !== fileLang) continue;
    if (genre && genre !== fileGenre) continue;
    const data = JSON.parse(raw) as RawTerm[] | { terms?: RawTerm[] };
    const terms = Array.isArray(data) ? data : (data.terms ?? []);
    for (const term of terms) {
      const source = term.source?.trim();
      if (!source) continue;
      rows.push({ lang: fileLang, genre: fileGenre, source, target: (term.target ?? source).trim() });
    }
  }
  return rows;
}

let seeding: Promise<void> | null = null;

export function ensureGlossarySeed(sql: Sql): Promise<void> {
  seeding ??= seed(sql).catch((error) => {
    seeding = null;
    throw error;
  });
  return seeding;
}

async function seed(sql: Sql) {
  const flag = await sql<{ seeded: boolean }>`select seeded from glossary_meta where id = 1`;
  if (flag[0]?.seeded) return;
  const packs = new Map<string, RawTerm[]>();
  for (const [path, raw] of Object.entries(files)) {
    const match = path.match(/glossaries\/([^/]+)\/([^/]+)\.json$/i);
    if (!match) continue;
    const lang = match[1].toLowerCase();
    const genre = match[2].toLowerCase();
    const data = JSON.parse(raw) as RawTerm[] | { terms?: RawTerm[] };
    const terms = Array.isArray(data) ? data : (data.terms ?? []);
    packs.set(`${lang}|${genre}`, terms);
  }
  for (const key of packs.keys()) {
    const [lang, genre] = key.split("|");
    await sql`insert into glossary_packs (lang, genre) values (${lang}, ${genre}) on conflict do nothing`;
  }
  const rows: unknown[][] = [];
  for (const [key, terms] of packs) {
    const [lang, genre] = key.split("|");
    for (const term of terms) {
      const source = term.source?.trim();
      if (!source) continue;
      rows.push([
        lang,
        genre,
        source,
        (term.target ?? source).trim(),
        term.renders ? JSON.stringify(term.renders) : null,
        (term.note ?? "").slice(0, 500),
        term.whole_word ?? null,
        term.case_sensitive ?? null,
      ]);
    }
  }
  for (let i = 0; i < rows.length; i += 80) {
    const chunk = rows.slice(i, i + 80);
    const values: unknown[] = [];
    const parts = chunk.map((row, index) => {
      const base = index * 8;
      values.push(...row);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5}::jsonb,$${base + 6},$${base + 7},$${base + 8})`;
    });
    await sql.query(
      `insert into glossary_terms (lang, genre, source, target, renders, note, whole_word, case_sensitive) values ${parts.join(",")} on conflict (lang, genre, lower(source)) do nothing`,
      values,
    );
  }
  await sql`update glossary_meta set seeded = true where id = 1`;
}
