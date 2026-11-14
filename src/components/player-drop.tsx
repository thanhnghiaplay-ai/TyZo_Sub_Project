import { useState } from "react";
import { Clapperboard, FileAudio, Link2, Loader2, Upload } from "lucide-react";
import { fmt } from "@/lib/sub/text";
import { formatBytes, isMediaFile, type FileThumb } from "@/components/file-thumb";
import { useLinkCheck } from "@/components/use-link-check";

/** Khung chọn video lớn đặt trên player: kéo thả, bấm để chọn, ảnh xem trước, link trực tiếp. */
export function PlayerDrop({
  file,
  thumb,
  url,
  onFile,
  onUrl,
}: {
  file: File | null;
  thumb: FileThumb;
  url: string;
  onFile: (file: File | null) => void;
  onUrl: (value: string) => void;
}) {
  const [note, setNote] = useState("");
  const isAudio = Boolean(file && (file.type.startsWith("audio/") || (!thumb.image && thumb.state === "none" && /\.(mp3|m4a|aac|ac3|dts|wav|flac|ogg|opus)$/i.test(file.name))));
  const pick = (next: File | null) => {
    if (!next) return;
    if (!isMediaFile(next)) return setNote("Chỉ nhận video hoặc âm thanh (mp4, mkv, webm, mp3…).");
    setNote("");
    onFile(next);
  };
  const linkCheck = useLinkCheck();
  return (
    <div data-tour="drop" className="absolute inset-0 z-[25] flex flex-col gap-2 p-2 sm:p-3">
      <label
        className="relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line bg-card/90 px-3 text-center transition-colors hover:border-accent focus-within:border-accent"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          pick(event.dataTransfer.files?.[0] || null);
        }}
      >
        {thumb.image && <img src={thumb.image} alt="" className="absolute inset-0 size-full object-cover opacity-40" />}
        <span className="relative flex flex-col items-center gap-1">
          {file ? (
            thumb.state === "loading" ? (
              <Loader2 className="size-7 animate-spin text-accent motion-reduce:animate-none" />
            ) : isAudio ? (
              <FileAudio className="size-8 text-accent" />
            ) : (
              <Clapperboard className="size-8 text-accent" />
            )
          ) : (
            <Upload className="size-8 text-accent" />
          )}
          {file ? (
            <>
              <span className="max-w-[16rem] truncate text-sm font-semibold text-fg sm:max-w-md">{file.name}</span>
              <span className="text-xs text-muted">
                {[formatBytes(file.size), thumb.seconds ? fmt(thumb.seconds) : ""].filter(Boolean).join(" · ")}
                {thumb.state === "none" && !isAudio ? " · không xem trước được, vẫn dịch bình thường" : ""}
              </span>
              <span className="text-xs text-muted">Bấm hoặc kéo tệp khác vào để đổi</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-fg">Kéo video vào đây</span>
              <span className="text-xs text-muted">hoặc bấm để chọn tệp · mp4, mkv, webm, mp3…</span>
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
      <span className="relative block shrink-0">
        <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
        <input
          type="url"
          value={url}
          placeholder="Hoặc dán link file trực tiếp https://…/phim.mp4"
          aria-label="Link file trực tiếp"
          className="h-9 w-full rounded-lg border border-line bg-bg pr-2 pl-8 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-invalid={Boolean(linkCheck.problem)}
          onChange={(event) => {
            if (linkCheck.problem) linkCheck.check(event.target.value);
            onUrl(event.target.value);
          }}
          onBlur={(event) => linkCheck.check(event.target.value)}
          onPaste={(event) => linkCheck.check(event.clipboardData.getData("text"))}
        />
        {linkCheck.problem && (
          <span role="alert" className="mt-1 block text-xs text-danger">
            {linkCheck.problem}
          </span>
        )}
      </span>
    </div>
  );
}
