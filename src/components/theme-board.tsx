import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getThemeAdmin, loadThemeToDraft, publishTheme, saveThemeDraft, type ThemeAdminView } from "@/lib/theme-room";
import {
  BUTTON_STYLES,
  DENSITIES,
  FONTS,
  ICON_SLOTS,
  ICON_GROUPS,
  ICON_TONES,
  ICON_SIZES,
  ICON_WEIGHTS,
  MENU_SIDES,
  MOTION,
  MOTION_SPEEDS,
  MT_BOARDS,
  MT_FX,
  MT_SHOWS,
  MODES,
  PALETTE_KEYS,
  PALETTES,
  THEME_DEFAULT,
  checkTheme,
  contrast,
  fontFamily,
  fontHref,
  parseTheme,
  safeUrl,
  shadowStyle,
  themeToCss,
  TITLE_WEIGHTS,
  type MenuSide,
  type Motion,
  type MotionSpeed,
  type MtBoard,
  type MtFx,
  type MtShow,
  type ButtonStyle,
  type TitleWeight,
  type IconWeight,
  type IconGroupWeight,
  type IconSize,
  type IconTone,
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
  Object.assign(style, shadowStyle(theme.shadow));
  style["--shadow-amt"] = String(theme.shadow);
  style["--line-w"] = `${theme.line}px`;
  style["--font-title"] = fontFamily(theme.titleFont);
  style["--leading"] = String(theme.leading);
  style.lineHeight = String(theme.leading);
  style.fontFamily = fontFamily(theme.font);
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
  const titleHref = theme.titleFont === theme.font ? null : fontHref(theme.titleFont);
  return (
    <ThemeProvider theme={theme}>
      {href && <link rel="stylesheet" href={href} />}
      {titleHref && <link rel="stylesheet" href={titleHref} />}
      <div
        data-button={theme.button}
        data-title-weight={theme.titleWeight === "keep" ? undefined : theme.titleWeight}
        style={paletteStyle(palette, theme)}
        className="grid gap-3 rounded-[var(--radius-card)] border border-line p-4 shadow-lg"
      >
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
          <p className="text-sm">Câu nội dung mẫu để xem giãn dòng.</p>
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
  const [tab, setTab] = useState<"mau" | "chu" | "khoi" | "icon" | "chuyen" | "trang">("mau");
  const [iconQuery, setIconQuery] = useState("");
  const [glyphQuery, setGlyphQuery] = useState("");
  const [iconPick, setIconPick] = useState("");
  const draftRef = useRef(draft);
  const undoRef = useRef<Theme[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const liveOrigin = useRef<Record<string, string | null> | null>(null);
  draftRef.current = draft;

  const commit = (next: Theme) => {
    if (JSON.stringify(next) === JSON.stringify(draftRef.current)) return;
    undoRef.current = [...undoRef.current, draftRef.current].slice(-30);
    draftRef.current = next;
    setUndoCount(undoRef.current.length);
    setDraft(next);
  };
  const undo = () => {
    const prev = undoRef.current.pop();
    setUndoCount(undoRef.current.length);
    if (!prev) return;
    draftRef.current = prev;
    setDraft(prev);
  };

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

  const patch = (next: Partial<Theme>) => commit(parseTheme({ ...draftRef.current, ...next }));
  const patchPalette = (mode: "light" | "dark", key: PaletteKey, hex: string) =>
    commit(parseTheme({ ...draftRef.current, [mode]: { ...draftRef.current[mode], [key]: hex } }));
  const patchIcon = (slot: string, key: string) => commit(parseTheme({ ...draftRef.current, icons: { ...draftRef.current.icons, [slot]: key } }));

  useEffect(() => {
    if (!view) return;
    const html = document.documentElement;
    if (!liveOrigin.current) {
      liveOrigin.current = {
        button: html.getAttribute("data-button"),
        menu: html.getAttribute("data-menu"),
        motion: html.getAttribute("data-motion"),
        speed: html.getAttribute("data-motion-speed"),
        title: html.getAttribute("data-title-weight"),
      };
    }
    let node = document.head.querySelector<HTMLStyleElement>("style[data-theme-live]");
    if (!node) {
      node = document.createElement("style");
      node.setAttribute("data-theme-live", "1");
      document.head.appendChild(node);
    }
    node.textContent = themeToCss(draft);
    html.setAttribute("data-button", draft.button);
    html.setAttribute("data-menu", draft.menuSide);
    html.setAttribute("data-motion", draft.motion);
    if (draft.motionSpeed === "mid") html.removeAttribute("data-motion-speed");
    else html.setAttribute("data-motion-speed", draft.motionSpeed);
    if (draft.titleWeight === "keep") html.removeAttribute("data-title-weight");
    else html.setAttribute("data-title-weight", draft.titleWeight);
  }, [view, draft]);

  useEffect(() => {
    return () => {
      document.querySelector("style[data-theme-live]")?.remove();
      const html = document.documentElement;
      const origin = liveOrigin.current;
      if (!origin) return;
      const put = (name: string, value: string | null) => (value === null ? html.removeAttribute(name) : html.setAttribute(name, value));
      put("data-button", origin.button);
      put("data-menu", origin.menu);
      put("data-motion", origin.motion);
      put("data-motion-speed", origin.speed);
      put("data-title-weight", origin.title);
    };
  }, []);

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
  const iconNeedle = iconQuery.trim().toLowerCase();
  const shownSlots = ICON_SLOTS.filter(([slot, label, fallback]) => {
    if (!iconNeedle) return true;
    const current = (draft.icons[slot] || fallback).toLowerCase();
    return label.toLowerCase().includes(iconNeedle) || current.includes(iconNeedle);
  });
  const glyphNeedle = glyphQuery.trim().toLowerCase();
  const glyphs = ICON_KEYS.filter((key) => !glyphNeedle || key.toLowerCase().includes(glyphNeedle));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader
          title="Giao diện"
          icon="ui.theme"
          hint="Chỉnh là trang này đổi ngay. Khách chỉ thấy khi bạn bấm Công bố."
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
          <Button variant="ghost" onClick={undo} disabled={undoCount === 0 || busy}>
            Hoàn tác
          </Button>
          <Button variant="ghost" onClick={reset} busy={busy}>
            Về mặc định
          </Button>
        </div>
      </Card>

      <div role="tablist" aria-label="Phần giao diện" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(
          [
            ["mau", "Màu"],
            ["chu", "Chữ"],
            ["khoi", "Hình khối"],
            ["icon", "Biểu tượng"],
            ["chuyen", "Chuyển động"],
            ["trang", "Trang riêng"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={"min-tap rounded-[var(--radius-ctl)] border px-3 text-sm font-semibold " + (tab === id ? "border-transparent bg-accent text-ink" : "border-line")}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card className={tab === "chu" ? undefined : "hidden"}>
            <CardHeader title="Chữ" icon="ui.settings" />
            <Field label="Phông nội dung" hint="Chỉ gồm phông hỗ trợ tiếng Việt.">
              <select className={inputClass} value={draft.font} onChange={(event) => patch({ font: event.target.value as Theme["font"] })}>
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phông tiêu đề" hint="Áp cho tiêu đề. Mặc định trùng phông nội dung.">
              <select className={inputClass} value={draft.titleFont} onChange={(event) => patch({ titleFont: event.target.value as Theme["titleFont"] })}>
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Độ đậm tiêu đề">
              <Segmented label="Độ đậm tiêu đề" value={draft.titleWeight} onChange={(titleWeight: TitleWeight) => patch({ titleWeight })} options={TITLE_WEIGHTS.map(([id, label]) => ({ id, label }))} />
            </Field>
            <Field label={`Giãn dòng: ${draft.leading.toFixed(1)}`}>
              <input type="range" min={1.3} max={1.8} step={0.1} value={draft.leading} aria-label="Giãn dòng" onChange={(event) => patch({ leading: Number(event.target.value) })} />
            </Field>
            <Field label={`Cỡ chữ: ${Math.round(draft.fontScale * 100)}%`}>
              <input type="range" min={0.85} max={1.25} step={0.05} value={draft.fontScale} aria-label="Cỡ chữ" onChange={(event) => patch({ fontScale: Number(event.target.value) })} />
            </Field>
          </Card>

          <Card className={tab === "khoi" ? undefined : "hidden"}>
            <CardHeader title="Hình khối" icon="ui.settings" />
            <Field label={`Độ bo góc: ${draft.radius.toFixed(2)} rem`}>
              <input type="range" min={0} max={1.75} step={0.25} value={draft.radius} aria-label="Độ bo góc" onChange={(event) => patch({ radius: Number(event.target.value) })} />
            </Field>
            <Field label={`Độ đậm bóng: ${draft.shadow.toFixed(2)}`}>
              <input type="range" min={0} max={1.5} step={0.25} value={draft.shadow} aria-label="Độ đậm bóng" onChange={(event) => patch({ shadow: Number(event.target.value) })} />
            </Field>
            <Field label={`Độ dày viền: ${draft.line} px`}>
              <input type="range" min={1} max={3} step={1} value={draft.line} aria-label="Độ dày viền" onChange={(event) => patch({ line: Number(event.target.value) })} />
            </Field>
            <Field label="Kiểu nút">
              <Segmented label="Kiểu nút" value={draft.button} onChange={(button: ButtonStyle) => patch({ button })} options={BUTTON_STYLES.map(([id, label]) => ({ id, label }))} />
            </Field>
            <Field label="Mật độ khoảng cách">
              <Segmented label="Mật độ" value={draft.density} onChange={(density) => patch({ density })} options={DENSITIES.map(([id, label]) => ({ id, label }))} />
            </Field>
            <Field label={`Độ rộng trang: ${draft.pageWidth} rem`} hint="Các trang rộng. Phòng dịch vẫn đầy màn hình.">
              <input type="range" min={40} max={120} step={10} value={draft.pageWidth} aria-label="Độ rộng trang" onChange={(event) => patch({ pageWidth: Number(event.target.value) })} />
            </Field>
            <Field label="Vị trí menu">
              <Segmented label="Vị trí menu" value={draft.menuSide} onChange={(menuSide: MenuSide) => patch({ menuSide })} options={MENU_SIDES.map(([id, label]) => ({ id, label }))} />
            </Field>
          </Card>

          <Card className={tab === "chuyen" ? undefined : "hidden"}>
            <CardHeader title="Chuyển động" icon="ui.settings" />
            <Field label="Hiệu ứng" hint="Máy khách đang giảm chuyển động thì luôn tắt, dù chọn Bật.">
              <Segmented label="Hiệu ứng" value={draft.motion} onChange={(motion: Motion) => patch({ motion })} options={MOTION.map(([id, label]) => ({ id, label }))} />
            </Field>
            <Field label="Tốc độ hiệu ứng">
              <Segmented label="Tốc độ hiệu ứng" value={draft.motionSpeed} onChange={(motionSpeed: MotionSpeed) => patch({ motionSpeed })} options={MOTION_SPEEDS.map(([id, label]) => ({ id, label }))} />
            </Field>
          </Card>

          <Card className={tab === "trang" ? undefined : "hidden"}>
            <CardHeader title="Trang bảo trì" icon="ui.repair" hint="Chữ, màu biển, hiệu ứng mạnh, và robot hay chỉ biển. Mặc định giữ cảnh đang có." />
            <Field label="Chữ trên biển" hint="Tối đa 10 ký tự. Để trống thì lại «BẢO TRÌ».">
              <input
                className={inputClass}
                maxLength={10}
                value={draft.mtText}
                aria-label="Chữ trên biển"
                onChange={(event) => commit({ ...draftRef.current, mtText: event.target.value.slice(0, 10) })}
                onBlur={(event) => patch({ mtText: event.target.value })}
              />
            </Field>
            <Field label="Màu biển">
              <Segmented label="Màu biển" value={draft.mtBoard} onChange={(mtBoard: MtBoard) => patch({ mtBoard })} options={MT_BOARDS.map(([id, label]) => ({ id, label }))} />
            </Field>
            <Field label="Hiệu ứng mạnh">
              <Segmented label="Hiệu ứng mạnh" value={draft.mtFx} onChange={(mtFx: MtFx) => patch({ mtFx })} options={MT_FX.map(([id, label]) => ({ id, label }))} />
            </Field>
            <Field label="Hình trang bảo trì">
              <Segmented label="Hình trang bảo trì" value={draft.mtShow} onChange={(mtShow: MtShow) => patch({ mtShow })} options={MT_SHOWS.map(([id, label]) => ({ id, label }))} />
            </Field>
          </Card>

          <Card className={tab === "trang" ? undefined : "hidden"}>
            <CardHeader title="Thương hiệu" icon="nav.home" />
            <Field label="Tên hiển thị" hint="Để trống thì dùng “Dịch phụ đề”.">
              <input className={inputClass} maxLength={40} value={draft.brandName} onChange={(event) => patch({ brandName: event.target.value })} />
            </Field>
            <Field label="Logo (đường dẫn https:// hoặc bắt đầu bằng /)" error={draft.logoUrl && !logo ? "Đường dẫn không hợp lệ, sẽ bị bỏ qua." : undefined}>
              <input className={inputClass} value={draft.logoUrl} onChange={(event) => commit({ ...draftRef.current, logoUrl: event.target.value })} onBlur={() => patch({ logoUrl: draft.logoUrl })} />
            </Field>
            {logo && <img src={logo} alt="Logo xem trước" className="h-12 w-auto max-w-full self-start rounded-[var(--radius-ctl)] border border-line bg-raised p-1" />}
          </Card>

          <Card className={tab === "mau" ? undefined : "hidden"}>
            <CardHeader title="Màu sắc" icon="ui.theme" />
            <Field label="Chế độ khi khách mở trang">
              <Segmented
                label="Chế độ"
                value={draft.mode}
                onChange={(mode) => patch({ mode })}
                options={MODES.map(([id, label]) => ({ id, label }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PALETTES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="min-tap inline-flex items-center justify-center gap-2 rounded-[var(--radius-ctl)] border border-line px-2 text-sm"
                  onClick={() => patch({ light: item.light, dark: item.dark })}
                >
                  <span className="size-3 shrink-0 rounded-full border border-line" style={{ background: item.dark.accent }} aria-hidden="true" />
                  {item.name}
                </button>
              ))}
            </div>
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

          <Card className={tab === "icon" ? undefined : "hidden"}>
            <CardHeader title="Biểu tượng" icon="ui.magic" hint="Chọn kiểu nét cho cả bộ, rồi đổi icon theo từng chức năng." />
            <Segmented
              label="Kiểu nét icon"
              value={draft.iconWeight}
              onChange={(iconWeight: IconWeight) => patch({ iconWeight })}
              options={ICON_WEIGHTS.map(([id, label]) => ({ id, label }))}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {ICON_GROUPS.map(([id, label]) => (
                <Field key={id} label={`Nét ${label}`} hint="«Theo cả bộ» thì không đổi riêng.">
                  <select
                    className={inputClass}
                    aria-label={`Nét ${label}`}
                    value={draft.iconGroups[id]}
                    onChange={(event) => patch({ iconGroups: { ...draft.iconGroups, [id]: event.target.value as IconGroupWeight } })}
                  >
                    <option value="same">Theo cả bộ</option>
                    {ICON_WEIGHTS.map(([weight, name]) => (
                      <option key={weight} value={weight}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <Segmented
              label="Cỡ icon"
              value={draft.iconSize}
              onChange={(iconSize: IconSize) => patch({ iconSize })}
              options={ICON_SIZES.map(([id, label]) => ({ id, label }))}
            />
            <Segmented
              label="Màu icon"
              value={draft.iconTone}
              onChange={(iconTone: IconTone) => patch({ iconTone })}
              options={ICON_TONES.map(([id, label]) => ({ id, label }))}
            />
            <details className="rounded-[var(--radius-ctl)] border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">Đổi icon từng chức năng</summary>
              <ThemeProvider theme={draft}>
                <div className="mt-2 grid gap-2">
                  <input className={inputClass} value={iconQuery} aria-label="Tìm chức năng" placeholder="Tìm chức năng" onChange={(event) => setIconQuery(event.target.value)} />
                  {shownSlots.length === 0 && <p className="text-sm text-muted">Không thấy chức năng này.</p>}
                  {ICON_GROUPS.map(([id, label]) => {
                    const rows = shownSlots.filter(([slot]) => slot.startsWith(`${id}.`));
                    if (rows.length === 0) return null;
                    return (
                      <div key={id} className="grid gap-2">
                        <p className="text-sm font-semibold">{label}</p>
                        {rows.map(([slot, slotLabel, fallback]) => {
                          const current = draft.icons[slot] || fallback;
                          const open = iconPick === slot;
                          return (
                            <div key={slot} className="grid gap-2">
                              <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-sm sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
                                <Icon slot={slot} size="1.4rem" />
                                <button type="button" className="min-tap truncate text-left" aria-expanded={open} onClick={() => setIconPick(open ? "" : slot)}>
                                  {slotLabel}
                                </button>
                                <button
                                  type="button"
                                  className="col-span-2 min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-xs disabled:opacity-40 sm:col-span-1"
                                  disabled={current === fallback}
                                  onClick={() => patchIcon(slot, fallback)}
                                >
                                  Đặt lại icon này
                                </button>
                              </div>
                              {open && (
                                <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-2">
                                  <input
                                    className={inputClass}
                                    value={glyphQuery}
                                    aria-label={`Tìm hình cho ${slotLabel}`}
                                    placeholder="Tìm hình"
                                    onChange={(event) => setGlyphQuery(event.target.value)}
                                  />
                                  {glyphs.length === 0 ? (
                                    <p className="text-sm text-muted">Không thấy hình này.</p>
                                  ) : (
                                    <div className="grid max-h-48 grid-cols-6 gap-1 overflow-auto">
                                      {glyphs.map((key) => (
                                        <button
                                          key={key}
                                          type="button"
                                          aria-label={key}
                                          aria-pressed={key === current}
                                          title={key}
                                          className={
                                            "inline-flex size-11 items-center justify-center rounded-[var(--radius-ctl)] border " +
                                            (key === current ? "border-accent bg-raised" : "border-transparent")
                                          }
                                          onClick={() => patchIcon(slot, key)}
                                        >
                                          <Icon name={key} size="1.25rem" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </ThemeProvider>
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
