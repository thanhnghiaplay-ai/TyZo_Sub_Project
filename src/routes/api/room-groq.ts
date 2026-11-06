import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = new Set(["/models", "/audio/transcriptions", "/chat/completions", "/audio/speech"]);

export const Route = createFileRoute("/api/room-groq")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getSessionUser } = await import("@/lib/auth/verify.server");
        const { parseRunDesk } = await import("@/lib/run-desk");
        const user = await getSessionUser();
        if (!user) return new Response("Cần đăng nhập để dùng cửa trả theo lượt.", { status: 401 });
        const path = request.headers.get("x-groq-path") || "";
        if (!ALLOWED.has(path)) return new Response("Yêu cầu không được phép.", { status: 400 });
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
        const desk = parseRunDesk(saved[0]?.value);
        if (desk.maintenance) return new Response(desk.note || "Cửa trả theo lượt đang bảo trì.", { status: 403 });
        const keys = await sql<{ value: string }>`select value from room_settings where key = 'run_key'`;
        const key = keys[0]?.value?.trim();
        if (!key) return new Response("Phòng chưa lưu key cho cửa trả theo lượt.", { status: 503 });
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${key}`);
        const contentType = request.headers.get("content-type");
        if (path !== "/models" && contentType) headers.set("Content-Type", contentType);
        const upstream = await fetch(`https://api.groq.com/openai/v1${path}`, {
          method: path === "/models" ? "GET" : "POST",
          headers,
          body: path === "/models" ? undefined : await request.arrayBuffer(),
        });
        const out = new Headers();
        const type = upstream.headers.get("content-type");
        if (type) out.set("content-type", type);
        return new Response(upstream.body, { status: upstream.status, headers: out });
      },
    },
  },
});
