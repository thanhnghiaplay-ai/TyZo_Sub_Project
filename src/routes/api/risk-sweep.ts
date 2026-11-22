import { createFileRoute } from "@tanstack/react-router";

/**
 * Quét vi phạm mỗi đêm, do VPS gọi (lệnh «tyzo» → mục 16). Xác thực bằng chữ ký HMAC theo LIVE_BRIDGE_SECRET
 * (web và cầu nối đã dùng chung chuỗi này). Mỗi lần gọi quét một đợt ngắn, trả «next» để VPS gọi tiếp tới khi hết.
 * POST, tiêu đề: x-tyzo-time (giây), x-tyzo-sign (hex). Thân: {"after": "<mã tài khoản>"} hoặc rỗng.
 */
export const Route = createFileRoute("/api/risk-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { fail, failFrom, json, readJson } = await import("@/lib/app-api.server");
        try {
          const { env } = await import("@/lib/env.server");
          const secret = env("LIVE_BRIDGE_SECRET");
          if (!secret || secret.length < 24) return fail(503, "Chưa đặt LIVE_BRIDGE_SECRET trên web.");
          const time = Number(request.headers.get("x-tyzo-time"));
          const sign = (request.headers.get("x-tyzo-sign") ?? "").trim().toLowerCase();
          const { sweepMessage, sweepTimeOk } = await import("@/lib/sweep-sign");
          if (!sweepTimeOk(time, Date.now() / 1000)) return fail(401, "Giờ trên VPS lệch quá 5 phút hoặc thiếu giờ.");
          const { createHmac, timingSafeEqual } = await import("node:crypto");
          const want = createHmac("sha256", secret).update(sweepMessage(time)).digest();
          const got = /^[a-f0-9]{64}$/.test(sign) ? Buffer.from(sign, "hex") : Buffer.alloc(0);
          if (got.length !== want.length || !timingSafeEqual(got, want)) return fail(401, "Chữ ký sai (LIVE_BRIDGE_SECRET trên VPS khác trên web).");
          const body = (await readJson(request)) ?? {};
          const after = typeof body.after === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(body.after) ? body.after : undefined;
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
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
