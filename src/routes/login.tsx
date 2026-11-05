import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyPlace } from "@/lib/admin-room";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { TERMS_VERSION } from "@/components/entry-gate";
import { clearSignedOut } from "@/lib/auth/signed-out";
import { COMMON_DOMAINS, mailProblem, withDomain } from "@/lib/mail-domains";

export const Route = createFileRoute("/login")({ component: LoginPage });

const BEARER_KEY = "grok-auth.bearer-token";

function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem("gterms") || "";
    } catch {
      saved = "";
    }
    if (saved !== TERMS_VERSION) void router.navigate({ to: "/" });
  }, [router]);
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!authEnabled) {
      setNotice("Đăng nhập đang tắt.");
      return;
    }
    setBusy(true);
    setNotice(null);
    const rejected = mailProblem(email);
    if (rejected) {
      setBusy(false);
      setNotice(rejected);
      return;
    }
    const result =
      mode === "up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setNotice(result.error.message || "Không vào được.");
      return;
    }
    const token = result.data && "token" in result.data ? result.data.token : null;
    if (token) {
      try {
        sessionStorage.setItem(BEARER_KEY, token);
      } catch {
        /* khung xem trước vẫn có cookie nếu trình duyệt cho phép */
      }
    }
    clearSignedOut();
    await authClient.getSession();
    const place = await getMyPlace().catch(() => null);
    if (place?.status === "banned") {
      await signOut("/yeu-cau");
      return;
    }
    await router.navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-accent">Tài khoản</p>
          <h1 className="text-base font-semibold">{mode === "up" ? "Đăng ký" : "Đăng nhập"}</h1>
        </div>
        <Link to="/" className="min-tap rounded-full border border-line px-3 text-sm text-muted">
          Về phòng dịch
        </Link>
      </header>
      <form className="space-y-3 overflow-y-auto px-4 py-4" onSubmit={(event) => void submit(event)}>
        <p className="text-sm text-muted">Email và mật khẩu của phòng này. Không dùng Google. Mật khẩu ít nhất 8 ký tự.</p>
        {mode === "up" && (
          <label className="block text-sm">
            Tên
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            />
          </label>
        )}
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="ten@gmail.com"
            className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
          />
          <span className="mt-2 flex flex-wrap gap-2">
            {COMMON_DOMAINS.filter((domain) => domain !== "me.com" && domain !== "live.com").map((domain) => (
              <button
                key={domain}
                type="button"
                className="rounded-full border border-line px-3 py-1 text-xs"
                onClick={() => setEmail((value) => withDomain(value, domain))}
              >
                @{domain}
              </button>
            ))}
          </span>
        </label>
        <label className="block text-sm">
          Mật khẩu
          <span className="relative mt-1 block">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-line bg-raised px-3 py-3 pr-16 outline-none"
            />
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </span>
        </label>
        <button type="submit" disabled={busy} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40">
          {busy ? "Đang xử lý…" : mode === "up" ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
        <button
          type="button"
          className="min-tap w-full rounded-full border border-line"
          onClick={() => {
            setMode(mode === "up" ? "in" : "up");
            setNotice(null);
          }}
        >
          {mode === "up" ? "Đã có tài khoản, đăng nhập" : "Chưa có tài khoản, đăng ký"}
        </button>
        {notice && <p className="text-sm text-danger">{notice}</p>}
      </form>
    </main>
  );
}
