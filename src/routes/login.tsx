import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useOnline } from "@/lib/use-online";
import { OFFLINE_TEXT } from "@/components/offline-banner";
import { getMyPlace } from "@/lib/admin-room";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { TermsLink } from "@/components/terms-link";
import { hasAcceptedTerms, rememberTermsAccepted } from "@/lib/terms";
import { clearSignedOut } from "@/lib/auth/signed-out";
import { attachReferral } from "@/lib/affiliate-room";
import { mailProblem, mailSuggestions } from "@/lib/mail-domains";
import { getMailFace } from "@/lib/mail-runtime";
import { MAIL_POLICY, type MailFace } from "@/lib/mail-letter";

export const Route = createFileRoute("/login")({ component: LoginPage });

const BEARER_KEY = "grok-auth.bearer-token";
const REMEMBER_EMAIL = "tyzo-remember-email";
const LOGIN_BAD = "Email hoặc mật khẩu chưa đúng. Kiểm tra lại hoặc bấm “Quên mật khẩu”.";
const TERMS_NEEDED = "Hãy tích ô đồng ý Điều khoản và Chính sách để tiếp tục.";

function isBadLogin(error: { code?: string; message?: string; status?: number }) {
  const code = error.code || "";
  return (
    code === "INVALID_EMAIL_OR_PASSWORD" ||
    code === "INVALID_PASSWORD" ||
    code === "INVALID_EMAIL" ||
    code === "USER_NOT_FOUND" ||
    /invalid (email|password)|incorrect|wrong password/i.test(error.message || "")
  );
}

function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    // Máy đã đồng ý đúng bản đang chạy thì ô tích hiện sẵn dấu. Chưa thì khách tự tích.
    setAgreed(hasAcceptedTerms());
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
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">("in");
  const [face, setFace] = useState<MailFace>(MAIL_POLICY);
  const [resetToken, setResetToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [refCode, setRefCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const online = useOnline();
  useEffect(() => {
    try {
      const savedRef = localStorage.getItem("tyzo-ref") || "";
      if (savedRef) setRefCode(savedRef);
    } catch {
      /* máy không cho lưu */
    }
  }, []);

  useEffect(() => {
    void getMailFace().then(setFace).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
    if (params.get("error")) setNotice(MAIL_POLICY.resetBad);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!navigator.onLine) {
      setNotice(OFFLINE_TEXT);
      return;
    }
    if (!agreed) {
      setNotice(TERMS_NEEDED);
      return;
    }
    // Tích rồi bấm gửi là đồng ý. Lưu ngay để vào phòng không bị hỏi lại.
    rememberTermsAccepted();
    if (!authEnabled) {
      setNotice("Đăng nhập đang tắt.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
    const rejected = mailProblem(email);
    if (rejected) {
      setNotice(mode === "in" && rejected === "Email không đúng." ? LOGIN_BAD : rejected);
      return;
    }
    if (mode === "up" && password !== again) {
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
    if (result.error) {
      const unverified = result.error.code === "EMAIL_NOT_VERIFIED" || /not verified/i.test(result.error.message || "");
      const bad = mode === "in" && !unverified && isBadLogin(result.error);
      setNotice(unverified ? face.unverified : bad ? LOGIN_BAD : result.error.message || "Không vào được.");
      return;
    }
    const token = result.data && "token" in result.data ? result.data.token : null;
    if (mode === "up" && !token) {
      setNotice(face.sent);
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
      const typed = mode === "up" ? refCode.trim().toUpperCase() : "";
      if (typed) localStorage.setItem("tyzo-ref", typed);
      const code = typed || localStorage.getItem("tyzo-ref") || "";
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không vào được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="room-frame mx-auto flex h-dvh flex-col bg-bg text-fg">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-accent">Tài khoản</p>
          <h1 className="text-base leading-none font-semibold">{mode === "up" ? "Đăng ký" : mode === "forgot" ? "Quên mật khẩu" : mode === "reset" ? "Đặt lại mật khẩu" : "Đăng nhập"}</h1>
        </div>
        <Link to="/" className="room-back">
          Về phòng dịch
        </Link>
      </header>
      {mode === "forgot" || mode === "reset" ? (
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          {mode === "forgot" ? (
            <ForgotBox email={email} setEmail={setEmail} busy={busy} sent={face.resetSent} onBusy={setBusy} onBack={() => { setMode("in"); setNotice(null); }} />
          ) : (
            <ResetBox token={resetToken} busy={busy} done={face.resetDone} bad={face.resetBad} onBusy={setBusy} onDone={(text) => { setNotice(text); setMode("in"); setResetToken(""); }} />
          )}
        </div>
      ) : (
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
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="ten@gmail.com (dán cả địa chỉ cũng được)"
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
        </label>
        {mode === "up" && (
          <label className="block text-sm">
            Mã giới thiệu, nếu có
            <input
              value={refCode}
              onChange={(event) => setRefCode(event.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              placeholder="Bỏ trống nếu không có"
              className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            />
          </label>
        )}
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
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={agreed}
            onChange={(event) => {
              setAgreed(event.target.checked);
              if (event.target.checked && notice === TERMS_NEEDED) setNotice(null);
            }}
          />
          <span>
            Tôi đồng ý <TermsLink newTab className="text-accent underline" />
          </span>
        </label>
        <button
          type="submit"
          disabled={busy || !online}
          aria-busy={busy}
          className="min-tap flex w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          {busy && <span className="btn-spinner" aria-hidden="true" />}
          {busy ? (mode === "up" ? "Đang tạo tài khoản… Đừng tắt trang" : "Đang đăng nhập… Đừng tắt trang") : mode === "up" ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="min-tap w-full rounded-full border border-line disabled:pointer-events-none disabled:opacity-40"
          onClick={() => {
            setMode(mode === "up" ? "in" : "up");
            setAgain("");
            setNotice(null);
          }}
        >
          {mode === "up" ? "Đã có tài khoản, đăng nhập" : "Chưa có tài khoản, đăng ký"}
        </button>
        {notice && <p className="text-sm text-danger">{notice}</p>}
        {face.verifyOn && notice === face.unverified && (
          <button
            type="button"
            disabled={busy || !online}
            className="min-tap w-full rounded-full border border-line disabled:pointer-events-none disabled:opacity-40"
            onClick={() => {
              void authClient.sendVerificationEmail({ email: email.trim(), callbackURL: "/" }).then((result) => {
                setNotice(result.error ? result.error.message || "Chưa gửi lại được." : face.sent);
              });
            }}
          >
            Gửi lại thư xác minh
          </button>
        )}
        {mode === "in" && face.resetOn && (
          <button type="button" disabled={busy || !online} className="min-tap w-full rounded-full border border-line disabled:pointer-events-none disabled:opacity-40" onClick={() => { setMode("forgot"); setNotice(null); }}>
            Quên mật khẩu
          </button>
        )}
      </form>
      )}
    </main>
  );
}

function ForgotBox({
  email,
  setEmail,
  busy,
  sent,
  onBusy,
  onBack,
}: {
  email: string;
  setEmail: (value: string) => void;
  busy: boolean;
  sent: string;
  onBusy: (value: boolean) => void;
  onBack: () => void;
}) {
  const [asked, setAsked] = useState(false);
  const online = useOnline();
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onBusy(true);
        void authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}/login` }).finally(() => {
          onBusy(false);
          setAsked(true);
        });
      }}
    >
      <p className="text-sm text-muted">Nhập email đã đăng ký. Phòng không cho biết email đó có tài khoản hay không.</p>
      <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <button type="submit" disabled={busy || !online} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40">{busy ? "Đang gửi…" : "Gửi thư đặt lại"}</button>
      <button type="button" className="min-tap w-full rounded-full border border-line" onClick={onBack}>Về đăng nhập</button>
      {asked && <p className="text-sm text-muted">{sent}</p>}
    </form>
  );
}

function ResetBox({
  token,
  busy,
  done,
  bad,
  onBusy,
  onDone,
}: {
  token: string;
  busy: boolean;
  done: string;
  bad: string;
  onBusy: (value: boolean) => void;
  onDone: (text: string) => void;
}) {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const online = useOnline();
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!token || next !== again) return;
        onBusy(true);
        void authClient.resetPassword({ newPassword: next, token }).then((result) => {
          onBusy(false);
          onDone(result.error ? bad : done);
        }).catch(() => {
          onBusy(false);
          onDone(bad);
        });
      }}
    >
      <p className="text-sm text-muted">Chọn mật khẩu mới, ít nhất 8 ký tự.</p>
      <PasswordMeter password={next} />
      <input value={next} onChange={(event) => setNext(event.target.value)} type="password" required minLength={8} className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <input value={again} onChange={(event) => setAgain(event.target.value)} type="password" required minLength={8} placeholder="Nhập lại" className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      {next && again && next !== again && <p className="text-sm text-danger">Mật khẩu nhập lại chưa khớp.</p>}
      {!token && <p className="text-sm text-danger">{bad}</p>}
      <button type="submit" disabled={busy || !online || !token || next !== again} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40">{busy ? "Đang lưu…" : "Lưu mật khẩu mới"}</button>
    </form>
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
