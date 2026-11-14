import { useState, type ReactNode } from "react";
import { Clapperboard, FileAudio, KeyRound, Link2, Loader2, SlidersHorizontal, Upload, Wallet } from "lucide-react";
import { fmt } from "@/lib/sub/text";
import { SRC_LANGS } from "@/lib/sub/text";
import { formatBytes, isMediaFile, type FileThumb } from "@/components/file-thumb";
import { useLinkCheck } from "@/components/use-link-check";
import { GENRES } from "@/lib/home-state";

const CHIP = "min-tap inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm text-fg hover:border-accent focus-visible:ring-2 focus-visible:ring-accent";

function ChipSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className={CHIP + " relative"}>
      <span className="text-muted">{label}</span>
      <select
        aria-label={label}
        className="max-w-[10.5rem] cursor-pointer truncate bg-transparent py-2 pr-1 font-medium outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
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
  payMode,
  onTogglePay,
  keyReady,
  onOpenTool,
  running,
  online,
  onStart,
  extra,
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
  /** null: cửa trả theo lượt đóng, không hiện chip. */
  payMode: "key" | "turn" | null;
  onTogglePay: () => void;
  keyReady: boolean;
  onOpenTool: (id: "key" | "phim") => void;
  running: boolean;
  online: boolean;
  onStart: () => void;
  /** Chỗ cho ước tính và số dư, đặt ngay trên nút bắt đầu. */
  extra?: ReactNode;
}) {
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const linkCheck = useLinkCheck();
  const isAudio = Boolean(file && (file.type.startsWith("audio/") || /\.(mp3|m4a|aac|ac3|dts|wav|flac|ogg|opus)$/i.test(file.name)));
  const hasInput = Boolean(file) || url.trim().length > 0;
  const pick = (next: File | null) => {
    if (!next) return;
    if (!isMediaFile(next)) return setNote("Chỉ nhận video hoặc âm thanh (mp4, mkv, webm, mp3…).");
    setNote("");
    onFile(next);
  };
  return (
    <section data-tour="drop" data-home-hero aria-label="Chọn video để dịch" className="mx-auto grid w-full max-w-2xl gap-3 py-2">
      <label
        className={
          "relative grid min-h-[13rem] cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed bg-card px-4 py-8 text-center transition-colors focus-within:border-accent hover:border-accent sm:min-h-[16rem] " +
          (over ? "border-accent" : "border-line")
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
              <Loader2 className="size-9 animate-spin text-accent motion-reduce:animate-none" />
            ) : isAudio ? (
              <FileAudio className="size-10 text-accent" />
            ) : (
              <Clapperboard className="size-10 text-accent" />
            )
          ) : (
            <Upload className="size-10 text-accent" />
          )}
          {file ? (
            <>
              <span className="max-w-[18rem] truncate text-base font-semibold sm:max-w-md">{file.name}</span>
              <span className="text-xs text-muted">
                {[formatBytes(file.size), thumb.seconds ? fmt(thumb.seconds) : ""].filter(Boolean).join(" · ")}
                {thumb.state === "none" && !isAudio ? " · không xem trước được, vẫn dịch bình thường" : ""}
              </span>
              <span className="text-xs text-muted">Bấm hoặc kéo tệp khác vào để đổi</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold">Kéo video vào đây</span>
              <span className="text-sm text-muted">hoặc bấm để chọn tệp · hoặc dán link ở dưới</span>
              <span className="text-xs text-muted">Dán link ở bất cứ đâu trên trang cũng được. Ctrl+K để mở lệnh nhanh.</span>
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

      <span className="relative block">
        <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="url"
          value={url}
          placeholder="Hoặc dán link file trực tiếp https://…/phim.mp4"
          aria-label="Link file trực tiếp"
          className="min-tap w-full rounded-full border border-line bg-card pr-3 pl-9 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Lựa chọn nhanh">
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
        {payMode && (
          <button type="button" className={CHIP} aria-pressed={payMode === "turn"} onClick={onTogglePay} title="Đổi giữa key của bạn và trả theo lượt">
            <Wallet className="size-4" aria-hidden="true" />
            <span className="font-medium">{payMode === "turn" ? "Trả theo lượt" : "Key của tôi"}</span>
          </button>
        )}
        {payMode !== "turn" && (
          <button type="button" className={CHIP} onClick={() => onOpenTool("key")}>
            <KeyRound className="size-4" aria-hidden="true" />
            <span className={keyReady ? "font-medium" : "font-medium text-warning"}>{keyReady ? "Đã có key" : "Nhập key"}</span>
          </button>
        )}
        <button type="button" className={CHIP} onClick={() => onOpenTool("phim")}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="font-medium">Tùy chọn khác</span>
        </button>
      </div>

      {extra}

      <button
        type="button"
        data-home-start
        disabled={running || !hasInput || !online}
        className="min-tap rounded-full bg-accent px-6 text-base font-semibold text-ink disabled:opacity-40"
        onClick={onStart}
      >
        {running ? "Đang chạy…" : "Tải và dịch"}
      </button>
    </section>
  );
}
