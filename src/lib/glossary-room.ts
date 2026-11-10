import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { cleanSuggestions, glossaryPair } from "@/lib/glossary-share";

type TermRow = {
  id: number;
  source: string;
  target: string;
  hidden: boolean;
  note: string;
};

async function sqlOf() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const { ensureGlossarySeed } = await import("@/lib/glossary-seed.server");
  await ensureGlossarySeed(sql);
  return sql;
}

async function ownerOnly(userId: string) {
  const { requireRole } = await import("@/lib/admin-room");
  return requireRole(userId, "chu");
}

export const getGlossaryPack = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string }) => glossaryPair(input?.lang ?? "", input?.genre ?? ""))
  .handler(async ({ data }) => {
    const sql = await sqlOf();
    const rows = await sql<{
      source: string;
      target: string;
      renders: Record<string, string> | null;
      note: string;
      whole_word: boolean | null;
      case_sensitive: boolean | null;
    }>`
      select t.source, t.target, t.renders, t.note, t.whole_word, t.case_sensitive
      from glossary_terms t
      join glossary_packs p using (lang, genre)
      where t.lang = ${data.lang} and t.genre = ${data.genre}
        and not t.hidden and not p.hidden
      order by length(t.source) desc
    `;
    return { terms: rows };
  });

export const suggestTerms = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string; terms: { source: string; target: string }[] }) => {
    const pair = glossaryPair(input?.lang ?? "", input?.genre ?? "");
    return { ...pair, terms: cleanSuggestions(input?.terms ?? []) };
  })
  .handler(async ({ context, data }) => {
    if (!data.terms.length) return { ok: true as const, saved: 0 };
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    await takeRate(`gloss:${context.userId}`, 10, 3600);
    const sql = await sqlOf();
    for (const term of data.terms) {
      await sql`
        insert into glossary_suggestions (user_id, lang, genre, source, target)
        values (${context.userId}, ${data.lang}, ${data.genre}, ${term.source}, ${term.target})
        on conflict (user_id, lang, genre, source) do nothing
      `;
    }
    return { ok: true as const, saved: data.terms.length };
  });

export const listGlossary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string; q?: string; offset?: number }) => ({
    ...glossaryPair(input?.lang ?? "", input?.genre ?? ""),
    q: (input?.q ?? "").trim().slice(0, 40),
    offset: Math.max(0, Math.min(5000, Math.floor(Number(input?.offset) || 0))),
  }))
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    const like = `%${data.q}%`;
    const pack = await sql<{ hidden: boolean }>`
      select hidden from glossary_packs where lang = ${data.lang} and genre = ${data.genre}
    `;
    const counted = await sql<{ n: number }>`
      select count(*)::int as n from glossary_terms
      where lang = ${data.lang} and genre = ${data.genre}
        and (${data.q} = '' or source ilike ${like} or target ilike ${like})
    `;
    const terms = await sql<TermRow>`
      select id, source, target, hidden, note
      from glossary_terms
      where lang = ${data.lang} and genre = ${data.genre}
        and (${data.q} = '' or source ilike ${like} or target ilike ${like})
      order by hidden, length(source) desc
      limit 50 offset ${data.offset}
    `;
    const suggestions = await sql<{ id: number; source: string; target: string; status: string }>`
      select id, source, target, status
      from glossary_suggestions
      where lang = ${data.lang} and genre = ${data.genre} and status = 'new'
      order by id desc
      limit 20
    `;
    return { hidden: Boolean(pack[0]?.hidden), total: counted[0]?.n ?? 0, terms, suggestions };
  });

export const saveGlossaryTerm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string; source: string; target: string }) => {
    const pair = glossaryPair(input?.lang ?? "", input?.genre ?? "");
    const source = input?.source?.trim().slice(0, 80) ?? "";
    const target = input?.target?.trim().slice(0, 80) ?? "";
    if (!source || !target) throw new Error("Thiếu từ.");
    return { ...pair, source, target };
  })
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    await sql`
      insert into glossary_packs (lang, genre) values (${data.lang}, ${data.genre})
      on conflict do nothing
    `;
    await sql`
      insert into glossary_terms (lang, genre, source, target)
      values (${data.lang}, ${data.genre}, ${data.source}, ${data.target})
      on conflict (lang, genre, lower(source)) do update set target = ${data.target}, hidden = false, updated_at = now()
    `;
    await audit(context.userId, "them-thuat-ngu", `${data.lang}/${data.genre}: ${data.source}`);
    return { ok: true as const };
  });

export const deleteGlossaryTerm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: number) => {
    const id = Number(input);
    if (!Number.isInteger(id) || id < 1) throw new Error("Không đúng mục.");
    return id;
  })
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    await sql`delete from glossary_terms where id = ${data}`;
    await audit(context.userId, "xoa-thuat-ngu", String(data));
    return { ok: true as const };
  });

export const setGlossaryHidden = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: number; lang?: string; genre?: string; hidden: boolean; pack?: boolean }) => {
    const hidden = Boolean(input?.hidden);
    if (input?.pack) return { pack: true as const, ...glossaryPair(input.lang ?? "", input.genre ?? ""), hidden };
    const id = Number(input?.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("Không đúng mục.");
    return { pack: false as const, id, hidden };
  })
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    if (data.pack) {
      await sql`
        update glossary_packs set hidden = ${data.hidden}, updated_at = now()
        where lang = ${data.lang} and genre = ${data.genre}
      `;
    } else {
      await sql`update glossary_terms set hidden = ${data.hidden}, updated_at = now() where id = ${data.id}`;
    }
    await audit(context.userId, data.hidden ? "an-thuat-ngu" : "hien-thuat-ngu", data.pack ? `${data.lang}/${data.genre}` : String(data.id));
    return { ok: true as const };
  });

export const setSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; status: "adopted" | "dropped" }) => {
    const id = Number(input?.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("Không đúng mục.");
    if (input?.status !== "adopted" && input?.status !== "dropped") throw new Error("Không đúng trạng thái.");
    return { id, status: input.status };
  })
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    const rows = await sql<{ lang: string; genre: string; source: string; target: string }>`
      select lang, genre, source, target from glossary_suggestions where id = ${data.id}
    `;
    const row = rows[0];
    if (!row) return { ok: true as const };
    if (data.status === "adopted") {
      await sql`
        insert into glossary_packs (lang, genre) values (${row.lang}, ${row.genre})
        on conflict do nothing
      `;
      await sql`
        insert into glossary_terms (lang, genre, source, target)
        values (${row.lang}, ${row.genre}, ${row.source}, ${row.target})
        on conflict (lang, genre, lower(source)) do update set target = ${row.target}, hidden = false, updated_at = now()
      `;
    }
    await sql`update glossary_suggestions set status = ${data.status} where id = ${data.id}`;
    await audit(context.userId, data.status === "adopted" ? "nhan-thuat-ngu" : "bo-thuat-ngu", row.source);
    return { ok: true as const };
  });

async function audit(userId: string, action: string, note: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`
    insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
    values (${userId}, ${action}, ${null}, ${note.slice(0, 500)}, ${""}, ${"chu"}, ${""})
  `;
}

export const setGlossaryPacks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lang?: string; hidden: boolean }) => {
    const lang = (input?.lang ?? "").trim().toLowerCase();
    if (lang && !["ja", "ko", "zh", "en"].includes(lang)) throw new Error("Ngôn ngữ không đúng.");
    return { lang, hidden: Boolean(input?.hidden) };
  })
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    const rows = await sql<{ n: number }>`
      with u as (
        update glossary_packs set hidden = ${data.hidden}, updated_at = now()
        where (${data.lang} = '' or lang = ${data.lang}) and hidden <> ${data.hidden}
        returning 1
      )
      select count(*)::int as n from u
    `;
    await audit(context.userId, data.hidden ? "an-tat-ca-thuat-ngu" : "mo-tat-ca-thuat-ngu", `${data.lang || "tat-ca"}: ${rows[0]?.n ?? 0}`);
    return { changed: rows[0]?.n ?? 0 };
  });

export const restoreGlossary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string }) => glossaryPair(input?.lang ?? "", input?.genre ?? ""))
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    const { fileTerms } = await import("@/lib/glossary-seed.server");
    const rows = fileTerms(data.lang, data.genre);
    let added = 0;
    for (let i = 0; i < rows.length; i += 80) {
      const chunk = rows.slice(i, i + 80);
      const values: unknown[] = [];
      const parts = chunk.map((row, index) => {
        const base = index * 4;
        values.push(row.lang, row.genre, row.source, row.target);
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4})`;
      });
      const inserted = await sql.query<{ id: number }>(
        `insert into glossary_terms (lang, genre, source, target) values ${parts.join(",")} on conflict (lang, genre, lower(source)) do nothing returning id`,
        values,
      );
      added += inserted.length;
    }
    await audit(context.userId, "khoi-phuc-thuat-ngu", `${data.lang}/${data.genre}: ${added}`);
    return { added };
  });

export const glossaryHealth = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    const { fileTerms } = await import("@/lib/glossary-seed.server");
    const files = fileTerms().length;
    const rows = await sql<{ n: number }>`select count(*)::int as n from glossary_terms`;
    const hidden = await sql<{ n: number }>`select count(*)::int as n from glossary_packs where hidden`;
    return { files, stored: rows[0]?.n ?? 0, hiddenPacks: hidden[0]?.n ?? 0 };
  });

export const exportGlossary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string }) => glossaryPair(input?.lang ?? "", input?.genre ?? ""))
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    const rows = await sql<{ source: string; target: string }>`
      select source, target from glossary_terms
      where lang = ${data.lang} and genre = ${data.genre} and hidden = false
      order by source
      limit 5000
    `;
    return { rows };
  });

export const importGlossary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lang: string; genre: string; rows: { source: string; target: string }[] }) => {
    const pair = glossaryPair(input?.lang ?? "", input?.genre ?? "");
    const rows = (input?.rows ?? [])
      .slice(0, 400)
      .map((row) => ({ source: String(row?.source ?? "").trim().slice(0, 80), target: String(row?.target ?? "").trim().slice(0, 80) }))
      .filter((row) => row.source && row.target);
    if (!rows.length) throw new Error("Không có dòng nào dùng được.");
    return { ...pair, rows };
  })
  .handler(async ({ context, data }) => {
    await ownerOnly(context.userId);
    const sql = await sqlOf();
    await sql`insert into glossary_packs (lang, genre) values (${data.lang}, ${data.genre}) on conflict do nothing`;
    let added = 0;
    for (const row of data.rows) {
      const inserted = await sql<{ id: number }>`
        insert into glossary_terms (lang, genre, source, target)
        values (${data.lang}, ${data.genre}, ${row.source}, ${row.target})
        on conflict (lang, genre, lower(source)) do update set target = ${row.target}, hidden = false, updated_at = now()
        returning id
      `;
      if (inserted.length) added += 1;
    }
    await audit(context.userId, "nhap-thuat-ngu", `${data.lang}/${data.genre}: ${added}`);
    return { added };
  });
