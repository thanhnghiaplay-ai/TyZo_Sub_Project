import { Icon } from "@/components/ui/icon";
import { usePipeline } from "@/components/use-pipeline";
import { GENRES } from "@/lib/home-state";
import { LANGS, SRC_LANGS } from "@/lib/sub/text";
import { FIELD } from "@/components/studio-shared";
import { FileTile, Select } from "@/components/studio-parts";
import type * as React from "react";
import type { ToolId } from "@/components/studio-tools";

type PipelineApp = ReturnType<typeof usePipeline>;

export type FilmPanelProps = {
  toolTab: ToolId;
  runDoor: import("@/lib/admin/admin-runs").RunDoorView & { ready: boolean; };
  payByRoom: boolean;
  openTool: (raw: ToolId) => void;
  app: PipelineApp;
  thumb: import("@/components/file-thumb").FileThumb;
  linkCheck: { problem: string | null; check: (value: string) => void; clear: () => void; };
};

/** Thẻ «phim» của màn hình dịch (tách từ studio.tsx, đợt 5). */
export function FilmPanel(props: FilmPanelProps) {
  const { toolTab, runDoor, payByRoom, openTool, app, thumb, linkCheck } = props;
  return (
    <section id="tool-phim" role="region" aria-labelledby="tool-tab-phim" hidden={toolTab !== "phim"} className="grid gap-3 p-4">
      {runDoor.ready && runDoor.open && (
        <div className="studio-pay-chip" role="status">
          <span className="text-muted">Trả bằng:</span> <strong>{payByRoom ? "Trả theo lượt" : "Key của tôi"}</strong>
          <button type="button" className="studio-pay-change" onClick={() => openTool("run")} aria-label="Đổi cách trả, ở bước cuối Tải và dịch">
            Đổi
          </button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Nhận diện ngôn ngữ" value={app.source} onChange={app.setSource}>
          {SRC_LANGS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select label="Dịch sang tiếng" value={app.target} onChange={app.setTarget}>
          {LANGS.filter(([value]) => value === "Vietnamese").map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {app.heardLang ? (
        <p className="text-sm text-muted" role="status">
          Máy nghe ra {({ zh: "Tiếng Trung", ko: "Tiếng Hàn", ja: "Tiếng Nhật", en: "Tiếng Anh" } as Record<string, string>)[app.heardLang] || app.heardLang}
          {app.source !== "auto" && app.heardLang !== app.source ? ". Khác ngôn ngữ bạn chọn." : "."}
        </p>
      ) : null}

      <Select label="Thể loại" value={app.genre} onChange={app.pickGenre}>
        {GENRES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <p className="text-sm text-muted">
        {app.glossaryInfo?.failed ? "Không tải được thuật ngữ có sẵn. Hãy thử lại." : <>Đã nạp <strong className="studio-count">{app.glossaryInfo?.count || 0}</strong> thuật ngữ. </>}
        <button type="button" className="font-semibold text-accent underline" onClick={() => openTool("thuatngu")}>
          Xem và sửa thuật ngữ
        </button>
      </p>

      <FileTile icon={<Icon slot="ui.video" className="size-5" />} image={app.file ? thumb.image : null} title="Video" name={app.file?.name} hint="mp4, mkv, webm…" accept="video/*,audio/*" onFile={app.setFile} />
      <label className="grid gap-1 text-sm text-muted">
        Hoặc link file trực tiếp
        <span className="relative">
          <Icon slot="act.link" className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
          <input
            className={FIELD + " pl-9"}
            type="url"
            placeholder="https://…/video.mp4"
            value={app.url}
            aria-invalid={Boolean(linkCheck.problem)}
            onChange={(event) => {
              if (linkCheck.problem) linkCheck.check(event.target.value);
              app.setUrl(event.target.value);
            }}
            onBlur={(event) => linkCheck.check(event.target.value)}
            onPaste={(event) => linkCheck.check(event.clipboardData.getData("text"))}
          />
        </span>
        {linkCheck.problem && (
          <span role="alert" className="text-xs text-danger">
            {linkCheck.problem}
          </span>
        )}
      </label>
      <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2" open={app.audioFile ? true : undefined}>
        <summary className="min-tap cursor-pointer text-sm font-medium">Tùy chọn thêm: âm thanh riêng, file lớn</summary>
        <div className="grid gap-3 pt-2">
          <FileTile icon={<Icon slot="ui.audio" className="size-5" />} title="Âm thanh riêng" name={app.audioFile?.name} hint="Khi file quá lớn" accept="audio/*,video/*" onFile={app.setAudioFile} />
          <p className="text-sm text-muted">
            File lớn hơn 1 GB, MKV, AC3/DTS: tách âm thanh nhỏ bằng ffmpeg rồi chọn vào Âm thanh riêng. Video vẫn phát từ file gốc. Lệnh:{" "}
            <code className="text-fg">ffmpeg -i video.mkv -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags +faststart am-thanh.m4a</code>
          </p>
        </div>
      </details>
    </section>
  );
}
