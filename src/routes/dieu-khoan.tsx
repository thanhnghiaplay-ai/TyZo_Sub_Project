import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { TermsDocument } from "@/components/terms-document";
import { VersionMark } from "@/components/version-mark";
import { TERMS_VERSION } from "@/lib/terms";

export const Route = createFileRoute("/dieu-khoan")({ component: TermsPage });

/** Đọc được bất cứ lúc nào, không cần đăng nhập và không qua cửa hỏi đồng ý. */
function TermsPage() {
  return (
    <main className="gate-screen gate-doc">
      <header className="gate-doc-head">
        <BrandMark title="TyZo Sub" />
        <div>
          <p className="gate-kicker">Phòng chiếu TyZo Sub</p>
          <h1 className="text-xl font-semibold">Điều khoản và Chính sách</h1>
          <p className="text-sm text-muted">Phiên bản {TERMS_VERSION}. Bạn đồng ý bản này bằng ô tích ở màn Đăng ký hoặc Đăng nhập.</p>
          <VersionMark align="start" />
        </div>
      </header>
      <TermsDocument />
      <footer className="gate-actions">
        <Link to="/" className="min-tap inline-flex items-center justify-center rounded-xl border border-line px-4 text-sm">
          Về phòng dịch
        </Link>
      </footer>
    </main>
  );
}
