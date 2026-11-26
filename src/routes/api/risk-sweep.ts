import { createFileRoute } from "@tanstack/react-router";

/**
 * Quét vi phạm mỗi đêm, do VPS gọi (lệnh «tyzo» → mục 16). Xác thực bằng chữ ký HMAC theo LIVE_BRIDGE_SECRET
 * (web và cầu nối đã dùng chung chuỗi này). Mỗi lần gọi quét một đợt ngắn, trả «next» để VPS gọi tiếp tới khi hết.
 * POST, tiêu đề: x-tyzo-time (giây), x-tyzo-nonce (32 hex, dùng một lần), x-tyzo-sign (hex, xem sweep-sign.ts).
 * Thân: {"after": "<mã tài khoản>"} hoặc {}.
 */
export const Route = createFileRoute("/api/risk-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { fail, failFrom, json } = await import("@/lib/app-api.server");
        try {
          const { env } = await import("@/lib/env.server");
          const secret = env("LIVE_BRIDGE_SECRET");
          if (!secret || secret.length < 24) return fail(503, "Chưa đặt LIVE_BRIDGE_SECRET trên web.");
          const time = Number(request.headers.get("x-tyzo-time"));
          const nonce = (request.headers.get("x-tyzo-nonce") ?? "").trim().toLowerCase();
          const sign = (request.headers.get("x-tyzo-sign") ?? "").trim().toLowerCase();
          const { sweepMessage, sweepTimeOk, sweepNonceOk, SWEEP_PATH } = await import("@/lib/sweep-sign");
          if (!sweepTimeOk(time, Date.now() / 1000)) return fail(401, "Giờ trên VPS lệch quá 5 phút hoặc thiếu giờ.");
          if (!sweepNonceOk(nonce)) return fail(401, "Thiếu mã dùng một lần (cập nhật script trên VPS: tyzo → 2).");
          const { readCapped } = await import("@/lib/app-api.server");
          const raw = await readCapped(request, 8 * 1024);
          if (raw === null) return fail(413, "Nội dung gửi lên quá lớn.");
          const { createHash, createHmac, timingSafeEqual } = await import("node:crypto");
          const bodyHash = createHash("sha256").update(raw).digest("hex");
          // AZ-006: chữ ký gắn giờ, mã dùng một lần, phương thức, đường dẫn và đúng thân yêu cầu.
          const want = createHmac("sha256", secret).update(sweepMessage(time, nonce, "POST", SWEEP_PATH, bodyHash)).digest();
          const got = /^[a-f0-9]{64}$/.test(sign) ? Buffer.from(sign, "hex") : Buffer.alloc(0);
          if (got.length !== want.length || !timingSafeEqual(got, want)) return fail(401, "Chữ ký sai (LIVE_BRIDGE_SECRET trên VPS khác trên web, hoặc script VPS cũ: tyzo → 2).");
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          // Chống gửi lại: mỗi mã chỉ nhận một lần (giữ 1 giờ, quá cửa sổ 5 phút là chữ ký hết hạn).
          await sql`delete from sweep_nonces where created_at < now() - interval '1 hour'`;
          const fresh = await sql`insert into sweep_nonces (nonce) values (${nonce}) on conflict do nothing returning 1`;
          if (!fresh.length) return fail(401, "Chữ ký này đã dùng rồi.");
          let body: Record<string, unknown> = {};
          try {
            const parsed = raw ? (JSON.parse(raw) as unknown) : {};
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
          } catch {
            return fail(400, "Nội dung không đọc được.");
          }
          const after = typeof body.after === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(body.after) ? body.after : undefined;
          const { sweepRisk } = await import("@/lib/risk.server");
          const r = await sweepRisk(sql, { after, budgetMs: 8000 });
          // Ghi kết quả đêm (cộng dồn theo đợt) để tab Rủi ro hiện «Quét đêm gần nhất».
          const prev = after ? await sql<{ value: string }>`select value from room_settings where key = 'risk_sweep_night'` : [];
          let acc = { at: new Date().toISOString(), checked: 0, made: 0, rounds: 0 };
          try {
            if (prev[0]) acc = { ...(JSON.parse(prev[0].value) as typeof acc), at: new Date().toISOString() };
          } catch {
            /* bắt đầu lại */
          }
          acc = { ...acc, checked: acc.checked + r.checked, made: acc.made + r.made, rounds: acc.rounds + 1 };
          const value = JSON.stringify(acc);
          await sql`insert into room_settings (key, value) values ('risk_sweep_night', ${value}) on conflict (key) do update set value = ${value}`;
          return json(200, r);
        } catch (error) {
          return failFrom(error);
        }
      },
    },
  },
});
