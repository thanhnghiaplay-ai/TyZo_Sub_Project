import { TOOL_NAME } from "@/lib/customer-menu";
import { Icon } from "@/components/ui/icon";
import { usePipeline } from "@/components/use-pipeline";
import { linkAsrNote } from "@/lib/sub/link-asr-note";
import { type ProviderId } from "@/lib/sub/provider";
import { KeyRing } from "@/components/key-ring";
import { InfoTip } from "@/components/info-tip";
import { ModelPicker, Select, VoiceLanes } from "@/components/studio-parts";
import { ownModelPrice, modelFacts, roomAsrPrice } from "@/components/studio-price";
import type * as React from "react";
import type { ToolId } from "@/components/studio-tools";
import type { AsrPickRow } from "@/lib/asr-picker";

type PipelineApp = ReturnType<typeof usePipeline>;
const ASR_ROOM_TIP = "Thuê phòng chỉ chọn model Admin đã mở. Whisper cần key Groq của bạn. Filetrans cần key Alibaba của bạn. TyZo chỉ có ở Trả theo lượt. Dịch vẫn dùng model Groq đã mở.";
const ASR_PRICE_TIP = "Đơn giá là giá dịch vụ của phòng, đã gồm phần vận hành. Không dùng số này để so với tài khoản Groq riêng.";
const THREADS_TIP = "Nhiều luồng chạy nhanh hơn nhưng 6–8 luồng dễ chạm giới hạn của key (nhất là key miễn phí). App sẽ tự chờ rồi gửi lại, không mất đoạn đã nhận dạng.";

export type KeyPanelProps = {
  toolTab: ToolId;
  app: PipelineApp;
  runDoor: import("@/lib/admin/admin-runs").RunDoorView & { ready: boolean; };
  payByRoom: boolean;
  keyCheck: (id: import("@/lib/sub/provider").ProviderId) => import("@/components/key-ring").KeyCheck;
  lockTurnModels: boolean;
  showRoomPrice: boolean;
  online: boolean;
  ownVoice: { ids: Set<string> | null; known: boolean; };
  chatUsable: Set<string> | null;
  groqAllow: string[] | null;
  aliAllow: string[] | null;
  asrPick: AsrPickRow[];
};

/** Thẻ «key» của màn hình dịch (tách từ studio.tsx, đợt 5). */
export function KeyPanel(props: KeyPanelProps) {
  const { toolTab, app, runDoor, payByRoom, keyCheck, lockTurnModels, showRoomPrice, online, ownVoice, chatUsable, groqAllow, aliAllow, asrPick } = props;
  return (
    <section id="tool-key" role="region" aria-labelledby="tool-tab-key" hidden={toolTab !== "key"} className="grid gap-3 p-4">
      {app.running && (
        <p data-model-locked className="rounded-[var(--radius-ctl)] border border-line bg-card px-3 py-2 text-sm text-muted">
          Lượt đang chạy dùng model đã chọn lúc bấm chạy. Đổi model ở đây thì áp dụng cho lần dịch lại sau.
        </p>
      )}
      {runDoor.ready && runDoor.open && payByRoom && (
        <p className="rounded-[var(--radius-ctl)] border border-line bg-card px-3 py-2 text-sm text-muted">
          Đang trả theo lượt nên không cần dán key. Cách trả và ước tính Token ở bước cuối «{TOOL_NAME.run}».
        </p>
      )}
      {!(runDoor.open && payByRoom) && (
        <KeyRing
          values={{ ...app.houseKeys, groq: app.key }}
          check={keyCheck}
          onChange={(id, value) => (id === "groq" ? app.storeGroqKey(value) : app.setHouseKey(id, value))}
        />
      )}
      <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2">
        <summary className="min-tap cursor-pointer text-sm font-medium">Nâng cao: model và nhận dạng giọng</summary>
        <div className="grid gap-3 pt-2">
      {!lockTurnModels && (
      <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted">Cách dịch</span>
        {!showRoomPrice && (
          <button
            type="button"
            className="inline-flex min-tap items-center gap-1 rounded-full border border-line px-3 text-sm text-fg disabled:opacity-50"
            onClick={() => void app.refreshModels()}
            disabled={app.modelBusy || !online}
          >
            {app.modelBusy ? <Icon slot="ui.busy" className="size-4 animate-spin" /> : <Icon slot="act.retry" className="size-4" />}
            Đồng bộ key
          </button>
        )}
      </div>
      <VoiceLanes
        modelId={app.modelId}
        available={showRoomPrice ? (runDoor.offered ? new Set(runDoor.offered) : null) : ownVoice.ids}
        allowEnterprise={showRoomPrice ? true : app.allowEnterprise}
        known={showRoomPrice ? Boolean(runDoor.offered) : ownVoice.known}
        priceFor={(id) =>
          showRoomPrice
            ? modelFacts(app.board, runDoor, id, "").price
            : ownModelPrice(app.board, id)
        }
        onPick={(id) => app.chooseVoice(id)}
      />
      
      <div className="flex items-start gap-2">
        <details className="min-w-0 flex-1 text-sm text-muted">
        <summary className="cursor-pointer">Nhập mã model khác</summary>
        <div className="pt-2">
          <ModelPicker
            models={app.catalog}
            value={app.modelId}
            remote={showRoomPrice ? null : ownVoice.ids ? [...ownVoice.ids] : app.remoteIds}
            usable={chatUsable}
            board={showRoomPrice ? app.board : null}
            door={showRoomPrice ? runDoor : null}
            onChange={app.chooseVoice}
          />
        </div>
      </details>
        <InfoTip label="Về chọn model">Một lần dịch giữ một lối. Không trộn model nhỏ vào video đang dịch.</InfoTip>
      </div>
      <Select label="Nhận dạng giọng" tip={(groqAllow || aliAllow || showRoomPrice) ? <>{(groqAllow || aliAllow) ? ASR_ROOM_TIP : null}{showRoomPrice ? " " + ASR_PRICE_TIP : null}</> : undefined} value={app.asrModel} onChange={(value) => app.setAsrModel(value as typeof app.asrModel)}>
        {asrPick.map((row) => (
          <option key={row.id} value={row.id} disabled={row.disabled}>
            {row.name}
            {row.state === "room"
              ? ` · ${roomAsrPrice(app.board, runDoor, row.id)}`
              : row.state === "closed"
                  ? " · Admin chưa mở"
                  : row.state === "noKey"
                    ? " · key của bạn không có model này"
                    : ""}
          </option>
        ))}
      </Select>
      {linkAsrNote(app.asrModel) && <p className="text-sm text-muted">{linkAsrNote(app.asrModel)}</p>}
              </>
      )}
        </div>
      </details>
      <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2">
        <summary className="min-tap cursor-pointer text-sm font-medium">Tùy chọn nhận dạng (dùng cho cả hai cách trả)</summary>
        <div className="grid gap-3 pt-2">
          <p className="text-xs text-muted">Áp dụng cho cả Key của tôi và Trả theo lượt. Chọn model ở mục «Nâng cao: model và nhận dạng giọng» phía trên.</p>
      <div className="flex items-center gap-2">
        <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={app.speechVad} onChange={(event) => app.setSpeechVad(event.target.checked)} />
        Chỉ gửi đoạn có tiếng người
      </label>
        <InfoTip label="Giải thích: Chỉ gửi đoạn có tiếng người">Tắt thì chỉ bỏ đoạn im. Bật thì lần đầu tải thêm khoảng 15 MB, rồi cắt phần không phải lời ở đầu và cuối mỗi đoạn. Không tải được thì dùng lại mức năng lượng. Mỗi đoạn vẫn là một lần gửi.</InfoTip>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex min-tap items-center gap-2 text-sm">
        <input type="checkbox" checked={app.langCheck} onChange={(event) => app.setLangCheck(event.target.checked)} />
        Kiểm tra ngôn ngữ từng đoạn
      </label>
        <InfoTip label="Giải thích: Kiểm tra ngôn ngữ từng đoạn">Hợp video lẫn nhiều thứ tiếng. Đoạn có chữ lệch ngôn ngữ đã chọn hoặc độ tin thấp được nhận dạng lại một lần, không ép ngôn ngữ, và chỉ đổi khi kết quả tốt hơn rõ. Tốn thêm lượt nhận dạng, tối đa khoảng 2 phút âm thanh mỗi lần chạy (trả theo lượt thì trừ thêm Token dịch cho phần đó). Tắt thì chạy như cũ.</InfoTip>
      </div>
      <Select label="Số luồng nhận dạng" tip={THREADS_TIP} value={String(app.threads)} onChange={(value) => app.setThreads(Number(value))}>
        <option value="1">Ổn định · 1 luồng</option>
        <option value="3">Cân bằng · 3 luồng</option>
        <option value="4">Nhanh · 4 luồng</option>
        <option value="6">Mạnh · 6 luồng (hợp key trả phí)</option>
        <option value="8">Tối đa · 8 luồng (hợp key trả phí)</option>
      </Select>
        </div>
      </details>
    </section>
  );
}
