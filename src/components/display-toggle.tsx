import { useEffect, useState } from "react";
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
 * Ba nút nhỏ ở đầu trang: sáng/tối, gọn/thoải mái và màu nhấn tự chọn.
 * Trạng thái nằm ở <html> (data-theme, data-density) do script đầu trang đặt, nên không nháy màu.
 * Lựa chọn của khách luôn thắng mặc định của Admin, nên cả hai nút luôn hiện.
 */
export function DisplayToggle() {
  const theme = useTheme();
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [density, setDensity] = useState<UserDensity>(defaultUserDensity(theme.density));
  const [fxOff, setFxOff] = useState(false);
  const [font, setFont] = useState<UserFont>("normal");

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

  const flipFont = () => {
    const order = USER_FONTS.map((f) => f[0]);
    const next = order[(order.indexOf(font) + 1) % order.length];
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
  const nextFont =
    USER_FONTS[(USER_FONTS.findIndex((f) => f[0] === font) + 1) % USER_FONTS.length][0];
  const fontLabel = `Cỡ chữ: ${fontName(font)}. Bấm để chuyển sang ${fontName(nextFont)}`;

  const modeLabel = mode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  const densityLabel =
    density === "compact" ? "Đang gọn. Chuyển sang thoải mái" : "Đang thoải mái. Chuyển sang gọn";

  const fxLabel = fxOff
    ? "Bật lại hiệu ứng Tương lai"
    : "Tắt hiệu ứng Tương lai (lưới, kính mờ, hào quang)";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="notice-bell-btn is-glyph"
        aria-label={modeLabel}
        title={modeLabel}
        onClick={flipMode}
      >
        {mode === "dark" ? <Icon slot="ui.sun" /> : <Icon slot="ui.moon" />}
      </button>
      <button
        type="button"
        className="notice-bell-btn is-glyph"
        aria-label={densityLabel}
        title={densityLabel}
        onClick={flipDensity}
      >
        {density === "compact" ? <Icon slot="ui.compact" /> : <Icon slot="ui.roomy" />}
      </button>
      <button
        type="button"
        className="notice-bell-btn is-glyph"
        aria-label={fontLabel}
        title={fontLabel}
        onClick={flipFont}
      >
        <span aria-hidden="true" className="text-sm font-bold leading-none">
          Aa
        </span>
      </button>
      {theme.look === "future" && (
        <button
          type="button"
          className="notice-bell-btn is-glyph"
          aria-label={fxLabel}
          aria-pressed={!fxOff}
          title={fxLabel}
          onClick={flipFx}
        >
          <Icon slot="ui.magic" />
        </button>
      )}
      <AccentPicker />
    </div>
  );
}
