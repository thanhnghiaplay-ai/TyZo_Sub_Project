import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ToastHost } from "@/components/toast";
import { UpdateBanner } from "@/components/update-banner";
import { IdleSignOut } from "@/components/idle-sign-out";
import { ThemeProvider } from "@/components/ui/theme-context";
import { getLiveTheme } from "@/lib/theme-room";
import { THEME_DEFAULT, fontHref, modeScript, parseTheme, themeToCss } from "@/lib/theme/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Dịch phụ đề";

export const Route = createRootRoute({
  // Giao diện admin đã công bố. Lỗi thì dùng mặc định, trang vẫn mở được.
  loader: async () => {
    try {
      return { theme: parseTheme(await getLiveTheme()) };
    } catch {
      return { theme: THEME_DEFAULT };
    }
  },
  head: ({ loaderData }) => {
    const theme = loaderData?.theme ?? THEME_DEFAULT;
    const font = fontHref(theme.font);
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: theme.dark.bg },
      { title: theme.brandName || APP_NAME },
    ],
    styles: [{ children: themeToCss(theme) }],
    scripts: [{ children: modeScript(theme.mode) }],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ...(font
        ? [
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
            { rel: "stylesheet", href: font },
          ]
        : []),
    ],
    };
  },
  component: RootDocument,
});

function RootDocument() {
  const { theme } = Route.useLoaderData();
  return (
    <html lang="vi" data-theme={theme.mode === "light" ? "light" : "dark"} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <IdleSignOut />
            <Outlet />
            <UpdateBanner />
            <ToastHost />
          </AuthProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
