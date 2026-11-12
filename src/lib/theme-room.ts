import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { THEME_DEFAULT, checkTheme, parseTheme, type Theme, type ThemeIssue } from "@/lib/theme/theme";

const LIVE = "theme_live";
const DRAFT = "theme_draft";
const HISTORY = "theme_history";
const HISTORY_MAX = 10;

export type ThemeHistoryItem = { at: string; by: string; theme: Theme };
export type ThemeAdminView = { live: Theme; draft: Theme; history: ThemeHistoryItem[]; issues: ThemeIssue[] };

async function readTheme(key: string): Promise<Theme | null> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from room_settings where key = ${key}`;
  if (!rows[0]) return null;
  try {
    return parseTheme(JSON.parse(rows[0].value));
  } catch {
    return null;
  }
}

async function writeSetting(key: string, value: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`
    insert into room_settings (key, value) values (${key}, ${value})
    on conflict (key) do update set value = ${value}
  `;
}

async function readHistory(): Promise<ThemeHistoryItem[]> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from room_settings where key = ${HISTORY}`;
  if (!rows[0]) return [];
  try {
    const list = JSON.parse(rows[0].value) as unknown;
    if (!Array.isArray(list)) return [];
    return list.slice(0, HISTORY_MAX).map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        at: typeof row.at === "string" ? row.at : "",
        by: typeof row.by === "string" ? row.by : "",
        theme: parseTheme(row.theme),
      };
    });
  } catch {
    return [];
  }
}

/** Công khai: ai mở trang cũng đọc được giao diện đang dùng. Lỗi thì trả mặc định, không làm hỏng trang. */
export const getLiveTheme = createServerFn({ method: "GET" }).handler(async (): Promise<Theme> => {
  try {
    return (await readTheme(LIVE)) ?? THEME_DEFAULT;
  } catch {
    return THEME_DEFAULT;
  }
});

export const getThemeAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ThemeAdminView> => {
    await requireRole(context.userId, "chu");
    const live = (await readTheme(LIVE)) ?? THEME_DEFAULT;
    const draft = (await readTheme(DRAFT)) ?? live;
    return { live, draft, history: await readHistory(), issues: checkTheme(draft) };
  });

export const saveThemeDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseTheme(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    await writeSetting(DRAFT, JSON.stringify(data));
    return { draft: data, issues: checkTheme(data) };
  });

/** Công bố bản nháp đang lưu. Còn lỗi tương phản thì từ chối. Bản live cũ được đẩy vào lịch sử. */
export const publishTheme = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const place = await requireRole(context.userId, "chu");
    const draft = await readTheme(DRAFT);
    if (!draft) throw new Error("Chưa có bản nháp để công bố.");
    const issues = checkTheme(draft);
    if (issues.length) throw new Error(`Chưa công bố được: ${issues.length} chỗ chữ khó đọc. Sửa màu rồi thử lại.`);
    const before = (await readTheme(LIVE)) ?? THEME_DEFAULT;
    const history = await readHistory();
    history.unshift({ at: new Date().toISOString(), by: place.email, theme: before });
    await writeSetting(HISTORY, JSON.stringify(history.slice(0, HISTORY_MAX)));
    await writeSetting(LIVE, JSON.stringify(draft));
    await writeAudit(context.userId, "giao-dien", null, "công bố giao diện");
    return { live: draft };
  });

/** Đưa một bản trong lịch sử (hoặc mặc định) về làm bản nháp. Chưa đổi gì với khách cho đến khi bấm Công bố. */
export const loadThemeToDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { from: "history" | "default"; index?: number }) => {
    if (input?.from !== "history" && input?.from !== "default") throw new Error("Nguồn không hợp lệ.");
    return { from: input.from, index: Number.isInteger(input.index) ? Number(input.index) : -1 };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    let next: Theme = THEME_DEFAULT;
    if (data.from === "history") {
      const item = (await readHistory())[data.index];
      if (!item) throw new Error("Không tìm thấy bản cũ.");
      next = item.theme;
    }
    await writeSetting(DRAFT, JSON.stringify(next));
    return { draft: next, issues: checkTheme(next) };
  });
