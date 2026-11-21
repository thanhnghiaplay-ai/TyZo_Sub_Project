import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AccentPicker } from "@/components/accent-picker";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/components/ui/theme-context";
import {
  DENSITY_KEY,
  FONT_KEY,
  FX_KEY,
  MODE_KEY,
  USER_FONTS,
  defaultUserDensity,
  densityValue,
  fontValue,
  pickUserDensity,
  pickUserFont,
  type UserDensity,
  type UserFont,
} from "@/lib/theme/theme";

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* trình duyệt không cho lưu: lựa chọn chỉ giữ đến khi tải lại trang */
  }
}

/**
 * Một nút «Hiển thị» ở đầu trang (đợt 1 sắp lại trang khách): bấm mở bảng gồm sáng/tối, gọn/thoải mái, cỡ chữ, hiệu ứng, màu nhấn.
 * Trước đây là năm nút tròn không chữ, tràn hàng trên điện thoại.
 * (Ghi chú cũ:) Ba nút nhỏ ở đầu trang: sáng/tối, gọn/thoải mái và màu nhấn tự chọn.
 * Trạng thái nằm ở <html> (data-theme, data-density) do script đầu trang đặt, nên không nháy màu.
 * Lựa chọn của khách luôn thắng mặc định của Admin, nên cả hai nút luôn hiện.
 */
export function DisplayToggle() {
  const theme = useTheme();
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [density, setDensity] = useState<UserDensity>(defaultUserDensity(theme.density));
  const [fxOff, setFxOff] = useState(false);
  const [font, setFont] = useState<UserFont>("normal");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Bấm ra ngoài hoặc Esc thì đóng bảng.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
    setMode(current);
    // Script đầu trang đã chọn sáng/tối nhưng không biết màu nền: đồng bộ thanh trình duyệt ngay từ lúc mở.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme[current].bg);
    setDensity(pickUserDensity(root.getAttribute("data-density"), theme.density));
    setFxOff(root.getAttribute("data-fx") === "off");
    const scale = Number(root.style.getPropertyValue("--user-font")) || 1;
    setFont(USER_FONTS.find((f) => f[2] === scale)?.[0] ?? pickUserFont(null));
  }, [theme]);

  const flipFx = () => {
    const root = document.documentElement;
    if (fxOff) {
      root.removeAttribute("data-fx");
      try {
        localStorage.removeItem(FX_KEY);
      } catch {
        /* kho bị chặn: chỉ giữ đến khi tải lại trang */
      }
    } else {
      root.setAttribute("data-fx", "off");
      remember(FX_KEY, "off");
    }
    setFxOff(!fxOff);
  };

  const flipMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme[next].bg);
    remember(MODE_KEY, next);
    setMode(next);
  };

  const flipDensity = () => {
    const next: UserDensity = density === "compact" ? "comfortable" : "compact";
    const root = document.documentElement;
    root.setAttribute("data-density", next);
    root.style.setProperty("--density", String(densityValue(next, theme.density)));
    remember(DENSITY_KEY, next);
    setDensity(next);
  };

  const pickFont = (next: UserFont) => {
    const root = document.documentElement;
    if (next === "normal") {
      root.style.removeProperty("--user-font");
      try {
        localStorage.removeItem(FONT_KEY);
      } catch {
        /* kho bị chặn: chỉ giữ đến khi tải lại trang */
      }
    } else {
      root.style.setProperty("--user-font", String(fontValue(next)));
      remember(FONT_KEY, next);
    }
    setFont(next);
  };

  const fontName = (id: UserFont) => USER_FONTS.find((f) => f[0] === id)?.[1] ?? "Vừa";
  const fontLabel = `Cỡ chữ đang dùng: ${fontName(font)}`;

  const densityLabel =
    density === "compact" ? "Đang gọn. Chuyển sang thoải mái" : "Đang thoải mái. Chuyển sang gọn";

  const fxLabel = fxOff
    ? "Bật lại hiệu ứng Tương lai"
    : "Tắt hiệu ứng Tương lai (lưới, kính mờ, hào quang)";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className="notice-bell-btn is-glyph"
        aria-label="Hiển thị: sáng tối, khoảng cách, cỡ chữ, hiệu ứng, màu"
        title="Hiển thị"
        aria-expanded={open}
        aria-controls={panelId}
        data-display-open
        onClick={() => setOpen((value) => !value)}
      >
        <Icon slot="ui.theme" />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Hiển thị"
          data-display-panel
          className="absolute right-0 top-full z-50 mt-2 grid max-h-[calc(100dvh-11rem)] w-[min(19rem,calc(100vw-2rem))] lg:max-h-[calc(100dvh-6rem)] gap-3 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm shadow-xl"
        >
          <Row label="Giao diện">
            <Seg on={mode === "light"} onClick={() => mode !== "light" && flipMode()} icon={<Icon slot="ui.sun" className="size-4" />}>Sáng</Seg>
            <Seg on={mode === "dark"} onClick={() => mode !== "dark" && flipMode()} icon={<Icon slot="ui.moon" className="size-4" />}>Tối</Seg>
          </Row>
          <Row label="Khoảng cách">
            <Seg on={density === "compact"} onClick={() => density !== "compact" && flipDensity()} label={densityLabel}>Gọn</Seg>
            <Seg on={density !== "compact"} onClick={() => density === "compact" && flipDensity()} label={densityLabel}>Thoải mái</Seg>
          </Row>
          <Row label="Cỡ chữ">
            {USER_FONTS.map(([id, name]) => (
              <Seg key={id} on={font === id} onClick={() => pickFont(id)} label={fontLabel}>{name}</Seg>
            ))}
          </Row>
          {theme.look === "future" && (
            <Row label="Hiệu ứng">
              <Seg on={!fxOff} onClick={() => fxOff && flipFx()} label={fxLabel}>Bật</Seg>
              <Seg on={fxOff} onClick={() => !fxOff && flipFx()} label={fxLabel}>Tắt</Seg>
            </Row>
          )}
          <div className="grid gap-1.5" role="group" aria-label="Màu nhấn">
            <span className="text-muted">Màu nhấn</span>
            <AccentPicker inline />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5" role="group" aria-label={label}>
      <span className="text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Seg({ on, onClick, children, icon, label }: { on: boolean; onClick: () => void; children: ReactNode; icon?: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={label}
      className={"min-tap inline-flex items-center gap-1.5 rounded-full border px-3 text-sm font-medium " + (on ? "border-accent bg-accent text-ink" : "border-line hover:border-accent")}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}
