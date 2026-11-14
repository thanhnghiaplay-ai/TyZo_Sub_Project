import { useEffect, useState } from "react";
import { Moon, Rows2, Rows3, Sun } from "lucide-react";
import { useTheme } from "@/components/ui/theme-context";
import { DENSITY_KEY, MODE_KEY, defaultUserDensity, densityValue, pickUserDensity, type UserDensity } from "@/lib/theme/theme";

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* trình duyệt không cho lưu: lựa chọn chỉ giữ đến khi tải lại trang */
  }
}

/**
 * Hai nút nhỏ ở đầu trang: sáng/tối và gọn/thoải mái.
 * Trạng thái nằm ở <html> (data-theme, data-density) do script đầu trang đặt, nên không nháy màu.
 * Lựa chọn của khách luôn thắng mặc định của Admin, nên cả hai nút luôn hiện.
 */
export function DisplayToggle() {
  const theme = useTheme();
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [density, setDensity] = useState<UserDensity>(defaultUserDensity(theme.density));

  useEffect(() => {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
    setMode(current);
    // Script đầu trang đã chọn sáng/tối nhưng không biết màu nền: đồng bộ thanh trình duyệt ngay từ lúc mở.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme[current].bg);
    setDensity(pickUserDensity(root.getAttribute("data-density"), theme.density));
  }, [theme]);

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

  const modeLabel = mode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  const densityLabel = density === "compact" ? "Đang gọn. Chuyển sang thoải mái" : "Đang thoải mái. Chuyển sang gọn";

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="notice-bell-btn" aria-label={modeLabel} title={modeLabel} onClick={flipMode}>
        {mode === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
      <button type="button" className="notice-bell-btn" aria-label={densityLabel} title={densityLabel} onClick={flipDensity}>
        {density === "compact" ? <Rows2 aria-hidden="true" /> : <Rows3 aria-hidden="true" />}
      </button>
    </div>
  );
}
