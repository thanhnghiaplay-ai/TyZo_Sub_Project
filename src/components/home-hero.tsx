import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { fmt } from "@/lib/sub/text";
import { SRC_LANGS } from "@/lib/sub/text";
import { formatBytes, isMediaFile, type FileThumb } from "@/components/file-thumb";
import { useLinkCheck } from "@/components/use-link-check";
import { useCaps } from "@/components/use-caps";
import { GENRES } from "@/lib/home-state";
import { PickerSelect } from "@/components/picker-select";
import type { HomeAction } from "@/lib/home-action";

const CHIP = "min-tap inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm text-fg hover:border-accent focus-visible:ring-2 focus-visible:ring-accent";

function ChipSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <PickerSelect
      label={label}
      value={value}
      onChange={onChange}
      trigger={(open, current) => (
        <button type="button" data-chip-select aria-haspopup="dialog" aria-label={label} className={CHIP + " relative min-w-0 text-left"} onClick={open}>
          <span className="shrink-0 text-muted">{label}</span>
          <span data-chip-value className="min-w-0 flex-1 truncate py-2 pr-1 font-medium">{current}</span>
          <span aria-hidden="true" className="shrink-0 text-muted">▾</span>
        </button>
      )}
    >
      {children}
    </PickerSelect>
  );
}

/**
 * Trang chủ gọn: một ô thả lớn ở giữa, một hàng chip cho các lựa chọn hay đổi, một nút bắt đầu.
 * Mọi thứ nâng cao vẫn nằm trong menu trái; chip chỉ mở đúng mục đó.
 */
export function HomeHero({
  file,
  thumb,
  url,
  onFile,
  onUrl,
  source,
  onSource,
  genre,
  onGenre,
  onOpenTool,
  action,
  onAction,
  extra,
  top,
}: {
  file: File | null;
  thumb: FileThumb;
  url: string;
  onFile: (file: File | null) => void;
  onUrl: (value: string) => void;
  source: string;
  onSource: (value: string) => void;
  genre: string;
  onGenre: (value: string) => void;
  onOpenTool: (id: "key" | "phim") => void;
  /** Nút chính theo trạng thái (home-action.ts): Tải và dịch, hoặc đúng bước còn thiếu. Chọn tệp và đổi lựa chọn luôn dùng được. */
  action: HomeAction;
  onAction: () => void;
  /** Chỗ cho ước tính, đặt ngay trên nút bắt đầu. */
  extra?: ReactNode;
  /** Chỗ cho số dư Token dịch, đặt ngay đầu trang, trên ô thả. */
  top?: ReactNode;
}) {
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const linkCheck = useLinkCheck();
  const caps = useCaps();
  const isAudio = Boolean(file && (file.type.startsWith("audio/") || /\.(mp3|m4a|aac|ac3|dts|wav|flac|ogg|opus)$/i.test(file.name)));
  const pick = (next: File | null) => {
    if (!next) return;
    if (!isMediaFile(next)) return setNote("Chỉ nhận video hoặc âm thanh (mp4, mkv, webm, mp3…).");
    setNote("");
    onFile(next);
  };
  // Kéo tệp vào bất cứ đâu trên trang: ô thả sáng lên và nhận tệp, trình duyệt không mở tệp thay app.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setPageDrag(true);
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setPageDrag(false);
    };
    const overPage = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      depth = 0;
      setPageDrag(false);
      if (!hasFiles(event) || event.defaultPrevented) return;
      event.preventDefault();
      pick(event.dataTransfer?.files?.[0] || null);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overPage);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overPage);
      window.removeEventListener("drop", drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFile]);
  return (
    <section data-tour="drop" data-home-hero aria-label="Chọn video để dịch" className="mx-auto grid w-full max-w-2xl gap-4 py-4 sm:gap-5 sm:py-8 max-lg:landscape:pb-14 lg:max-w-5xl lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-x-6">
      <div className="empty:hidden has-[>div:empty]:hidden lg:col-span-2">{top}</div>
      <label
        className={
          "relative grid min-h-[15rem] lg:col-start-1 lg:row-start-2 cursor-pointer place-items-center overflow-hidden rounded-[var(--radius-card)] border-2 border-dashed px-5 py-10 text-center transition-all duration-200 focus-within:border-accent hover:border-accent motion-reduce:transition-none sm:min-h-[19rem] " +
          (over
            ? "scale-[1.02] border-accent bg-accent/15 shadow-xl ring-4 ring-accent/30 motion-reduce:scale-100"
            : pageDrag
              ? "animate-pulse border-accent bg-accent/5 motion-reduce:animate-none"
              : "border-line bg-card")
        }
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          pick(event.dataTransfer.files?.[0] || null);
        }}
      >
        {thumb.image && <img src={thumb.image} alt="" className="absolute inset-0 size-full object-cover opacity-30" />}
        <span className="relative grid justify-items-center gap-1.5">
          {file ? (
            thumb.state === "loading" ? (
              <Icon slot="ui.busy" className="size-9 animate-spin text-accent motion-reduce:animate-none" />
            ) : isAudio ? (
              <Icon slot="ui.audio" className="size-12 text-accent" />
            ) : (
              <Icon slot="ui.video" className="size-12 text-accent" />
            )
          ) : (
            <span data-drop-ring className="grid place-items-center">
              <Icon slot="act.upload" className="size-12 text-accent" />
            </span>
          )}
          {file ? (
            <>
              <span className="max-w-[18rem] truncate text-lg font-semibold sm:max-w-md sm:text-xl">{file.name}</span>
              <span className="text-xs text-muted">
                {[formatBytes(file.size), thumb.seconds ? fmt(thumb.seconds) : ""].filter(Boolean).join(" · ")}
                {thumb.state === "none" && !isAudio ? " · không xem trước được, vẫn dịch bình thường" : ""}
              </span>
              <span className="text-xs text-muted">Bấm hoặc kéo tệp khác vào để đổi</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-semibold sm:text-3xl">{over ? "Thả để chọn video này" : caps.touchOnly ? "Chạm để chọn video" : "Kéo video vào đây"}</span>
              <span className="text-base text-muted">{caps.touchOnly ? "từ máy hoặc thư viện · hoặc dán link ở dưới" : "hoặc bấm để chọn tệp · hoặc dán link ở dưới"}</span>
              <span className="text-xs text-muted">{caps.touchOnly ? "Dán link vào ô bên dưới là bắt đầu được." : "Dán link ở bất cứ đâu trên trang cũng được. Ctrl+K để mở lệnh nhanh."}</span>
            </>
          )}
          {note && <span className="text-xs text-danger">{note}</span>}
        </span>
        <input
          className="absolute inset-0 cursor-pointer opacity-0"
          type="file"
          accept="video/*,audio/*,.mkv,.m4a,.mp3,.aac,.ac3,.dts,.flac,.opus"
          aria-label="Chọn video hoặc âm thanh"
          onChange={(event) => {
            pick(event.target.files?.[0] || null);
            event.currentTarget.value = "";
            event.currentTarget.blur();
          }}
        />
      </label>

      <span className="relative block lg:col-start-1 lg:row-start-3">
        <Icon slot="act.link" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="url"
          value={url}
          placeholder="Hoặc dán link file trực tiếp https://…/video.mp4"
          aria-label="Link file trực tiếp"
          className="min-tap w-full rounded-full border border-line bg-card pr-4 pl-10 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-invalid={Boolean(linkCheck.problem)}
          onChange={(event) => {
            if (linkCheck.problem) linkCheck.check(event.target.value);
            onUrl(event.target.value);
          }}
          onBlur={(event) => linkCheck.check(event.target.value)}
          onPaste={(event) => linkCheck.check(event.clipboardData.getData("text"))}
        />
        {linkCheck.problem && (
          <span role="alert" className="mt-1 block px-3 text-xs text-danger">
            {linkCheck.problem}
          </span>
        )}
      </span>

      <aside aria-label="Xem trước bản dịch" className="hidden content-start gap-3 rounded-[var(--radius-card)] border border-line bg-card p-5 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:grid">
        <h2 className="font-semibold">Bản dịch</h2>
        <p className="text-sm text-muted">Phụ đề hiện ở đây khi dịch xong, từng câu theo giờ. Bạn xem cạnh video và sửa được ngay tại câu.</p>
        <div aria-hidden className="grid gap-2">
          {[78, 92, 64, 85, 70].map((width, index) => (
            <span key={index} className="h-3 rounded-full bg-line/60" style={{ width: `${width}%` }} />
          ))}
        </div>
      </aside>

      <div className="grid gap-2 lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-xl" role="group" aria-label="Lựa chọn nhanh">
        <div className="grid grid-cols-2 gap-2">
          <ChipSelect label="Tiếng gốc" value={source} onChange={onSource}>
            {SRC_LANGS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </ChipSelect>
          <ChipSelect label="Thể loại" value={genre} onChange={onGenre}>
            {GENRES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </ChipSelect>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Cách trả và key nằm ở dòng trạng thái đầu trang (PayStatusBar), không lặp lại ở đây. */}
          <button type="button" className={CHIP} onClick={() => onOpenTool("phim")}>
            <Icon slot="ui.options" className="size-4" />
            <span className="font-medium">Tùy chọn khác</span>
          </button>
        </div>
      </div>

      <div className="empty:hidden lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-xl">{extra}</div>

      <div className="grid gap-1.5 lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-xl">
        <button
          type="button"
          data-home-start
          data-home-action={action.kind}
          disabled={action.kind === "none"}
          aria-describedby={action.hint ? "home-start-hint" : undefined}
          className="min-h-14 rounded-full bg-accent px-8 text-lg font-semibold text-ink transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100"
          onClick={onAction}
        >
          {action.label}
        </button>
        {action.hint && (
          <p id="home-start-hint" className="text-center text-xs text-muted" data-home-hint>
            {action.hint}
          </p>
        )}
      </div>
    </section>
  );
}
