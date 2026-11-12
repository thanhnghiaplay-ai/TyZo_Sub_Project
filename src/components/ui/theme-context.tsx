import { createContext, useContext, type ReactNode } from "react";
import { THEME_DEFAULT, type Theme } from "@/lib/theme/theme";

const ThemeContext = createContext<Theme>(THEME_DEFAULT);

/** Giao diện đang dùng. Icon, nhãn thương hiệu và các thành phần đọc từ đây. */
export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
