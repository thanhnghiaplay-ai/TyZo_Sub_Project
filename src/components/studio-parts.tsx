import { memo, type ReactNode } from "react";
import { PROVIDER_LABEL } from "@/lib/sub/provider";
import { PickerSelect } from "@/components/picker-select";
import { InfoTip } from "@/components/info-tip";
import { TIER_LABEL, VOICE_LANES, chatProviderOf, modelLabel, resolveVoiceLane, voiceLaneOf } from "@/lib/sub/models";
import { type GroqBoard } from "@/lib/sub/groq-board";
import { fmt } from "@/lib/sub/text";
import { type ChatModel, type Seg } from "@/lib/sub/types";
import { FIELD } from "@/components/studio-shared";
import { modelFacts } from "@/components/studio-price";

/** Phần nhỏ của phòng dịch: hàng phụ đề, làn giọng, ô chọn, chọn tệp, chọn model, giá model. Tách từ studio.tsx (23/11/2026). */

type CueRowProps = {
  seg: Seg;
  index: number;
  active: boolean;
  onJump: (start: number) => void;
  onEdit: (seg: Seg) => void;
  onVoice: (index: number) => void;
};

/** Một câu trong bản dịch. Chỉ vẽ lại khi chính câu đó đổi, nên phim dài không còn giật mỗi lần có câu mới. */
export const CueRow = memo(
  function CueRow({ seg, index, active, onJump, onEdit, onVoice }: CueRowProps) {
    return (
      <div
        className={"grid grid-cols-[1fr_auto] gap-2 border-b border-line py-3 " + (active ? "rounded-[var(--radius-ctl)] bg-raised px-2" : "")}
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 96px" }}
      >
        <button type="button" className="grid gap-1 text-left" onClick={() => onJump(seg.start)}>
          <span className="text-xs font-semibold text-accent">
            {fmt(seg.start)}
            {seg.model ? ` · ${modelLabel(seg.model)}` : ""}
            {seg.voiceLock === "male" ? " · khóa nam" : seg.voiceLock === "female" ? " · khóa nữ" : seg.voice === "male" ? " · đo nam" : seg.voice === "female" ? " · đo nữ" : ""}
          </span>
          <span className={seg.translationFailed ? "font-medium text-danger" : seg.translation === null ? "text-muted italic" : "font-medium"}>
            {seg.translationFailed ? "Không dịch được" : seg.translation === null ? "Đang chờ dịch…" : seg.translation}
          </span>
          <span className="text-sm text-muted">{seg.original}</span>
        </button>
        <div className="grid gap-2">
          <button type="button" className="min-tap self-start rounded-full border border-line px-3 text-sm" onClick={() => onEdit(seg)}>
            Sửa
          </button>
          <button type="button" className="min-tap self-start rounded-full border border-line px-3 text-sm" onClick={() => onVoice(index)}>
            Đổi giọng
          </button>
        </div>
      </div>
    );
  },
  (a, b) =>
    a.active === b.active &&
    a.index === b.index &&
    a.onJump === b.onJump &&
    a.onEdit === b.onEdit &&
    a.onVoice === b.onVoice &&
    a.seg.start === b.seg.start &&
    a.seg.end === b.seg.end &&
    a.seg.original === b.seg.original &&
    a.seg.translation === b.seg.translation &&
    a.seg.translationFailed === b.seg.translationFailed &&
    a.seg.model === b.seg.model &&
    a.seg.voice === b.seg.voice &&
    a.seg.voiceLock === b.seg.voiceLock,
);

export function VoiceLanes({
  modelId,
  available,
  allowEnterprise,
  known,
  priceFor,
  onPick,
}: {
  modelId: string;
  available: Set<string> | null;
  allowEnterprise: boolean;
  known: boolean;
  priceFor: (id: string) => string;
  onPick: (id: string) => void;
}) {
  const selected = voiceLaneOf(modelId);
  return (
    <div className="grid min-w-0 gap-2">
      {VOICE_LANES.map((lane) => {
        const id = resolveVoiceLane(lane.id, available, allowEnterprise);
        const closed = known && !id;
        const on = selected === lane.id;
        const price = id ? priceFor(id) : "";
        return (
          <button
            key={lane.id}
            type="button"
            disabled={closed}
            aria-disabled={closed}
            onClick={() => id && onPick(id)}
            className={
              "min-tap min-w-0 rounded-[var(--radius-ctl)] border px-3 py-2 text-left " +
              (closed ? "cursor-not-allowed border-line bg-raised text-muted opacity-50 grayscale" : on ? "border-accent bg-accent text-ink" : "border-line bg-bg")
            }
          >
            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>{lane.title}</span>
              {closed && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium">Key chưa mở</span>}
            </span>
            <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>{lane.fit}</span>
            <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>
              {lane.pace}
              {price ? ` · ${price}` : ""}
            </span>
            <span className={"block text-xs " + (on ? "text-ink/70" : "text-muted")}>
              {closed ? "" : id ? modelLabel(id) : "Chưa đối chiếu được key"}
            </span>
          </button>
        );
      })}
      {!known && <p className="text-xs text-muted">Bấm Đồng bộ key để tắt lối mà key không mở được.</p>}
    </div>
  );
}

export function Choice({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={"min-tap rounded-[var(--radius-ctl)] border px-3 py-2 text-left " + (on ? "border-accent bg-accent text-ink" : "border-line bg-bg")}>
      <span className="block text-sm font-semibold">{title}</span>
      <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>{text}</span>
    </button>
  );
}

export function Select({ label, value, onChange, children, tip }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; tip?: ReactNode }) {
  return (
    <PickerSelect
      label={label}
      value={value}
      onChange={onChange}
      trigger={(open, current) => (
        <div className="grid gap-1 text-sm text-muted">
          <span className="flex items-center gap-2">
            {label}
            {tip ? <InfoTip label={"Giải thích: " + label}>{tip}</InfoTip> : null}
          </span>
          <button type="button" aria-haspopup="dialog" className={FIELD + " flex items-center justify-between gap-2 text-left"} onClick={open}>
            <span className="min-w-0 truncate">{current}</span>
            <span aria-hidden="true" className="text-muted">▾</span>
          </button>
        </div>
      )}
    >
      {children}
    </PickerSelect>
  );
}

export function FileTile({ icon, image, title, name, hint, accept, onFile }: { icon: ReactNode; image?: string | null; title: string; name?: string; hint: string; accept: string; onFile: (file: File | null) => void }) {
  return (
    <label
      className="relative grid min-tap cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--radius-ctl)] border border-dashed border-line bg-bg px-3 py-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files?.[0] || null);
      }}
    >
      {image ? <img src={image} alt="" className="h-9 w-16 rounded-[var(--radius-ctl)] object-cover" /> : <span className="text-accent">{icon}</span>}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block truncate text-xs text-muted">{name || hint}</span>
      </span>
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept={accept}
        onChange={(event) => {
          onFile(event.target.files?.[0] || null);
          event.currentTarget.blur();
          window.scrollTo(0, 0);
        }}
      />
    </label>
  );
}

export function ModelPicker({
  models,
  value,
  remote,
  usable,
  board,
  door,
  onChange,
}: {
  models: ChatModel[];
  value: string;
  remote: string[] | null;
  /** Model dịch dùng được theo mọi nhà (phòng hoặc key khách). null = chưa biết, không khóa. */
  usable: Set<string> | null;
  board: GroqBoard | null;
  door: { markup: number; custom: Record<string, { hour: number; inn: number; out: number }>; offered: string[] | null } | null;
  onChange: (id: string) => void;
}) {
  const remoteSet = remote ? new Set(remote) : null;
  const groups = ["standard", "preview", "enterprise", "safety", "key"] as const;
  return (
    <div className="grid gap-3">
      {groups.map((tier) => {
        const list = models.filter((model) => model.tier === tier);
        if (!list.length) return null;
        return (
          <div key={tier} className="grid gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{TIER_LABEL[tier]}</p>
            <div className="grid gap-2">
              {list.map((model) => {
                const on = value === model.id;
                const house = chatProviderOf(model);
                // Danh sách key Groq (và bảng Thuê phòng) chỉ nói về model Groq; nhà khác xét theo `usable`.
                const missing = (house === "groq" && remoteSet ? !remoteSet.has(model.id) : false) || (usable && !door ? !usable.has(model.id) : false);
                const held = Boolean(door && usable && !usable.has(model.id));
                const facts = held ? { price: "Chưa cập nhật", detail: "" } : modelFacts(board, door, model.id, model.note);
                return (
                  <button
                    key={model.id}
                    type="button"
                    disabled={held || missing}
                    aria-disabled={held || missing}
                    onClick={() => onChange(model.id)}
                    className={
                      "min-tap rounded-[var(--radius-ctl)] border px-3 py-2 text-left " +
                      (missing ? "cursor-not-allowed border-line bg-raised text-muted opacity-50 grayscale" : "disabled:opacity-60 " + (on ? "border-accent bg-accent text-ink" : "border-line bg-bg"))
                    }
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      <span>{model.name}</span>
                      {house !== "groq" && !missing && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium">{PROVIDER_LABEL[house]}</span>}
                      {missing && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium">{house === "groq" ? "Key chưa mở" : `Cần key ${PROVIDER_LABEL[house]}`}</span>}
                    </span>
                    {facts.price ? <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>{facts.price}</span> : null}
                    {facts.detail ? <span className={"block text-xs " + (on ? "text-ink/70" : "text-muted")}>{facts.detail}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <label className="grid gap-1 text-sm text-muted">
        Hoặc nhập mã model khác
        <input className={FIELD} value={value} spellCheck={false} autoCapitalize="off" onChange={(event) => onChange(event.target.value.trim())} />
      </label>
    </div>
  );
}

