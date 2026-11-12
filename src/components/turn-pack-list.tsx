import { useEffect, useState } from "react";
import { getServiceMenu } from "@/lib/pack-room";
import { PACK_ROLE_LABEL, PACK_ROLES, type ServicePack } from "@/lib/service-pack";
import { PROVIDER_LABEL } from "@/lib/sub/provider";
import { turnPacks } from "@/lib/turn-pack";

/** Gói Chủ đã mở cho cửa trả theo lượt. Không hiện giá gốc. */
export function TurnPackList({
  onLocked,
  onPick,
}: {
  onLocked: (locked: boolean) => void;
  onPick: (pack: ServicePack) => void;
}) {
  const [packs, setPacks] = useState<ServicePack[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getServiceMenu()
      .then((menu) => setPacks(turnPacks(menu.packs)))
      .catch(() => setPacks([]))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) onLocked(packs.length > 0);
  }, [ready, packs.length, onLocked]);

  if (!ready) return <p className="text-sm text-muted">Đang đọc gói trả theo lượt…</p>;
  if (!packs.length) return <p className="text-sm text-muted">Chủ chưa mở gói. Cửa này vẫn nhận dạng bằng Whisper như trước.</p>;

  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-semibold">Gói trả theo lượt</h2>
      <p className="text-sm text-muted">Chọn một gói. Model nhận dạng và model dịch theo gói. Giá từng gói chưa hiện ở bước này. Gói có việc Alibaba chưa chạy.</p>
      {packs.map((pack) => {
        const jobs = PACK_ROLES.filter((role) => pack.roles[role]).map((role) => {
          const assign = pack.roles[role]!;
          return `${PACK_ROLE_LABEL[role]}: ${PROVIDER_LABEL[assign.provider]}`;
        });
        const on = picked === pack.id;
        return (
          <button
            key={pack.id}
            type="button"
            className={"grid gap-1 rounded-xl border px-3 py-2 text-left " + (on ? "border-accent bg-accent/10" : "border-line")}
            onClick={() => {
              setPicked(pack.id);
              onPick(pack);
            }}
          >
            <span className="text-sm font-semibold">{pack.name}</span>
            {pack.note && <span className="text-sm text-muted">{pack.note}</span>}
            <span className="text-xs text-muted">{jobs.join(" · ")}</span>
          </button>
        );
      })}
    </div>
  );
}
