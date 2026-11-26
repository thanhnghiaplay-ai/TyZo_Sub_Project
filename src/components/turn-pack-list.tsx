import { useEffect, useState, type RefObject } from "react";
import { getServiceMenu } from "@/lib/packs/pack-room";
import { PACK_ROLE_LABEL, PACK_ROLES, type ServicePack } from "@/lib/service-pack";
import { PROVIDER_LABEL } from "@/lib/sub/provider";
import { customerVisiblePrice, turnPacks } from "@/lib/turn-pack";
import { quoteTurnPacks, type TurnPrice } from "@/lib/turn-quote";

/** Gói Chủ đã mở cho cửa trả theo lượt. Giá theo Token dịch, từ giá gốc. */
export function TurnPackList({
  videoRef,
  fileSeconds = 0,
  narration,
  onLocked,
  onPick,
  running = false,
}: {
  /** Lượt đang chạy: câu giá nói đã giữ, không nói «giữ trước khi chạy». */
  running?: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Thời lượng đọc từ tệp, cùng nguồn với thẻ Token phía trên. */
  fileSeconds?: number;
  narration: boolean;
  onLocked: (locked: boolean) => void;
  onPick: (pack: ServicePack) => void;
}) {
  const [packs, setPacks] = useState<ServicePack[]>([]);
  const [prices, setPrices] = useState<Record<string, TurnPrice>>({});
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const fromFile = Number.isFinite(fileSeconds) && fileSeconds > 0 ? Math.round(fileSeconds) : 0;
  const seconds = fromFile > 0 ? fromFile : liveSeconds;

  useEffect(() => {
    void getServiceMenu()
      .then((menu) => setPacks(turnPacks(menu.packs)))
      .catch(() => setPacks([]))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) onLocked(packs.length > 0);
  }, [ready, packs.length, onLocked]);

  useEffect(() => {
    const read = () => {
      const video = videoRef.current;
      const next = video && Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
      setLiveSeconds((current) => (current === next ? current : next));
    };
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, [videoRef]);

  useEffect(() => {
    if (!ready || seconds < 1 || !packs.length) return;
    let stop = false;
    void quoteTurnPacks({ data: { seconds, narration } })
      .then((rows) => {
        if (stop) return;
        const next: Record<string, TurnPrice> = {};
        for (const row of rows) next[row.id] = row;
        setPrices(next);
      })
      .catch(() => {
        if (!stop) setPrices({});
      });
    return () => {
      stop = true;
    };
  }, [ready, seconds, narration, packs.length]);

  if (!ready) return <p className="text-sm text-muted">Đang đọc gói trả theo lượt…</p>;
  if (!packs.length) return <p className="text-sm text-muted">Admin chưa mở gói. Cửa này vẫn nhận dạng bằng Whisper như trước.</p>;

  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-semibold">Gói trả theo lượt</h2>
      <p className="text-sm text-muted">
        {seconds > 0 ? "Số giây đã gồm phần vận hành của phòng. Bạn không thấy giá gốc." : "Chọn tệp để thấy số giây sẽ giữ. Bạn không thấy giá gốc."}
        {" "}Orpheus, nếu bật, trừ Token dịch. Neural không trừ. Nhận dạng Alibaba cần link file trực tiếp. Việc Alibaba khác chưa chạy.
      </p>
      {packs.map((pack) => {
        const jobs = PACK_ROLES.filter((role) => pack.roles[role]).map((role) => {
          const assign = pack.roles[role]!;
          return `${PACK_ROLE_LABEL[role]}: ${PROVIDER_LABEL[assign.provider]}`;
        });
        const price = prices[pack.id];
        const on = picked === pack.id;
        return (
          <button
            key={pack.id}
            type="button"
            className={"grid gap-1 rounded-[var(--radius-ctl)] border px-3 py-2 text-left " + (on ? "border-accent bg-accent/10" : "border-line")}
            onClick={() => {
              setPicked(pack.id);
              onPick(pack);
            }}
          >
            <span className="text-sm font-semibold">{pack.name}</span>
            {pack.note && <span className="text-sm text-muted">{pack.note}</span>}
            <span className="text-xs text-muted">{jobs.join(" · ")}</span>
            <span className="text-sm">{seconds > 0 ? customerVisiblePrice(price?.total ?? null, price?.hold ?? 0, running, { asr: price?.asrHold, chat: price?.chatHold }) : "Chưa có tệp"}</span>
          </button>
        );
      })}
    </div>
  );
}
