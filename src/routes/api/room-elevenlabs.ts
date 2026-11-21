import { createFileRoute } from "@tanstack/react-router";
import { ELEVEN_REQUEST_MAX, ELEVEN_TTS_ID, elevenSpeakBody, elevenSpeakPath, elevenTtsErrorText, parseElevenVoices } from "@/lib/sub/eleven-voice";
import { authHeaders, PROVIDERS } from "@/lib/sub/provider";

/**
 * Cửa giọng đọc ElevenLabs, giống Aura (Deepgram) và Orpheus (Groq):
 * - Trả theo lượt (không có x-user-key): key ElevenLabs của PHÒNG, trừ Token dịch theo số ký tự (chargeWith, đường /audio/speech).
 *   Đoạn ElevenLabs trả lỗi thì không mất tiền.
 * - Thuê phòng (x-user-key): chỉ chuyển tiếp bằng key của khách, không lưu key, không tính tiền; giọng phải nằm trong danh sách Admin mở.
 * Đường (x-eleven-path): `/audio/speech` thân `{model, input, voice, lang}` trả mp3; `/voices` trả `{voices}` của key.
 */
const ALLOWED = new Set(["/audio/speech", "/voices"]);
const BODY_LIMIT = 20 * 1024;
const RATE_PER_MINUTE = 240;
const UPSTREAM_TIMEOUT_MS = 60_000;

function fail(status: number, message: string, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function errorOf(response: Response) {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return fail(response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 400 : 502, elevenTtsErrorText(response.status, payload));
}

function audioOf(response: Response) {
  const out = new Headers();
  out.set("content-type", response.headers.get("content-type") || "audio/mpeg");
  return new Response(response.body, { status: 200, headers: out });
}

export const Route = createFileRoute("/api/room-elevenlabs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
        try {
          assertSameSiteRequest();
        } catch {
          return fail(403, "Yêu cầu từ trang khác bị chặn.");
        }
        const { getSessionUser } = await import("@/lib/auth/verify.server");
        const { requireOpenAccount, takeRate, AccountBlockedError, RateLimitError } = await import("@/lib/guard.server");
        const user = await getSessionUser();
        if (!user) return fail(401, "Cần đăng nhập để dùng giọng ElevenLabs.");
        const path = request.headers.get("x-eleven-path") || "";
        if (!ALLOWED.has(path)) return fail(400, "Yêu cầu không được phép.");
        const userKey = (request.headers.get("x-user-key") || "").trim();
        const roomDoor = !userKey;
        if (!roomDoor && (userKey.length < 20 || userKey.length > 200 || /\s/.test(userKey) || userKey === "room")) return fail(400, "Key ElevenLabs không đúng.");
        try {
          await requireOpenAccount(user.id);
          await takeRate(`room-eleven:${user.id}`, RATE_PER_MINUTE, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return fail(403, error.message);
          if (error instanceof RateLimitError) return fail(429, error.message, { "retry-after": String(error.retryAfter) });
          throw error;
        }
        const declared = Number(request.headers.get("content-length") || 0);
        if (declared > BODY_LIMIT) return fail(413, "Nội dung gửi lên quá lớn.");
        const body = await request.arrayBuffer();
        if (body.byteLength > BODY_LIMIT) return fail(413, "Nội dung gửi lên quá lớn.");

        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        let key = userKey;
        if (roomDoor) {
          const { parseRunDesk } = await import("@/lib/run-desk");
          const desk = parseRunDesk((await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`)[0]?.value);
          if (desk.maintenance && path === "/audio/speech") return fail(403, desk.note || "Cửa trả theo lượt đang bảo trì.");
          key = (await sql<{ value: string }>`select value from room_settings where key = ${PROVIDERS.elevenlabs.settings.key}`)[0]?.value?.trim() || "";
          if (!key) return fail(503, "Phòng chưa lưu key ElevenLabs.");
        }

        if (path === "/voices") {
          try {
            const response = await fetch(`https://api.elevenlabs.io/v2/voices?page_size=100`, {
              headers: authHeaders("elevenlabs", key),
              signal: AbortSignal.timeout(20_000),
            });
            if (!response.ok) return errorOf(response);
            return new Response(JSON.stringify({ voices: parseElevenVoices(await response.json()) }), {
              status: 200,
              headers: { "content-type": "application/json; charset=utf-8" },
            });
          } catch (error) {
            if (isTimeout(error)) return fail(504, "ElevenLabs không trả danh sách giọng kịp. Hãy thử lại.");
            return fail(502, "Không kết nối được ElevenLabs.");
          }
        }

        let input: { model?: unknown; input?: unknown; voice?: unknown; lang?: unknown };
        try {
          input = JSON.parse(new TextDecoder().decode(body)) as typeof input;
        } catch {
          return fail(400, "Không đọc được yêu cầu.");
        }
        if (input.model !== ELEVEN_TTS_ID) return fail(403, "Model đọc này không thuộc ElevenLabs.");
        const text = typeof input.input === "string" ? input.input : "";
        if (!text.trim()) return fail(400, "Không có chữ để đọc.");
        if (text.length > ELEVEN_REQUEST_MAX) return fail(413, "Đoạn đọc quá dài.");
        const voice = typeof input.voice === "string" ? input.voice : "";
        let target: string;
        let payload: string;
        try {
          target = `${PROVIDERS.elevenlabs.api}${elevenSpeakPath(voice)}`;
          payload = JSON.stringify(elevenSpeakBody(text, typeof input.lang === "string" ? input.lang : ""));
        } catch (error) {
          return fail(400, error instanceof Error ? error.message : "Yêu cầu không đúng.");
        }
        const send = () =>
          fetch(target, {
            method: "POST",
            headers: { ...authHeaders("elevenlabs", key), "Content-Type": "application/json", accept: "audio/mpeg" },
            body: payload,
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          });
        const timeoutText = "ElevenLabs không trả lời xong kịp. Phần này chưa tính tiền, hãy thử lại.";

        if (!roomDoor) {
          // Thuê phòng: giọng phải được Admin mở (danh sách chưa lưu thì không khóa thêm).
          const { parseRentShow, rentVoiceProblem } = await import("@/lib/rent-show-rule");
          const show = parseRentShow((await sql<{ value: string }>`select value from room_settings where key = 'rent_show'`)[0]?.value);
          const blocked = rentVoiceProblem(show, ELEVEN_TTS_ID, "elevenlabs");
          if (blocked) return fail(403, blocked);
          try {
            const response = await send();
            return response.ok ? audioOf(response) : errorOf(response);
          } catch (error) {
            if (isTimeout(error)) return fail(504, timeoutText);
            return fail(502, "Không kết nối được ElevenLabs.");
          }
        }

        const { parseRunDesk } = await import("@/lib/run-desk");
        const { loadPriceBook } = await import("@/lib/run-board.server");
        const { chargeWith } = await import("@/lib/run-gate");
        const { loadElevenlabsRows } = await import("@/lib/sub/elevenlabs-board.server");
        const desk = parseRunDesk((await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`)[0]?.value);
        const live = await loadPriceBook(sql);
        if (!live) return fail(503, "Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
        const priced = (await loadElevenlabsRows(sql)).find((row) => row.id === ELEVEN_TTS_ID);
        if (!priced) return fail(422, "Model này chưa có giá niêm yết.");
        const book = { rate: live.rate, rows: [...live.rows, priced], desk: { markup: 0, custom: {} } };
        // chargeWith đọc model và số chữ theo dạng `{model, input}`; giữ đúng dạng đó cho phần tính tiền.
        const billed = new TextEncoder().encode(JSON.stringify({ model: ELEVEN_TTS_ID, input: text })).buffer as ArrayBuffer;
        try {
          const outcome = await chargeWith({
            sql,
            book,
            provider: "elevenlabs",
            path: "/audio/speech",
            model: ELEVEN_TTS_ID,
            chars: text.length,
            userId: user.id,
            ticketId: "",
            body: billed,
            cap: desk.cap,
            send,
          });
          if (outcome.kind === "reject") return fail(outcome.status, outcome.message);
          return outcome.response.ok ? audioOf(outcome.response) : errorOf(outcome.response);
        } catch (error) {
          if (isTimeout(error)) return fail(504, timeoutText);
          throw error;
        }
      },
    },
  },
});
