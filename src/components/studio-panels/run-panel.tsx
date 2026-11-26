import { usePipeline } from "@/components/use-pipeline";
import { TurnPackList } from "@/components/turn-pack-list";
import { turnPackModels } from "@/lib/turn-pack";
import { type PayChoice } from "@/lib/payment/pay-status";
import { InfoTip } from "@/components/info-tip";
import type * as React from "react";
import type { ToolId } from "@/components/studio-tools";

type PipelineApp = ReturnType<typeof usePipeline>;
const KEY_MODE_TIP = "Dùng các key bạn đã nhập (Groq, Alibaba, tùy nhà bạn có key). Nhà cung cấp tính tiền cho bạn, phòng không trừ Token dịch cho lượt chạy.";
const TURN_MODE_TIP = "Dùng key của phòng, bạn không nhập key. Phòng giữ số Token dịch ước tính từ gói đã mua, trừ số thực khi xong và trả phần thừa nếu gói còn hạn.";

export type RunPanelProps = {
  toolTab: ToolId;
  runDoor: import("@/lib/admin/admin-runs").RunDoorView & { ready: boolean; };
  payByRoom: boolean;
  choosePay: (choice: import("@/lib/payment/pay-status").PayChoice | null, remember: boolean) => void;
  app: PipelineApp;
  thumb: import("@/components/file-thumb").FileThumb;
  narration: import("@/lib/sub/types").NarrationSettings;
  setTurnLocked: React.Dispatch<React.SetStateAction<boolean>>;
};

/** Thẻ «run» của màn hình dịch (tách từ studio.tsx, đợt 5). */
export function RunPanel(props: RunPanelProps) {
  const { toolTab, runDoor, payByRoom, choosePay, app, thumb, narration, setTurnLocked } = props;
  return (
    <section id="tool-run" role="region" aria-labelledby="tool-tab-run" hidden={toolTab !== "run"} className="grid gap-3 p-4">
      <p className="text-sm text-muted">Bước cuối. Chọn cách trả và xem ước tính Token, rồi bấm Tải và dịch ở thanh trên.</p>
      {runDoor.ready && runDoor.open && (
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold">Cách trả</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" title={KEY_MODE_TIP} aria-describedby="pay-mode-note" className={"min-tap rounded-[var(--radius-ctl)] text-sm font-semibold " + (!payByRoom ? "bg-accent text-ink" : "border border-line")} onClick={() => choosePay("key", true)}>
              Key của tôi
            </button>
            <button type="button" title={TURN_MODE_TIP} aria-describedby="pay-mode-note" className={"min-tap rounded-[var(--radius-ctl)] text-sm font-semibold " + (payByRoom ? "bg-accent text-ink" : "border border-line")} onClick={() => choosePay("turn", true)}>
              Trả theo lượt
            </button>
          </div>
          <p id="pay-mode-note" className="flex items-center gap-2 rounded-[var(--radius-ctl)] border border-line bg-card px-3 py-2 text-sm text-muted">
            <strong className="text-fg">{payByRoom ? "Đang chọn: Trả theo lượt." : "Đang chọn: Key của tôi."}</strong>
            <InfoTip label="Giải thích cách trả">
              {payByRoom ? <>{TURN_MODE_TIP} Số giây từng gói bên dưới là ước tính; số trừ thật là số thực khi xong.</> : KEY_MODE_TIP}
            </InfoTip>
          </p>
          {payByRoom && (
            <TurnPackList
              running={app.running}
              videoRef={app.videoRef}
              fileSeconds={thumb.seconds ?? app.videoRef.current?.duration ?? 0}
              narration={narration.enabled}
              onLocked={setTurnLocked}
              onPick={(pack) => {
                const next = turnPackModels(pack);
                if (next.asr) app.setAsrModel(next.asr);
                if (next.chat) app.chooseVoice(next.chat);
              }}
            />
          )}
        </div>
      )}
      <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line" onClick={app.reset}>
        Làm lại
      </button>
    </section>
  );
}
