import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { mailerName, sendMail } from "@/lib/auth/mailer";
import { deskToEnv, readMailStored } from "@/lib/mail-desk-shape";
import { allowMailSend, mailFace, readMailPolicy, renderLetter, type LetterKind, type MailFace, type MailPolicy } from "@/lib/mail-letter";

const POLICY_KEY = "mail_policy";
const DESK_KEY = "mail_desk";

export const authMail = {
  requireEmailVerification: false,
  resetPasswordTokenExpiresIn: 3600,
  sendOnSignUp: false,
  sendOnSignIn: false,
  expiresIn: 3600,
};

let freshUntil = 0;

async function readRows() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return {} as Record<string, string>;
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 1500, statement_timeout: 1500, query_timeout: 1500 });
  try {
    const result = await pool.query<{ key: string; value: string }>(
      "select key, value from room_settings where key = any($1::text[])",
      [[DESK_KEY, POLICY_KEY]],
    );
    return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function load() {
  const found = await readRows();
  return { policy: readMailPolicy(found[POLICY_KEY]), stored: readMailStored(found[DESK_KEY]) };
}

function sendingEnv(stored: ReturnType<typeof readMailStored>) {
  if (stored && mailerName(deskToEnv(stored)) === stored.provider) return deskToEnv(stored);
  return mailerName(process.env) ? process.env : null;
}

function apply(policy: MailPolicy, ready: boolean) {
  authMail.requireEmailVerification = ready && policy.verifyRequired;
  authMail.sendOnSignUp = ready && policy.verifyOn;
  authMail.sendOnSignIn = ready && policy.verifyOn;
  authMail.expiresIn = policy.ttlMin * 60;
  authMail.resetPasswordTokenExpiresIn = policy.ttlMin * 60;
}

/** Đọc công tắc thư. Lỗi hoặc quá 1,5 giây thì giữ đăng nhập như cũ, không bắt xác minh. */
export async function refreshAuthMail() {
  if (Date.now() < freshUntil) return;
  try {
    const { policy, stored } = await load();
    apply(policy, Boolean(sendingEnv(stored)));
  } catch {
    /* không chặn đăng nhập */
  }
  freshUntil = Date.now() + 5000;
}

async function deliver(kind: LetterKind, to: string, url?: string) {
  const { policy, stored } = await load();
  if (kind === "verify" && !policy.verifyOn) return;
  if (kind === "reset" && !policy.resetOn) return;
  if (kind === "changed" && !policy.changedOn) return;
  const env = sendingEnv(stored);
  if (!env) return;
  const bucket = `${kind}:${to.trim().toLowerCase()}`;
  if (!allowMailSend(bucket, policy.resendWait, policy.resendHour)) return;
  const letter = renderLetter(policy, kind, url);
  await sendMail({ to, subject: letter.subject, text: letter.text, html: letter.html }, env);
}

const pendingLetters: Promise<unknown>[] = [];

/** Gửi thư không chặn luồng đăng nhập, nhưng lưu lời hứa lại để route chờ xong rồi mới trả lời.
 *  Trên Vercel, hàm bị đóng băng ngay khi trả lời, thư chưa gửi xong sẽ không bao giờ đi. */
export function sendAuthLetter(kind: LetterKind, to: string, url?: string) {
  const job = deliver(kind, to, url).catch((error) => {
    console.error("[auth] gửi thư lỗi", error instanceof Error ? error.message : error);
  });
  pendingLetters.push(job);
}

/** Chờ các thư đang gửi, tối đa `limitMs`. Gọi trước khi trả lời yêu cầu đăng nhập. */
export async function flushAuthLetters(limitMs = 8000) {
  if (!pendingLetters.length) return;
  const jobs = pendingLetters.splice(0, pendingLetters.length);
  await Promise.race([Promise.allSettled(jobs), new Promise((resolve) => setTimeout(resolve, limitMs))]);
}

export const getMailFace = createServerFn({ method: "GET" }).handler(async (): Promise<MailFace> => {
  try {
    const { policy } = await load();
    return mailFace(policy);
  } catch {
    return mailFace(readMailPolicy(undefined));
  }
});

export const getMailPolicy = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MailPolicy> => {
    const { requireRole } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    try {
      const { policy } = await load();
      return policy;
    } catch {
      return readMailPolicy(undefined);
    }
  });

export const saveMailPolicy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => readMailPolicy(JSON.stringify(input ?? {})))
  .handler(async ({ context, data }) => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values (${POLICY_KEY}, ${value})
      on conflict (key) do update set value = ${value}
    `;
    await sql`
      insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
      values (${context.userId}, 'thu-chinh', null, ${`xac minh ${data.verifyOn ? "bat" : "tat"}, bat buoc ${data.verifyRequired ? "bat" : "tat"}, quen mat khau ${data.resetOn ? "bat" : "tat"}`}, ${place.email}, ${place.role ?? "chu"}, '')
    `;
    const { stored } = await load().catch(() => ({ stored: null }));
    apply(data, Boolean(sendingEnv(stored)));
    freshUntil = Date.now() + 5000;
    return data;
  });
