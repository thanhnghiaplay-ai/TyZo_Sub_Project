import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { ASSEMBLYAI_BASE_ROWS } from "@/lib/sub/assemblyai-base";
import { SPEECHMATICS_BASE_ROWS } from "@/lib/sub/speechmatics-base";
import { SONIOX_BASE_ROWS } from "@/lib/sub/soniox-base";
import { ASR_MODELS, CHAT_MODELS, modelLabel } from "@/lib/sub/models";
import { asrHouse } from "@/lib/sub/asr-house";
import { isPulledHouse } from "@/lib/price-house";
import type { AliQuote } from "@/lib/sub/alibaba-price";
import type { DgPriceConfig, DgQuote } from "@/lib/sub/deepgram-price";
import type { GroqLiveRow } from "@/lib/sub/groq-board";
import { applyUsdFix, emptySlot, parseUsdFix, tokenPriceLine, type UsdFix, type UsdSlot } from "@/lib/usd-fix";

export type ModelPriceRow = {
  id: string;
  name: string;
  house: string;
  kind: "hour" | "chat" | "chars";
  auto: UsdSlot;
  fix: UsdSlot;
  tokens: string;
};

const KEY = "usd_fix";

function slotOf(row: GroqLiveRow | undefined): UsdSlot {
  if (!row) return emptySlot();
  return {
    hour: row.usdPerHour,
    inn: row.usdIn,
    out: row.usdOut,
    chars: row.usdPerMillionChars,
  };
}

function kindOf(id: string, auto: UsdSlot): ModelPriceRow["kind"] {
  if (auto.chars != null || /tts/i.test(id)) return "chars";
  if (auto.hour != null || /whisper|filetrans|asr/i.test(id)) return "hour";
  return "chat";
}

async function readBoards() {
  const { getSql } = await import("@/lib/db");
  const { mergeAlibaba } = await import("@/lib/sub/alibaba-price");
  const { mergeDeepgram, parseDgConfig, DG_CONFIG_KEY } = await import("@/lib/sub/deepgram-price");
  const sql = await getSql();
  const saved = await sql<{ key: string; value: string }>`
    select key, value from room_settings where key in ('run_board', 'ali_board', 'dg_board', ${DG_CONFIG_KEY}, ${KEY})
  `;
  const map = new Map(saved.map((row) => [row.key, row.value]));
  let groq: GroqLiveRow[] = [];
  let rate: number | null = null;
  try {
    const stored = map.get("run_board") ? (JSON.parse(map.get("run_board") as string) as { board?: { rate?: number; rows?: GroqLiveRow[] } }) : null;
    groq = stored?.board?.rows ?? [];
    rate = stored?.board?.rate ?? null;
  } catch {
    groq = [];
  }
  let quotes: AliQuote[] = [];
  try {
    const stored = map.get("ali_board") ? (JSON.parse(map.get("ali_board") as string) as { quotes?: AliQuote[] }) : null;
    quotes = Array.isArray(stored?.quotes) ? stored.quotes : [];
  } catch {
    quotes = [];
  }
  const ali = mergeAlibaba(quotes);
  let dgStored: { at?: number; quotes?: DgQuote[] } | null = null;
  try {
    dgStored = map.get("dg_board") ? (JSON.parse(map.get("dg_board") as string) as { at?: number; quotes?: DgQuote[] }) : null;
  } catch {
    dgStored = null;
  }
  const dg = mergeDeepgram(Array.isArray(dgStored?.quotes) ? dgStored.quotes : []);
  const dgConfig = parseDgConfig(map.get(DG_CONFIG_KEY));
  const fix = parseUsdFix(map.get(KEY));
  return { sql, groq, ali, dg, dgAt: dgStored?.at ?? null, dgConfig, rate, fix };
}

function listed(groq: GroqLiveRow[], ali: GroqLiveRow[], dg: GroqLiveRow[], fix: UsdFix): ModelPriceRow[] {
  const groqIds = [
    ...ASR_MODELS.filter((row) => asrHouse(row.id) === "groq").map((row) => row.id),
    ...CHAT_MODELS.map((row) => row.id),
  ];
  const aliIds = ALIBABA_ROWS.map((row) => row.id);
  const turbo = groq.find((row) => row.id === "whisper-large-v3-turbo")?.usdPerHour ?? 0.04;
  const rows: ModelPriceRow[] = [];
  for (const id of groqIds) {
    const auto = slotOf(groq.find((row) => row.id === id));
    const slot = fix[id] ?? emptySlot();
    const effective = applyUsdFix([{ ...blank(id), usdPerHour: auto.hour, usdIn: auto.inn, usdOut: auto.out, usdPerMillionChars: auto.chars }], { [id]: slot })[0];
    rows.push({ id, name: ASR_MODELS.find((item) => item.id === id)?.name ?? modelLabel(id), house: "Groq", kind: kindOf(id, auto), auto, fix: slot, tokens: tokenPriceLine(effective, turbo) });
  }
  for (const id of aliIds) {
    const auto = slotOf(ali.find((row) => row.id === id));
    const slot = fix[id] ?? emptySlot();
    const effective = applyUsdFix([{ ...blank(id), usdPerHour: auto.hour, usdIn: auto.inn, usdOut: auto.out, usdPerMillionChars: auto.chars }], { [id]: slot })[0];
    rows.push({ id, name: modelLabel(id), house: "Alibaba", kind: kindOf(id, auto), auto, fix: slot, tokens: tokenPriceLine(effective, turbo) });
  }
  for (const row of dg) {
    const auto = slotOf(row);
    const slot = fix[row.id] ?? emptySlot();
    const effective = applyUsdFix([{ ...blank(row.id), usdPerHour: auto.hour, usdIn: auto.inn, usdOut: auto.out, usdPerMillionChars: auto.chars }], { [row.id]: slot })[0];
    rows.push({ id: row.id, name: ASR_MODELS.find((item) => item.id === row.id)?.name ?? modelLabel(row.id), house: "Deepgram", kind: kindOf(row.id, auto), auto, fix: slot, tokens: tokenPriceLine(effective, turbo) });
  }
  // AssemblyAI chưa có trang giá để tự kéo: số "tự động" là giá cố định trong code, Chủ sửa tay ở ô bên cạnh.
  for (const row of ASSEMBLYAI_BASE_ROWS) {
    const auto = slotOf(row);
    const slot = fix[row.id] ?? emptySlot();
    const effective = applyUsdFix([{ ...blank(row.id), usdPerHour: auto.hour, usdIn: auto.inn, usdOut: auto.out, usdPerMillionChars: auto.chars }], { [row.id]: slot })[0];
    rows.push({ id: row.id, name: ASR_MODELS.find((item) => item.id === row.id)?.name ?? modelLabel(row.id), house: "AssemblyAI", kind: kindOf(row.id, auto), auto, fix: slot, tokens: tokenPriceLine(effective, turbo) });
  }
  // Speechmatics: như AssemblyAI, số "tự động" là giá cố định trong code, Chủ sửa tay ở ô bên cạnh.
  for (const row of SPEECHMATICS_BASE_ROWS) {
    const auto = slotOf(row);
    const slot = fix[row.id] ?? emptySlot();
    const effective = applyUsdFix([{ ...blank(row.id), usdPerHour: auto.hour, usdIn: auto.inn, usdOut: auto.out, usdPerMillionChars: auto.chars }], { [row.id]: slot })[0];
    rows.push({ id: row.id, name: ASR_MODELS.find((item) => item.id === row.id)?.name ?? modelLabel(row.id), house: "Speechmatics", kind: kindOf(row.id, auto), auto, fix: slot, tokens: tokenPriceLine(effective, turbo) });
  }
  // Soniox: như AssemblyAI, số "tự động" là giá cố định trong code, Chủ sửa tay ở ô bên cạnh.
  for (const row of SONIOX_BASE_ROWS) {
    const auto = slotOf(row);
    const slot = fix[row.id] ?? emptySlot();
    const effective = applyUsdFix([{ ...blank(row.id), usdPerHour: auto.hour, usdIn: auto.inn, usdOut: auto.out, usdPerMillionChars: auto.chars }], { [row.id]: slot })[0];
    rows.push({ id: row.id, name: ASR_MODELS.find((item) => item.id === row.id)?.name ?? modelLabel(row.id), house: "Soniox", kind: kindOf(row.id, auto), auto, fix: slot, tokens: tokenPriceLine(effective, turbo) });
  }
  return rows;
}

function blank(id: string): GroqLiveRow {
  return {
    id,
    speed: null,
    usdIn: null,
    usdOut: null,
    usdPerHour: null,
    usdPerMillionChars: null,
    unlisted: false,
    limits: [],
    contextTokens: null,
    maxCompletionTokens: null,
    maxFile: null,
  };
}

export const getModelPrices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, "chu");
    const { groq, ali, dg, dgAt, dgConfig, rate, fix } = await readBoards();
    return { rate, rows: listed(groq, ali, dg, fix), deepgram: { ...dgConfig, at: dgAt } };
  });

export const saveUsdFix = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: UsdFix) => parseUsdFix(JSON.stringify(input)))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { sql, groq, ali, dg, dgAt, dgConfig, rate } = await readBoards();
    const value = JSON.stringify(data);
    await sql`insert into room_settings (key, value) values (${KEY}, ${value}) on conflict (key) do update set value = ${value}`;
    await writeAudit(context.userId, "sua-usd", null, `${Object.keys(data).length} model có số đô la sửa tay`);
    return { rate, rows: listed(groq, ali, dg, data), deepgram: { ...dgConfig, at: dgAt } };
  });

export const reloadModelPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { house?: string } | undefined) => {
    const house = input?.house;
    if (house === undefined) return { house: undefined };
    if (!isPulledHouse(house)) throw new Error("Nhà này không lấy giá từ trang giá.");
    return { house };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const only = data.house;
    if (!only || only === "Groq") {
      const { fetchGroqBoard } = await import("@/lib/sub/groq-board-load");
      try {
        const board = await fetchGroqBoard();
        const value = JSON.stringify({ at: Date.now(), board });
        await sql`insert into room_settings (key, value) values ('run_board', ${value}) on conflict (key) do update set value = ${value}`;
      } catch {
        /* giữ bảng Groq cũ */
      }
    }
    if (!only || only === "Alibaba") {
      const { refreshAlibabaBoard } = await import("@/lib/sub/alibaba-board.server");
      await refreshAlibabaBoard(sql);
    }
    // Chủ bấm tay thì kéo Deepgram ngay, kể cả khi đang tắt tự động.
    let dgOk: boolean | undefined;
    if (!only || only === "Deepgram") {
      const { refreshDeepgramBoard } = await import("@/lib/sub/deepgram-board.server");
      dgOk = await refreshDeepgramBoard(sql);
    }
    const { groq, ali, dg, dgAt, dgConfig, rate, fix } = await readBoards();
    return { rate, rows: listed(groq, ali, dg, fix), deepgram: { ...dgConfig, at: dgAt }, deepgramPulled: dgOk };
  });

/** Chủ bật/tắt tự cập nhật giá Deepgram và chọn chu kỳ (giờ). */
export const saveDeepgramPriceConfig = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: DgPriceConfig) => {
    const hours = Math.round(Number(input?.everyHours));
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) throw new Error("Chu kỳ phải từ 1 đến 168 giờ.");
    return { auto: input.auto !== false, everyHours: hours };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const { DG_CONFIG_KEY } = await import("@/lib/sub/deepgram-price");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`insert into room_settings (key, value) values (${DG_CONFIG_KEY}, ${value}) on conflict (key) do update set value = ${value}`;
    await writeAudit(context.userId, "sua-usd", null, data.auto ? `Giá Deepgram tự cập nhật mỗi ${data.everyHours} giờ` : "Tắt tự cập nhật giá Deepgram");
    return data;
  });
