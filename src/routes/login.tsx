import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyPlace } from "@/lib/admin-room";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { TERMS_VERSION } from "@/components/entry-gate";
import { clearSignedOut } from "@/lib/auth/signed-out";
import { attachReferral } from "@/lib/affiliate-room";
import { mailProblem, mailSuggestions } from "@/lib/mail-domains";

export const Route = createFileRoute("/login")({ component: LoginPage });

const BEARER_KEY = "grok-auth.bearer-token";
const REMEMBER_EMAIL = "tyzo-remember-email";

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
    try {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL) || "";
      if (savedEmail) {
        setEmail(savedEmail);
        setRemember(true);
      }
    } catch {
      /* máy không cho lưu */
    }
  }, [router]);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
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
    if (mode === "up" && password !== again) {
      setBusy(false);
      setNotice("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    try {
      if (remember) localStorage.setItem(REMEMBER_EMAIL, email.trim());
      else localStorage.removeItem(REMEMBER_EMAIL);
    } catch {
      /* máy không cho lưu */
    }
    const result =
      mode === "up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      const unverified = result.error.code === "EMAIL_NOT_VERIFIED" || /not verified/i.test(result.error.message || "");
      setNotice(
        unverified
          ? "Email này chưa được xác minh. Hãy mở thư xác minh trong hộp thư (kể cả mục Spam) rồi đăng nhập lại."
          : result.error.message || "Không vào được.",
      );
      return;
    }
    const token = result.data && "token" in result.data ? result.data.token : null;
    if (mode === "up" && !token) {
      setNotice("Đã gửi thư xác minh tới email của bạn. Hãy bấm liên kết trong thư (kể cả mục Spam) rồi đăng nhập.");
      return;
    }
    if (token) {
      try {
        sessionStorage.setItem(BEARER_KEY, token);
      } catch {
        /* khung xem trước vẫn có cookie nếu trình duyệt cho phép */
      }
    }
    clearSignedOut();
    try {
      const code = localStorage.getItem("tyzo-ref") || "";
      if (code) await attachReferral({ data: code }).catch(() => {});
    } catch {
      /* máy không cho đọc */
    }
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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-accent">Tài khoản</p>
          <h1 className="text-base leading-none font-semibold">{mode === "up" ? "Đăng ký" : "Đăng nhập"}</h1>
        </div>
        <Link to="/" className="room-back">
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
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="Nhập tên trước @, rồi chọn gợi ý"
            className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
          />
          {mailSuggestions(email).length > 0 && !email.includes("@") && (
            <span className="mt-2 grid gap-1">
              {mailSuggestions(email).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-xl border border-line px-3 py-2 text-left text-sm"
                  onClick={() => setEmail(item)}
                >
                  {item}
                </button>
              ))}
            </span>
          )}
          {email.includes("@") && (
            <span className="mt-1 block text-xs text-muted">Đã chọn: {email}</span>
          )}
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => {
              const next = event.target.checked;
              setRemember(next);
              try {
                if (next) localStorage.setItem(REMEMBER_EMAIL, email.trim());
                else localStorage.removeItem(REMEMBER_EMAIL);
              } catch {
                /* máy không cho lưu */
              }
            }}
          />
          Ghi nhớ email trên máy này
        </label>
        {mode === "up" && (
          <>
            <PasswordMeter password={password} />
            <label className="block text-sm">
              Nhập lại mật khẩu
              <span className="relative mt-1 block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={again}
                  onChange={(event) => setAgain(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
                />
              </span>
            </label>
          </>
        )}
        <button type="submit" disabled={busy} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40">
          {busy ? "Đang xử lý…" : mode === "up" ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
        <button
          type="button"
          className="min-tap w-full rounded-full border border-line"
          onClick={() => {
            setMode(mode === "up" ? "in" : "up");
            setAgain("");
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

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

function PasswordMeter({ password }: { password: string }) {
  const score = password ? passwordScore(password) : 0;
  const label = ["", "Yếu", "Trung bình", "Khá", "Mạnh"][score] ?? "";
  return (
    <div className={"pw-meter" + (score ? " is-" + score : "")} aria-hidden={!password}>
      <span className="pw-bars">
        {[1, 2, 3, 4].map((step) => (
          <i key={step} className={score >= step ? "on" : ""} />
        ))}
      </span>
      <span className="pw-label">{password ? label : "Mật khẩu mạnh nên có chữ hoa, số và ký tự."}</span>
    </div>
  );
}
