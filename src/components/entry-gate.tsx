import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { recordTermsConsent } from "@/lib/room-account";
import { TERMS_VERSION, hasAcceptedTerms, rememberTermsAccepted, termsGate } from "@/lib/terms";
import { TermsDocument } from "@/components/terms-document";
import { VersionMark } from "@/components/version-mark";
import { BrandMark } from "@/components/brand-mark";

/**
 * Cửa mở phòng. Điều khoản không còn chen giữa lúc vào app:
 * - Đã đồng ý bản đang chạy: vào thẳng.
 * - Chưa đồng ý và chưa có tài khoản: sang /login, nơi có ô tích «Tôi đồng ý Điều khoản và Chính sách».
 * - Đã có tài khoản mà điều khoản vừa đổi (TERMS_VERSION mới): chỉ người đó thấy màn hỏi lại.
 */
export function EntryGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "terms" | "declined" | "app">("splash");
  const [shown, setShown] = useState(false);
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
      if (/^[A-Z2-9]{8}$/.test(code)) localStorage.setItem("tyzo-ref", code);
    } catch {
      /* máy không cho lưu */
    }
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setShown(true), reduce ? 400 : 1700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shown || phase === "app" || phase === "declined") return;
    const next = termsGate({ accepted: hasAcceptedTerms(), pending: isPending, signedIn: Boolean(user) });
    if (next === "enter") setPhase("app");
    else if (next === "ask") setPhase("terms");
    else if (next === "login") void navigate({ to: "/login" });
  }, [shown, phase, isPending, user, navigate]);

  useEffect(() => {
    if (phase !== "app" || isPending || !user || user.isDevFallback) return;
    void recordTermsConsent({ data: TERMS_VERSION }).catch(() => {});
  }, [phase, isPending, user]);

  if (phase === "app") return children;
  if (phase === "declined") return <Declined onReview={() => setPhase("terms")} />;
  if (phase === "terms") return <Terms onAccept={() => acceptTerms(setPhase)} onDecline={() => setPhase("declined")} />;
  return <Splash />;
}

function acceptTerms(setPhase: (phase: "app") => void) {
  // Máy không cho lưu thì vẫn cho vào lần này. Lần sau sẽ hỏi lại.
  rememberTermsAccepted();
  setPhase("app");
}

function Splash() {
  return (
    <main className="gate-screen gate-splash" aria-live="polite">
      <BrandMark title="TyZo Sub" />
      <p className="gate-kicker">Phòng chiếu</p>
      <h1 className="gate-title">TyZo Sub</h1>
      <p className="gate-wait">Đang mở phòng dịch</p>
    </main>
  );
}

function Terms({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [read, setRead] = useState(false);

  return (
    <main className="gate-screen gate-doc">
      <header className="gate-doc-head">
        <BrandMark title="TyZo Sub" />
        <div>
          <p className="gate-kicker">Phòng chiếu TyZo Sub</p>
          <h1 className="text-xl font-semibold">Điều khoản và Chính sách</h1>
          <p className="text-sm text-muted">Phiên bản {TERMS_VERSION}. Đồng ý mới được dùng. Không đồng ý thì dừng ở đây.</p>
          <VersionMark align="start" />
        </div>
      </header>
      <TermsDocument />
      <footer className="gate-actions">
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1 size-4"
            type="checkbox"
            checked={read}
            onChange={(event) => setRead(event.target.checked)}
          />
          Tôi đã đọc điều khoản phiên bản {TERMS_VERSION} và muốn dùng phòng dịch.
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-tap rounded-xl bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" disabled={!read} onClick={onAccept}>
            Đồng ý và tiếp tục
          </button>
          <button type="button" className="min-tap rounded-xl border border-line px-4 text-sm" onClick={onDecline}>
            Không đồng ý
          </button>
        </div>
      </footer>
    </main>
  );
}

function Declined({ onReview }: { onReview: () => void }) {
  return (
    <main className="gate-screen gate-splash">
      <BrandMark title="TyZo Sub" />
      <h1 className="gate-title">Chưa vào phòng</h1>
      <p className="gate-wait">Bạn chưa đồng ý điều khoản nên không dùng được phòng dịch.</p>
      <button type="button" className="min-tap rounded-xl bg-accent px-4 text-sm font-semibold text-ink" onClick={onReview}>
        Xem lại điều khoản
      </button>
    </main>
  );
}
