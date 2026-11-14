import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getThemeAdmin, loadThemeToDraft, publishTheme, saveThemeDraft, type ThemeAdminView } from "@/lib/theme-room";
import {
  DENSITIES,
  FONTS,
  ICON_SLOTS,
  ICON_WEIGHTS,
  MODES,
  PALETTE_KEYS,
  THEME_DEFAULT,
  checkTheme,
  contrast,
  fontHref,
  fontOf,
  parseTheme,
  safeUrl,
  type IconWeight,
  type Palette,
  type PaletteKey,
  type Theme,
} from "@/lib/theme/theme";
import { Badge, Button, Card, CardHeader, Field, Segmented, inputClass } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { ICON_KEYS } from "@/components/ui/icon-registry";
import { ThemeProvider } from "@/components/ui/theme-context";
import { pushToast } from "@/components/toast";

function paletteStyle(palette: Palette, theme: Theme): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, variable] of PALETTE_KEYS) style[variable] = palette[key];
  style["--radius-card"] = `${theme.radius}rem`;
  style["--radius-ctl"] = `${Math.round(theme.radius * 0.75 * 100) / 100}rem`;
  const family = fontOf(theme.font).css;
  style.fontFamily = family ? `${family}, ui-sans-serif, system-ui, sans-serif` : "ui-sans-serif, system-ui, sans-serif";
  style.background = palette.bg;
  style.color = palette.fg;
  style.colorScheme = palette === theme.light ? "light" : "dark";
  return style as CSSProperties;
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-sm">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-11 cursor-pointer rounded-[var(--radius-ctl)] border border-line bg-raised p-1"
      />
      <span className="text-muted">{label}</span>
      <input
        aria-label={`${label} (mã màu)`}
        value={text}
        maxLength={7}
        spellCheck={false}
        className={inputClass + " font-mono text-xs"}
        onChange={(event) => {
          setText(event.target.value);
          const next = parseTheme({ dark: { bg: event.target.value } }).dark.bg;
          if (/^#[0-9a-f]{6}$/i.test(event.target.value.trim()) || /^#[0-9a-f]{3}$/i.test(event.target.value.trim())) onChange(next);
        }}
      />
    </div>
  );
}

function PaletteEditor({ mode, theme, onChange }: { mode: "light" | "dark"; theme: Theme; onChange: (key: PaletteKey, hex: string) => void }) {
  const palette = theme[mode];
  return (
    <div className="grid gap-2">
      {PALETTE_KEYS.map(([key, , label]) => (
        <ColorRow key={key} label={label} value={palette[key]} onChange={(hex) => onChange(key, hex)} />
      ))}
    </div>
  );
}

function Preview({ theme, mode }: { theme: Theme; mode: "light" | "dark" }) {
  const palette = theme[mode];
  const href = fontHref(theme.font);
  return (
    <ThemeProvider theme={theme}>
      {href && <link rel="stylesheet" href={href} />}
      <div style={paletteStyle(palette, theme)} className="grid gap-3 rounded-[var(--radius-card)] border border-line p-4">
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: palette.muted }}>
          Xem trước · {mode === "light" ? "Sáng" : "Tối"}
        </p>
        <Card>
          <CardHeader title={theme.brandName || "Dịch phụ đề"} hint="Thẻ mẫu với chữ phụ" icon="nav.source" />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon="act.start">
              Bắt đầu dịch
            </Button>
            <Button icon="act.upload">Tải lên</Button>
            <Button variant="ghost" icon="act.edit">
              Sửa
            </Button>
            <Button variant="danger" icon="act.delete">
              Xóa
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="ok">Thành công</Badge>
            <Badge tone="warn">Chờ</Badge>
            <Badge tone="error">Lỗi</Badge>
            <Badge tone="info">Thông tin</Badge>
            <Badge tone="accent">Nổi bật</Badge>
          </div>
          <Field label="Ô nhập mẫu" hint="Gợi ý nhỏ dưới ô nhập">
            <input className={inputClass} defaultValue="Nội dung mẫu" aria-label="Ô nhập mẫu" />
          </Field>
          <p className="text-sm" style={{ color: palette.danger }}>
            Câu cảnh báo mẫu
          </p>
        </Card>
        <div className="flex flex-wrap items-center gap-3" style={{ color: palette.fg }}>
          {ICON_SLOTS.slice(0, 12).map(([slot]) => (
            <Icon key={slot} slot={slot} size="1.5rem" />
          ))}
        </div>
      </div>
    </ThemeProvider>
  );
}

export function ThemeBoard() {
  const [view, setView] = useState<ThemeAdminView | null>(null);
  const [draft, setDraft] = useState<Theme>(THEME_DEFAULT);
  const [saved, setSaved] = useState<Theme>(THEME_DEFAULT);
  const [fault, setFault] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark");
  const [paletteMode, setPaletteMode] = useState<"light" | "dark">("dark");

  const load = async () => {
    try {
      const next = await getThemeAdmin();
      setView(next);
      setDraft(next.draft);
      setSaved(next.draft);
      setFault("");
    } catch (error) {
      setFault(error instanceof Error ? error.message : "Không tải được giao diện.");
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const issues = useMemo(() => checkTheme(draft), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const liveDiffers = view ? JSON.stringify(saved) !== JSON.stringify(view.live) : false;

  const patch = (next: Partial<Theme>) => setDraft((current) => parseTheme({ ...current, ...next }));
  const patchPalette = (mode: "light" | "dark", key: PaletteKey, hex: string) =>
    setDraft((current) => parseTheme({ ...current, [mode]: { ...current[mode], [key]: hex } }));
  const patchIcon = (slot: string, key: string) => setDraft((current) => parseTheme({ ...current, icons: { ...current.icons, [slot]: key } }));

  const run = async (job: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await job();
      pushToast(done);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Không làm được.", "bad");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () =>
    run(async () => {
      const out = await saveThemeDraft({ data: draft });
      setDraft(out.draft);
      setSaved(out.draft);
    }, "Đã lưu bản nháp. Khách chưa thấy thay đổi.");

  const publish = () =>
    run(async () => {
      if (dirty) {
        const out = await saveThemeDraft({ data: draft });
        setDraft(out.draft);
        setSaved(out.draft);
      }
      await publishTheme();
      await load();
    }, "Đã công bố. Khách thấy giao diện mới khi tải lại trang.");

  const reset = () =>
    run(async () => {
      const out = await loadThemeToDraft({ data: { from: "default" } });
      setDraft(out.draft);
      setSaved(out.draft);
    }, "Đã đưa bản nháp về mặc định. Bấm Công bố nếu muốn áp dụng.");

  const restore = (index: number) =>
    run(async () => {
      const out = await loadThemeToDraft({ data: { from: "history", index } });
      setDraft(out.draft);
      setSaved(out.draft);
    }, "Đã nạp bản cũ vào bản nháp. Bấm Công bố nếu muốn áp dụng.");

  if (fault) {
    return (
      <Card>
        <p role="alert" className="text-sm text-danger">
          {fault}
        </p>
        <Button onClick={() => void load()}>Thử lại</Button>
      </Card>
    );
  }
  if (!view) return <p className="p-4 text-sm text-muted">Đang tải giao diện…</p>;

  const logo = safeUrl(draft.logoUrl);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader
          title="Giao diện"
          icon="ui.theme"
          hint="Chỉnh bản nháp, xem trước, rồi Công bố. Khách chỉ thấy khi bạn bấm Công bố."
          action={dirty ? <Badge tone="warn">Chưa lưu</Badge> : liveDiffers ? <Badge tone="info">Nháp chưa công bố</Badge> : <Badge tone="ok">Đang dùng</Badge>}
        />
        {issues.length > 0 && (
          <div role="alert" className="grid gap-1 rounded-[var(--radius-ctl)] border border-error p-3 text-sm">
            <p className="font-semibold text-danger">Chưa công bố được: chữ khó đọc ở {issues.length} chỗ.</p>
            {issues.map((issue, index) => (
              <p key={index} className="text-muted">
                {issue.mode === "light" ? "Sáng" : "Tối"} · {issue.text}: độ tương phản {issue.ratio} (cần từ {issue.min})
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveDraft} busy={busy} disabled={!dirty}>
            Lưu nháp
          </Button>
          <Button variant="primary" onClick={publish} busy={busy} disabled={issues.length > 0 || (!dirty && !liveDiffers)}>
            Công bố cho khách
          </Button>
          <Button variant="ghost" onClick={reset} busy={busy}>
            Về mặc định
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title="Chung" icon="ui.settings" />
            <Field label="Chế độ khi khách mở trang">
              <Segmented
                label="Chế độ"
                value={draft.mode}
                onChange={(mode) => patch({ mode })}
                options={MODES.map(([id, label]) => ({ id, label }))}
              />
            </Field>
            <Field label="Phông chữ" hint="Chỉ gồm phông hỗ trợ tiếng Việt.">
              <select className={inputClass} value={draft.font} onChange={(event) => patch({ font: event.target.value as Theme["font"] })}>
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Cỡ chữ: ${Math.round(draft.fontScale * 100)}%`}>
              <input type="range" min={0.85} max={1.25} step={0.05} value={draft.fontScale} aria-label="Cỡ chữ" onChange={(event) => patch({ fontScale: Number(event.target.value) })} />
            </Field>
            <Field label={`Độ bo góc: ${draft.radius.toFixed(2)} rem`}>
              <input type="range" min={0} max={1.75} step={0.25} value={draft.radius} aria-label="Độ bo góc" onChange={(event) => patch({ radius: Number(event.target.value) })} />
            </Field>
            <Field label="Mật độ khoảng cách">
              <Segmented label="Mật độ" value={draft.density} onChange={(density) => patch({ density })} options={DENSITIES.map(([id, label]) => ({ id, label }))} />
            </Field>
          </Card>

          <Card>
            <CardHeader title="Thương hiệu" icon="nav.home" />
            <Field label="Tên hiển thị" hint="Để trống thì dùng “Dịch phụ đề”.">
              <input className={inputClass} maxLength={40} value={draft.brandName} onChange={(event) => patch({ brandName: event.target.value })} />
            </Field>
            <Field label="Logo (đường dẫn https:// hoặc bắt đầu bằng /)" error={draft.logoUrl && !logo ? "Đường dẫn không hợp lệ, sẽ bị bỏ qua." : undefined}>
              <input className={inputClass} value={draft.logoUrl} onChange={(event) => setDraft((current) => ({ ...current, logoUrl: event.target.value }))} onBlur={() => patch({ logoUrl: draft.logoUrl })} />
            </Field>
            {logo && <img src={logo} alt="Logo xem trước" className="h-12 w-auto max-w-full self-start rounded-[var(--radius-ctl)] border border-line bg-raised p-1" />}
          </Card>

          <Card>
            <CardHeader title="Màu sắc" icon="ui.theme" />
            <Segmented
              label="Bảng màu đang sửa"
              value={paletteMode}
              onChange={(mode) => {
                setPaletteMode(mode);
                setPreviewMode(mode);
              }}
              options={[
                { id: "dark", label: "Tối", icon: "ui.moon" },
                { id: "light", label: "Sáng", icon: "ui.sun" },
              ]}
            />
            <PaletteEditor mode={paletteMode} theme={draft} onChange={(key, hex) => patchPalette(paletteMode, key, hex)} />
            <p className="text-xs text-muted">
              Chữ chính / nền trang: <b>{contrast(draft[paletteMode].fg, draft[paletteMode].bg)}</b> · Chữ trên nút chính:{" "}
              <b>{contrast(draft[paletteMode].ink, draft[paletteMode].accent)}</b> (cần từ 4.5)
            </p>
          </Card>

          <Card>
            <CardHeader title="Icon" icon="ui.magic" hint="Chọn kiểu nét cho cả bộ, rồi đổi icon theo từng chức năng." />
            <Segmented
              label="Kiểu nét icon"
              value={draft.iconWeight}
              onChange={(iconWeight: IconWeight) => patch({ iconWeight })}
              options={ICON_WEIGHTS.map(([id, label]) => ({ id, label }))}
            />
            <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">Đổi icon từng chức năng</summary>
            <div className="mt-2 grid gap-2">
              {ICON_SLOTS.map(([slot, label, fallback]) => {
                const current = draft.icons[slot] || fallback;
                return (
                  <div key={slot} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,9rem)] items-center gap-2 text-sm">
                    <Icon slot={slot} size="1.4rem" />
                    <span className="truncate text-muted">{label}</span>
                    <select className={inputClass + " text-xs"} aria-label={`Icon cho ${label}`} value={current} onChange={(event) => patchIcon(slot, event.target.value)}>
                      {ICON_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            </details>
          </Card>
        </div>

        <div className="grid content-start gap-4 lg:sticky lg:top-2">
          <Segmented
            label="Xem trước ở chế độ"
            value={previewMode}
            onChange={setPreviewMode}
            options={[
              { id: "dark", label: "Tối", icon: "ui.moon" },
              { id: "light", label: "Sáng", icon: "ui.sun" },
            ]}
          />
          {logo && <img src={logo} alt="" className="h-8 w-auto self-start" />}
          <Preview theme={draft} mode={previewMode} />
          <Card>
            <CardHeader title="Bản đã công bố trước đây" hint="Mỗi lần công bố, bản cũ được giữ lại (tối đa 10)." />
            {view.history.length === 0 && <p className="text-sm text-muted">Chưa có.</p>}
            {view.history.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-muted">
                  {item.at ? new Date(item.at).toLocaleString("vi-VN") : "—"} · {item.by || "—"}
                </span>
                <Button size="sm" onClick={() => void restore(index)} busy={busy}>
                  Nạp vào nháp
                </Button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
