import { usePipeline } from "@/components/use-pipeline";
import { DragSlider } from "@/components/drag-slider";
import { InfoTip } from "@/components/info-tip";
import { defaultOrpheusVoice, orpheusVoices } from "@/lib/sub/narration";
import { edgeVoice } from "@/lib/sub/edge-voice";
import { type NarrationSettings } from "@/lib/sub/types";
import { Choice, Select } from "@/components/studio-parts";
import type * as React from "react";
import type { ToolId } from "@/components/studio-tools";

type PipelineApp = ReturnType<typeof usePipeline>;

export type VoicePanelProps = {
  toolTab: ToolId;
  narration: import("@/lib/sub/types").NarrationSettings;
  patchNarration: (patch: Partial<import("@/lib/sub/types").NarrationSettings>) => void;
  app: PipelineApp;
  cloud: "en" | "ar" | null;
  shownVoices: SpeechSynthesisVoice[];
  voices: SpeechSynthesisVoice[];
  previewVoice: () => void;
};

/** Thẻ «voice» của màn hình dịch (tách từ studio.tsx, đợt 5). */
export function VoicePanel(props: VoicePanelProps) {
  const { toolTab, narration, patchNarration, app, cloud, shownVoices, voices, previewVoice } = props;
  return (
    <section id="tool-voice" role="region" aria-labelledby="tool-tab-voice" hidden={toolTab !== "voice"} className="grid gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            Thuyết minh bản dịch
            <InfoTip label="Giải thích thuyết minh">Giọng neural miễn phí đọc tự nhiên hơn. Lỗi mạng thì máy đọc bằng giọng có sẵn.</InfoTip>
          </h2>
        </div>
        <button
          type="button"
          role="switch"
          data-tour="voice-on"
          aria-checked={narration.enabled}
          className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (narration.enabled ? "bg-accent text-ink" : "border border-line")}
          onClick={() => patchNarration({ enabled: !narration.enabled })}
        >
          {narration.enabled ? "Đang bật" : "Tắt"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-tour="voice-engine">
        <Choice on={narration.engine === "edge"} onClick={() => patchNarration({ engine: "edge", gender: narration.gender === "any" ? "female" : narration.gender })} title="Neural" text="Miễn phí, tự nhiên" />
        <Choice on={narration.engine === "browser"} onClick={() => patchNarration({ engine: "browser" })} title="Giọng máy" text="Có sẵn trên máy" />
        <Choice
          on={narration.engine === "orpheus"}
          onClick={() => patchNarration({ engine: "orpheus", orpheusVoice: defaultOrpheusVoice(app.target, narration.gender) })}
          title="Orpheus"
          text={cloud ? "Có phí" : "Anh, Ả Rập"}
        />
      </div>
      {narration.engine === "edge" && (
        <p className="text-sm text-muted">
          {narration.matchCast
            ? `Theo tiếng trong video: ${edgeVoice(app.target, "female").label} (nữ) và ${edgeVoice(app.target, "male").label} (nam). `
            : `Giọng ${edgeVoice(app.target, narration.gender === "any" ? "female" : narration.gender).label}. `}
          Không cần API key. Nếu dịch vụ giọng tắt, app tự chuyển sang giọng máy khoảng 20 giây.
        </p>
      )}
      {narration.engine === "orpheus" && !cloud && <p className="text-sm text-danger">Orpheus chưa đọc tiếng này. Máy sẽ dùng giọng có sẵn.</p>}
      <p className="text-sm text-muted">Giọng dự phòng khi không đo được cao độ, hoặc khi tắt đọc theo video.</p>
      <div className={"grid gap-2 " + (narration.engine === "edge" ? "grid-cols-2" : "grid-cols-3")}>
        {(
          [
            ["female", "Nữ"],
            ["male", "Nam"],
            ["any", "Bất kỳ"],
          ] as const
        )
          .filter(([id]) => narration.engine === "browser" || narration.engine === "orpheus" || id !== "any")
          .map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={"min-tap rounded-[var(--radius-ctl)] border text-sm " + (narration.gender === id ? "border-accent bg-accent text-ink" : "border-line")}
            onClick={() => patchNarration({ gender: id, orpheusVoice: defaultOrpheusVoice(app.target, id) })}
          >
            {label}
          </button>
        ))}
      </div>
      {narration.engine === "browser" ? (
        <Select label="Giọng trên máy" value={narration.voiceURI} onChange={(voiceURI) => patchNarration({ voiceURI })}>
          <option value="">Tự chọn theo ngôn ngữ</option>
          {(shownVoices.length ? shownVoices : voices).map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} · {voice.lang}
            </option>
          ))}
        </Select>
      ) : narration.engine === "orpheus" ? (
        <Select label="Giọng Orpheus" value={narration.orpheusVoice} onChange={(orpheusVoice) => patchNarration({ orpheusVoice })}>
          {orpheusVoices(app.target)
            .filter((voice) => narration.gender === "any" || voice.gender === narration.gender)
            .map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} · {voice.gender === "female" ? "nữ" : "nam"}
              </option>
            ))}
        </Select>
      ) : null}
      <DragSlider label="Tốc độ nói" value={narration.rate} min={0.6} max={1.8} step={0.1} defaultValue={1} marks={[1]} format={(value) => `${value.toFixed(1)}×`} onCommit={(rate) => patchNarration({ rate })} />
      {narration.engine !== "orpheus" && (
        <DragSlider label="Cao độ" value={narration.pitch} min={0.6} max={1.6} step={0.1} defaultValue={1} marks={[1]} format={(value) => value.toFixed(1)} onCommit={(pitch) => patchNarration({ pitch })} />
      )}
      <DragSlider label="Âm lượng thuyết minh" value={narration.volume} min={0.2} max={1} step={0.05} defaultValue={1} format={(value) => `${Math.round(value * 100)}%`} onCommit={(volume) => patchNarration({ volume })} />
      <DragSlider
        label="Đọc trước / sau phụ đề"
        value={narration.lead}
        min={-1.5}
        max={2}
        step={0.1}
        defaultValue={0}
        marks={[0]}
        format={(value) => (value === 0 ? "Đúng lúc" : value < 0 ? `Trước ${(-value).toFixed(1)} giây` : `Sau ${value.toFixed(1)} giây`)}
        onCommit={(lead) => patchNarration({ lead })}
      />
      <p className="text-sm text-muted">Kéo núm để chỉnh thêm. Đúng lúc là đọc khi câu hiện. Trước là đọc sớm, sau là đọc muộn. App đã tự bù độ trễ tạo giọng, tạo trước vài câu kế tiếp và đọc nhanh vừa phải khi câu dài hơn khoảng thoại.</p>
      <div className="flex items-center gap-2">
        <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={narration.matchCast} onChange={(event) => patchNarration({ matchCast: event.target.checked })} />
        Đọc theo nhân vật, rồi theo cao độ
      </label>
        <InfoTip label="Giải thích: Đọc theo nhân vật">Câu có tên hoặc tự xưng rõ trong bảng nhân vật thì dùng giới đó. Không chắc thì so cao độ trong video: nhóm thấp là nam, nhóm cao là nữ. Bấm Đổi giọng trên một câu để khóa nam hoặc nữ. Không đoán anh/em.</InfoTip>
      </div>
      <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={narration.duck} onChange={(event) => patchNarration({ duck: event.target.checked })} />
        Hạ tiếng phim khi đang đọc
      </label>
      <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={narration.muteVideo} onChange={(event) => patchNarration({ muteVideo: event.target.checked })} />
        Tắt hẳn tiếng gốc lúc thuyết minh
      </label>
      <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={narration.followPlayback} onChange={(event) => patchNarration({ followPlayback: event.target.checked })} />
        Bám tốc độ phát của video
      </label>
      <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={narration.skipCues} onChange={(event) => patchNarration({ skipCues: event.target.checked })} />
        Bỏ qua chú thích trong ngoặc, ví dụ [nhạc]
      </label>
      <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line" onClick={previewVoice}>
        Nghe thử một câu
      </button>
    </section>
  );
}
