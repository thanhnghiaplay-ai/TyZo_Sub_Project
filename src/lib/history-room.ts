import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { GrantRecord, TicketRecord } from "@/lib/history-view";

type MyHistory = { tickets: TicketRecord[]; next: string | null; grants: GrantRecord[] };

const PAGE = 20;

function stamp(value: unknown): string {
  if (value == null) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

/**
 * Lịch sử của chính người đang đăng nhập (v5.31.0): phiếu từng lượt (mới nhất trước, mỗi trang 20) và các gói Token dịch.
 * Chỉ đọc dòng có user_id của phiên; không nhận mã người dùng từ máy khách. Tên tệp đầy đủ vì là của chính khách.
 */
export const getMyHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { before?: string | null } | undefined) => {
    const raw = input?.before ? String(input.before) : "";
    const before = raw && Number.isFinite(Date.parse(raw)) ? new Date(raw).toISOString() : null;
    return { before };
  })
  .handler(async ({ context, data }): Promise<MyHistory> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string; file_name: string; seconds: number; held: number; charged: number; released: number;
      status: string; unit: string; asr_model: string; chat_model: string; created_at: unknown; closed_at: unknown;
    }>`
      select id, file_name, seconds, held, charged, released, status, unit, asr_model, chat_model, created_at, closed_at
      from run_tickets
      where user_id = ${context.userId} and (${data.before}::timestamptz is null or created_at < ${data.before}::timestamptz)
      order by created_at desc limit ${PAGE + 1}
    `;
    const page = rows.slice(0, PAGE);
    const grants = data.before
      ? []
      : await sql<{ id: string; tokens: number; left_tokens: number; expires_at: unknown; created_at: unknown }>`
          select id, tokens, left_tokens, expires_at, created_at from token_grants
          where user_id = ${context.userId} order by created_at desc limit 20
        `;
    return {
      tickets: page.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        seconds: Number(row.seconds) || 0,
        held: Number(row.held) || 0,
        charged: Number(row.charged) || 0,
        released: Number(row.released) || 0,
        status: row.status,
        unit: row.unit,
        asrModel: row.asr_model,
        chatModel: row.chat_model,
        createdAt: stamp(row.created_at),
        closedAt: row.closed_at == null ? null : stamp(row.closed_at),
      })),
      next: rows.length > PAGE ? stamp(page[page.length - 1].created_at) : null,
      grants: grants.map((row) => ({ id: row.id, tokens: Number(row.tokens), left: Number(row.left_tokens), expiresAt: stamp(row.expires_at), createdAt: stamp(row.created_at) })),
    };
  });
