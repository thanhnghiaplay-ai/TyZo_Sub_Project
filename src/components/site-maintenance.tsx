import { Link, useLocation } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/components/ui/theme-context";
import { useServiceStatus } from "@/components/use-service-status";
import type { SceneHandle } from "@/lib/maintenance-scene";
import { siteMaintenanceText, siteOpenPath, untilLabel, type ServiceEntry, type ServiceStatus } from "@/lib/service-status";

const WARN_DEFAULT = "Web sắp bảo trì.";
const BRAND_DEFAULT = "TyZo Sub";

/** Robot công nhân vác biển «BẢO TRÌ». Toạ độ khớp với `maintenance-scene.ts` (khung 260 × 440, mặt đất y = 440). */
function WorkerRobot({ text }: { text: string }) {
  return (
    <div className="mt-robot" data-mt="robot" aria-hidden="true">
      <svg viewBox="0 0 260 440" focusable="false">
        <defs>
          <linearGradient id="mt-steel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="color-mix(in srgb, var(--color-fg) 78%, white)" />
            <stop offset=".55" stopColor="var(--color-muted)" />
            <stop offset="1" stopColor="var(--color-line)" />
          </linearGradient>
          <linearGradient id="mt-steel-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="color-mix(in srgb, var(--color-fg) 85%, white)" />
            <stop offset="1" stopColor="var(--color-muted)" />
          </linearGradient>
          <linearGradient id="mt-vest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="color-mix(in srgb, var(--color-warning) 70%, white)" />
            <stop offset="1" stopColor="var(--color-warning)" />
          </linearGradient>
          <linearGradient id="mt-hat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="color-mix(in srgb, var(--color-accent) 55%, white)" />
            <stop offset="1" stopColor="var(--color-accent)" />
          </linearGradient>
          <linearGradient id="mt-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="color-mix(in srgb, var(--mt-board, var(--color-error)) 65%, white)" />
            <stop offset="1" stopColor="var(--mt-board, var(--color-error))" />
          </linearGradient>
          <clipPath id="mt-clip">
            <rect x="-200" y="-300" width="800" height="744" />
          </clipPath>
        </defs>

        <ellipse cx="130" cy="441" rx="58" ry="7" fill="black" opacity=".5" />

        <g data-mt="bob" className="mt-bob">
          {/* chân */}
          <g data-mt="legL" className="mt-legL">
            <rect x="102" y="392" width="20" height="36" rx="8" fill="url(#mt-steel-v)" />
            <rect x="93" y="422" width="36" height="17" rx="7" fill="var(--color-ink)" />
            <rect x="93" y="428" width="36" height="3" fill="var(--color-warning)" />
          </g>
          <g data-mt="legR" className="mt-legR">
            <rect x="138" y="392" width="20" height="36" rx="8" fill="url(#mt-steel-v)" />
            <rect x="131" y="422" width="36" height="17" rx="7" fill="var(--color-ink)" />
            <rect x="131" y="428" width="36" height="3" fill="var(--color-warning)" />
          </g>
          {/* tay trái */}
          <g data-mt="armL" className="mt-armL">
            <line x1="90" y1="318" x2="70" y2="372" stroke="var(--color-muted)" strokeWidth="16" strokeLinecap="round" />
            <line x1="86" y1="320" x2="67" y2="370" stroke="color-mix(in srgb, var(--color-fg) 70%, var(--color-muted))" strokeWidth="4" strokeLinecap="round" opacity=".6" />
            <circle cx="68" cy="378" r="11" fill="var(--color-ink)" />
            <rect x="60" y="371" width="16" height="3" rx="1.5" fill="var(--color-warning)" />
          </g>
          {/* thân */}
          <rect x="120" y="294" width="20" height="14" fill="var(--color-line)" />
          <rect x="88" y="304" width="84" height="96" rx="18" fill="url(#mt-steel)" />
          <path d="M88 324H172V380Q172 400 152 400H108Q88 400 88 380Z" fill="url(#mt-vest)" />
          <rect x="88" y="352" width="84" height="9" fill="color-mix(in srgb, var(--color-warning) 25%, white)" />
          <rect x="88" y="368" width="84" height="7" fill="color-mix(in srgb, var(--color-warning) 25%, white)" opacity=".85" />
          <circle cx="130" cy="337" r="11" fill="var(--color-info)" opacity=".22" />
          <circle cx="130" cy="337" r="6" fill="var(--color-info)" />
          <circle cx="88" cy="318" r="14" fill="var(--color-line)" />
          <circle cx="172" cy="318" r="14" fill="var(--color-line)" />
          <circle cx="88" cy="318" r="4" fill="color-mix(in srgb, var(--color-fg) 72%, white)" />
          <circle cx="172" cy="318" r="4" fill="color-mix(in srgb, var(--color-fg) 72%, white)" />
          {/* đầu */}
          <rect x="98" y="240" width="64" height="58" rx="18" fill="url(#mt-steel-v)" />
          <circle cx="96" cy="270" r="6" fill="var(--color-line)" />
          <circle cx="164" cy="270" r="6" fill="var(--color-line)" />
          <rect x="106" y="264" width="48" height="22" rx="11" fill="var(--color-bg)" />
          <ellipse className="mt-eye" cx="121" cy="275" rx="5" ry="5.5" fill="var(--color-info)" />
          <ellipse className="mt-eye" cx="139" cy="275" rx="5" ry="5.5" fill="var(--color-info)" />
          {/* mũ bảo hộ */}
          <path d="M90 252Q130 196 170 252Z" fill="url(#mt-hat)" />
          <rect x="84" y="248" width="92" height="9" rx="4.5" fill="var(--color-accent)" />
          <rect x="124" y="222" width="12" height="22" rx="4" fill="var(--color-accent)" opacity=".75" />
          <rect x="121" y="238" width="18" height="6" rx="3" fill="color-mix(in srgb, var(--color-accent) 40%, white)" />
          <rect x="129" y="207" width="2.4" height="17" fill="var(--color-muted)" />
          <circle className="mt-beacon" cx="130" cy="205" r="4.5" fill="var(--color-error)" />
        </g>

        {/* tay phải + biển: đi cùng nhịp nhún với thân lúc bước, đứng yên sau khi cắm */}
        <g data-mt="carry" className="mt-carry" clipPath="url(#mt-clip)">
          <g data-mt="sign" transform="translate(50 0)">
            <rect x="73" y="110" width="14" height="105" rx="3" fill="url(#mt-steel)" />
            <rect x="77" y="110" width="4" height="105" fill="color-mix(in srgb, var(--color-fg) 80%, white)" opacity=".6" />
            <g transform="translate(80 128) scale(1.3) translate(-80 -128)">
              <path d="M80 8 152 128H8Z" fill="url(#mt-red)" stroke="var(--color-warning)" strokeWidth="12" strokeLinejoin="round" />
              <path d="M80 24 138 120H22Z" fill="none" stroke="white" strokeOpacity=".35" strokeWidth="1.5" strokeLinejoin="round" />
              <g transform="translate(80 64)" fill="none" stroke="white">
                <g className="mt-gear">
                  <circle r="12" strokeWidth="5.5" strokeDasharray="5.6 4.4" />
                  <circle r="7.5" strokeWidth="3" />
                </g>
              </g>
              <text x="80" y="108" textAnchor="middle" fontSize={text.length > 7 ? 13 : 17} fontWeight="900" fill="white" letterSpacing=".5" style={{ fontFamily: "var(--font-sans), 'Segoe UI', Arial, sans-serif" }}>
                {text}
              </text>
            </g>
          </g>
          <path data-mt="armR" d="M170 318 192 262 130 195" fill="none" stroke="var(--color-muted)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
          <path data-mt="armRh" d="M170 318 192 262 130 195" fill="none" stroke="color-mix(in srgb, var(--color-fg) 70%, var(--color-muted))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
          <circle data-mt="elbow" cx="192" cy="262" r="9" fill="var(--color-line)" />
          <circle data-mt="handR" cx="130" cy="195" r="11" fill="var(--color-ink)" />
        </g>

        <ellipse data-mt="mound" cx="240" cy="441" rx="0" ry="0" fill="color-mix(in srgb, var(--color-warning) 30%, var(--color-ink))" />
      </svg>
    </div>
  );
}

/** Tiêu đề tách chữ để từng chữ rơi xuống. Nguyên câu nằm ở `aria-label` cho trình đọc màn hình. */
function TitleLetters({ text }: { text: string }) {
  let index = 0;
  const words = text.split(" ");
  return (
    <h1 className="mt-title" aria-label={text} data-mt="title">
      {words.map((word, wi) => (
        <Fragment key={`${wi}-${word}`}>
          <span className="mt-w" aria-hidden="true">
            {[...word].map((ch, ci) => (
              <span key={ci} className="mt-c" style={{ "--i": index++ } as CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}

/**
 * Trang khách thấy khi Chủ đặt «Toàn web» vào bảo trì. Lối vào quản trị luôn có để Chủ và nhân viên không bị khóa ngoài.
 * Có `onClose` thì là bản xem trước trong Admin: phủ lên trang, có nút Đóng và phím Esc thay cho lối vào quản trị.
 * Logo là `BrandMark` của web, tên cạnh logo lấy từ Admin → Giao diện. Tiêu đề và lời nhắn lấy từ Admin → Cấu hình → Toàn web.
 */
export function SiteMaintenancePage({ entry, onClose }: { entry: ServiceEntry; onClose?: () => void }) {
  const theme = useTheme();
  const brand = theme.brandName || BRAND_DEFAULT;
  const { title, note } = siteMaintenanceText(entry);
  const eta = entry.until && entry.until > Date.now() ? untilLabel(entry.until) : "";
  const rootRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const noteRef = useRef(note);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    noteRef.current = note;
    // Hoạt hình chỉ cần khi trang bảo trì thật sự hiện: tải mã lúc đó, khách bình thường không phải tải.
    // Trang (chữ, robot tĩnh) đã dựng sẵn từ máy chủ nên không nháy trong lúc chờ.
    let alive = true;
    let scene: SceneHandle | null = null;
    void import("@/lib/maintenance-scene").then(({ startMaintenanceScene }) => {
      if (!alive || !rootRef.current) return;
      scene = startMaintenanceScene(rootRef.current, () => noteRef.current);
      sceneRef.current = scene;
      scene.setMessage(noteRef.current);
    });
    return () => {
      alive = false;
      scene?.dispose();
      sceneRef.current = null;
    };
    // Chỉ chạy một lần: đổi chữ giữa chừng đi qua `setMessage`, không dựng lại cảnh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    noteRef.current = note;
    sceneRef.current?.setMessage(note);
  }, [note]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <main
      ref={rootRef}
      className={onClose ? "mt-root mt-preview" : "mt-root"}
      data-site-maintenance
      data-phase="init"
      data-mt-fx={theme.mtFx}
      data-mt-show={theme.mtShow}
      style={{ "--mt-board": `var(--color-${theme.mtBoard})` } as CSSProperties}
    >
      <div className="mt-scene" data-mt="stage">
        <div className="mt-hz mt-hz-t" aria-hidden="true"><i /></div>
        <div className="mt-hz mt-hz-b" aria-hidden="true"><i /></div>
        <div className="mt-bc mt-bc-l" aria-hidden="true" />
        <div className="mt-bc mt-bc-r" aria-hidden="true" />
        <div className="mt-floor" data-mt="floor" aria-hidden="true"><i /></div>
        <div className="mt-glow" data-mt="glow" aria-hidden="true" />

        <div className="mt-logo-wrap">
          <div className="mt-logo" data-mt="logo">
            <BrandMark title={brand} />
            <span className="mt-brand">{brand}</span>
          </div>
        </div>

        <div className="mt-ground" data-mt="ground" aria-hidden="true" />
        <WorkerRobot text={theme.mtText} />

        <section role="status" className="mt-info">
          <TitleLetters text={title} />
          <p className="mt-msg">
            <span className="mt-sr">{note}</span>
            <span className="mt-typed" data-mt="typed" aria-hidden="true" />
            <span className="mt-caret" data-mt="caret" aria-hidden="true" hidden />
          </p>
          {eta && (
            <p className="mt-eta" data-mt="eta">
              Dự kiến mở lại lúc <strong>{eta}</strong>
            </p>
          )}
          <div className="mt-bar" data-mt="bar" aria-hidden="true"><i /></div>
          <p className="mt-keep" data-mt="keep">Số dư và lịch sử của bạn được giữ nguyên.</p>
        </section>

        {onClose ? (
          <button type="button" className="mt-admin" onClick={onClose} autoFocus>
            Đóng xem trước (Esc)
          </button>
        ) : (
          <Link to="/admin" className="mt-admin">
            Dành cho quản trị viên
          </Link>
        )}
        <canvas className="mt-fx" data-mt="fx" aria-hidden="true" />
        <div className="mt-flash" data-mt="flash" aria-hidden="true" />
      </div>
    </main>
  );
}

/**
 * Bọc phần nội dung ở gốc. Cả web bảo trì thì mọi trang trừ Admin và Đăng nhập đổi thành trang bảo trì.
 * Lấy trạng thái từ máy chủ lúc dựng trang (không nháy), rồi hỏi lại mỗi phút để Chủ mở lại là khách vào được ngay.
 *
 * Lượt dịch chạy ngay trong trình duyệt khách, nên trang khách ĐÃ vào lúc web còn mở thì không bị gỡ giữa chừng
 * (gỡ là cắt lượt đang chạy). Lúc đó chỉ hiện dải báo; trang bảo trì thay vào khi khách tải lại hoặc sang trang khác.
 * Máy chủ vẫn là nơi chặn thật các lượt chạy mới; đây chỉ là mặt giao diện.
 */
export function SiteGate({ initial, children }: { initial: ServiceStatus; children: ReactNode }) {
  const { status } = useServiceStatus(initial);
  const pathname = useLocation({ select: (location) => location.pathname });
  const down = status.site.state === "maintenance";
  // Trang đã được vào lúc web còn mở (hoặc là Admin, Đăng nhập). Giữ nguyên cho tới khi khách rời trang.
  const [admitted, setAdmitted] = useState<string | null>(() => (initial.site.state === "maintenance" && !siteOpenPath(pathname) ? null : pathname));
  useEffect(() => {
    if (!down || siteOpenPath(pathname)) setAdmitted(pathname);
  }, [down, pathname]);

  if (!down || siteOpenPath(pathname)) return <>{children}</>;
  if (admitted !== pathname) return <SiteMaintenancePage entry={status.site} />;
  return (
    <>
      {children}
      <aside role="status" className="fixed inset-x-3 top-3 z-50 mx-auto grid max-w-md gap-0.5 rounded-[var(--radius-ctl)] border border-warning bg-card p-3 text-sm shadow-lg" data-site-warning>
        <p className="flex items-center gap-2 font-semibold text-warning">
          <Icon slot="ui.repair" className="size-4 shrink-0" />
          {status.site.note || WARN_DEFAULT}
        </p>
        <p className="text-xs text-muted">Lượt đang chạy vẫn chạy nốt. Đừng tải lại hay rời trang này khi chưa xong, vì các trang khác đã đóng đến khi mở lại.</p>
      </aside>
    </>
  );
}
