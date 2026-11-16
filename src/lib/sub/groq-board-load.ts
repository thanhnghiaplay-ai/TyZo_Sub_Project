import { createServerFn } from "@tanstack/react-start";
import { parseGroqModelsHtml, type GroqBoard } from "@/lib/sub/groq-board";

const MODELS_PAGE = "https://console.groq.com/docs/models";
const FX_PAGE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json";

export async function fetchGroqBoard(): Promise<GroqBoard> {
  const page = await fetch(MODELS_PAGE, {
    headers: { accept: "text/html", "user-agent": "TyZoSub" },
    signal: AbortSignal.timeout(15000),
  });
  if (!page.ok) throw new Error("Không tải được bảng giá Groq.");
  const rows = parseGroqModelsHtml(await page.text());
  if (!rows.length) throw new Error("Trang giá Groq không còn đúng dạng bảng.");
  const fxRes = await fetch(FX_PAGE, { signal: AbortSignal.timeout(10000) });
  if (!fxRes.ok) throw new Error("Không lấy được tỷ giá đô.");
  const fx = (await fxRes.json()) as { date?: string; usd?: { vnd?: number } };
  const rate = Number(fx.usd?.vnd);
  if (!Number.isFinite(rate) || rate < 1000) throw new Error("Tỷ giá đô không hợp lệ.");
  return { rate, rateDate: fx.date || "", rows };
}

export const loadGroqBoard = createServerFn({ method: "POST" }).handler(async (): Promise<GroqBoard> => {
  const board = await fetchGroqBoard();
  try {
    const { getSql } = await import("@/lib/db");
    const { applyUsdFix, parseUsdFix } = await import("@/lib/usd-fix");
    const sql = await getSql();
    const raw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
    return { ...board, rows: applyUsdFix(board.rows, parseUsdFix(raw[0]?.value)) };
  } catch {
    return board;
  }
});
