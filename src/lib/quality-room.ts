import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseQualityReport, type BoardRow, type QualityReport } from "@/lib/quality-board";
import { checkQualityThresholds, parseQualityThresholds, type QualityThresholds } from "@/lib/sub/quality";

/**
 * Trình duyệt báo số liệu chất lượng sau mỗi lần nhận dạng xong. Chỉ lưu số, không lưu mã tài khoản.
 * Lỗi ở đây không được làm hỏng lần dịch, nên bên gọi bỏ qua mọi lỗi.
 */
export const reportQuality = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: QualityReport) => parseQualityReport(input))
  .handler(async ({ context, data }) => {
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    await takeRate(`quality:${context.userId}`, 30, 3600);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into quality_runs (
        app_version, key_source, asr_model, source_lang, seconds, segments,
        band_high, band_check, band_low, band_unknown, conf_mean,
        parts_total, parts_whisper, parts_empty, parts_silence, parts_decode_fail,
        app_filtered, kept_cues, health,
        lang_check, lang_suspect, lang_resent, lang_swapped, lang_before, lang_after
      ) values (
        ${data.appVersion}, ${data.keySource}, ${data.asrModel}, ${data.sourceLang}, ${data.seconds}, ${data.segments},
        ${data.high}, ${data.check}, ${data.low}, ${data.unknown}, ${data.confMean}::float8,
        ${data.partsTotal}, ${data.partsWhisper}, ${data.partsEmpty}, ${data.partsSilence}, ${data.partsDecodeFail},
        ${data.appFiltered}, ${data.keptCues}, ${data.health},
        ${data.langCheck}, ${data.langSuspect}, ${data.langResent}, ${data.langSwapped}, ${data.langBefore}::float8, ${data.langAfter}::float8
      )
    `;
    return { ok: true as const };
  });

type DbRow = {
  day: string;
  key_source: string;
  source_lang: string;
  asr_model: string;
  app_version: string;
  runs: number;
  seconds: number;
  segments: number;
  high: number;
  check_n: number;
  low: number;
  unknown_n: number;
  conf_sum: number;
  conf_weight: number;
  parts_total: number;
  parts_whisper: number;
  parts_empty: number;
  parts_silence: number;
  parts_decode_fail: number;
  app_filtered: number;
  kept_cues: number;
  lang_runs: number;
  lang_suspect: number;
  lang_resent: number;
  lang_swapped: number;
  lang_before_sum: number;
  lang_after_sum: number;
  lang_weight: number;
  h_green: number;
  h_yellow: number;
  h_red: number;
  h_unknown: number;
};

/** Chỉ Chủ. Trả các dòng đã gộp theo ngày, loại key, ngôn ngữ, model, phiên bản. Phần còn lại gộp ở trình duyệt. */
export const getQualityBoard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((days: number) => (days === 7 || days === 90 ? days : 30))
  .handler(async ({ context, data }): Promise<{ rows: BoardRow[]; days: number; thresholds: QualityThresholds }> => {
    const { requireRole } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const window = `${data} days`;
    const found = await sql<DbRow>`
      select
        to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as day,
        key_source, source_lang, asr_model, app_version,
        count(*)::int as runs,
        coalesce(sum(seconds), 0)::int as seconds,
        coalesce(sum(segments), 0)::int as segments,
        coalesce(sum(band_high), 0)::int as high,
        coalesce(sum(band_check), 0)::int as check_n,
        coalesce(sum(band_low), 0)::int as low,
        coalesce(sum(band_unknown), 0)::int as unknown_n,
        coalesce(sum(conf_mean * segments) filter (where conf_mean is not null), 0)::float8 as conf_sum,
        coalesce(sum(segments) filter (where conf_mean is not null), 0)::int as conf_weight,
        coalesce(sum(parts_total), 0)::int as parts_total,
        coalesce(sum(parts_whisper), 0)::int as parts_whisper,
        coalesce(sum(parts_empty), 0)::int as parts_empty,
        coalesce(sum(parts_silence), 0)::int as parts_silence,
        coalesce(sum(parts_decode_fail), 0)::int as parts_decode_fail,
        coalesce(sum(app_filtered), 0)::int as app_filtered,
        coalesce(sum(kept_cues), 0)::int as kept_cues,
        count(*) filter (where lang_check)::int as lang_runs,
        coalesce(sum(lang_suspect), 0)::int as lang_suspect,
        coalesce(sum(lang_resent), 0)::int as lang_resent,
        coalesce(sum(lang_swapped), 0)::int as lang_swapped,
        coalesce(sum(lang_before * lang_swapped) filter (where lang_before is not null and lang_after is not null), 0)::float8 as lang_before_sum,
        coalesce(sum(lang_after * lang_swapped) filter (where lang_before is not null and lang_after is not null), 0)::float8 as lang_after_sum,
        coalesce(sum(lang_swapped) filter (where lang_before is not null and lang_after is not null), 0)::int as lang_weight,
        count(*) filter (where health = 'green')::int as h_green,
        count(*) filter (where health = 'yellow')::int as h_yellow,
        count(*) filter (where health = 'red')::int as h_red,
        count(*) filter (where health = 'unknown')::int as h_unknown
      from quality_runs
      where created_at > now() - ${window}::interval
      group by 1, 2, 3, 4, 5
      order by 1
    `;
    const rows: BoardRow[] = found.map((r) => ({
      day: r.day,
      keySource: r.key_source === "room" ? "room" : "own",
      sourceLang: r.source_lang,
      asrModel: r.asr_model,
      appVersion: r.app_version,
      runs: r.runs,
      seconds: r.seconds,
      segments: r.segments,
      high: r.high,
      check: r.check_n,
      low: r.low,
      unknown: r.unknown_n,
      confSum: r.conf_sum,
      confWeight: r.conf_weight,
      partsTotal: r.parts_total,
      partsWhisper: r.parts_whisper,
      partsEmpty: r.parts_empty,
      partsSilence: r.parts_silence,
      partsDecodeFail: r.parts_decode_fail,
      appFiltered: r.app_filtered,
      keptCues: r.kept_cues,
      langRuns: r.lang_runs,
      langSuspect: r.lang_suspect,
      langResent: r.lang_resent,
      langSwapped: r.lang_swapped,
      langBeforeSum: r.lang_before_sum,
      langAfterSum: r.lang_after_sum,
      langWeight: r.lang_weight,
      healthGreen: r.h_green,
      healthYellow: r.h_yellow,
      healthRed: r.h_red,
      healthUnknown: r.h_unknown,
    }));
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'quality_thresholds'`;
    return { rows, days: data, thresholds: parseQualityThresholds(saved[0]?.value) };
  });

/** Ngưỡng đang dùng. Trình duyệt của khách đọc để tính đèn và mức tin cho lần chạy của mình. Chỉ là con số. */
export const getQualityThresholds = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<QualityThresholds> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'quality_thresholds'`;
    return parseQualityThresholds(saved[0]?.value);
  });

/** Chỉ Chủ. Lưu bộ ngưỡng mới. Chỉ áp dụng cho lần chạy sau, số đã báo giữ theo ngưỡng lúc chạy. */
export const saveQualityThresholds = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => checkQualityThresholds(input))
  .handler(async ({ context, data }): Promise<QualityThresholds> => {
    const { requireRole, writeAudit } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values ('quality_thresholds', ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "doi-nguong-chat-luong", null, value);
    return data;
  });
