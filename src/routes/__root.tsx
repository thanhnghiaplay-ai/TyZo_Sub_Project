import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ToastHost } from "@/components/toast";
import { ConfirmHost } from "@/components/confirm-dialog";
import { UpdateBanner } from "@/components/update-banner";
import { StaleBuildGuard } from "@/components/stale-build-guard";
import { OfflineBanner } from "@/components/offline-banner";
import { IdleSignOut } from "@/components/idle-sign-out";
import { ThemeProvider } from "@/components/ui/theme-context";
import { getLiveTheme } from "@/lib/theme-room";
import { getServiceStatus } from "@/lib/service-status-room";
import { defaultServiceStatus } from "@/lib/service-status";
import { SiteGate } from "@/components/site-maintenance";
import { accentScript } from "@/lib/theme/accent";
import { THEME_DEFAULT, densityScript, fontHref, fontScript, fxScript, modeScript, parseTheme, themeToCss } from "@/lib/theme/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Dịch phụ đề";

export const Route = createRootRoute({
  // Giao diện admin đã công bố và trạng thái bảo trì. Mỗi cái lỗi thì dùng mặc định (Hoạt động), trang vẫn mở được.
  loader: async () => {
    const [theme, service] = await Promise.all([
      getLiveTheme().then(parseTheme).catch(() => THEME_DEFAULT),
      getServiceStatus().catch(() => defaultServiceStatus()),
    ]);
    return { theme, service };
  },
  head: ({ loaderData }) => {
    const theme = loaderData?.theme ?? THEME_DEFAULT;
    const font = fontHref(theme.font);
    const titleFont = fontHref(theme.titleFont);
    const fontLinks = [...new Set([font, titleFont].filter((href): href is string => !!href))];
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: theme.dark.bg },
      { title: theme.brandName || APP_NAME },
    ],
    styles: [{ children: themeToCss(theme) }],
    scripts: [{ children: modeScript(theme.mode) }, { children: densityScript(theme.density) }, { children: accentScript(theme.dark.bg, theme.light.bg) }, { children: fxScript() }, { children: fontScript() }],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ...(fontLinks.length
        ? [
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
            ...fontLinks.map((href) => ({ rel: "stylesheet", href })),
          ]
        : []),
    ],
    };
  },
  component: RootDocument,
});

function RootDocument() {
  const { theme, service } = Route.useLoaderData();
  return (
    <html lang="vi" data-theme={theme.mode === "light" ? "light" : "dark"} data-button={theme.button} data-look={theme.look === "future" ? "future" : undefined} data-menu={theme.menuSide} data-motion={theme.motion} data-motion-speed={theme.motionSpeed === "mid" ? undefined : theme.motionSpeed} data-title-weight={theme.titleWeight === "keep" ? undefined : theme.titleWeight} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <StaleBuildGuard />
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <OfflineBanner />
            <IdleSignOut />
            <SiteGate initial={service}>
              <Outlet />
            </SiteGate>
            <UpdateBanner />
            <ToastHost />
            <ConfirmHost />
          </AuthProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
