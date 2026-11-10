import { useEffect, useState } from "react";
import { getRunDoor, type RunDoorView } from "@/lib/admin-room";
import type { PriceOverride } from "@/lib/run-desk";
import { withTimeout } from "@/lib/with-timeout";

export const DOOR_OPEN: RunDoorView = { open: true, note: "", markup: 0, custom: {}, offered: null };

const DOOR_WAIT_MS = 8_000;
const DOOR_RETRY_MS = 6_000;
const DOOR_RETRIES = 3;

/**
 * Đọc trạng thái cửa trả theo lượt. Máy chủ không trả lời trong hạn thì coi như cửa mở
 * để người dùng vẫn thấy hai lựa chọn, rồi thử đọc lại vài lần. Cửa đóng thật thì máy chủ
 * vẫn chặn ở lúc chạy (`room-groq`, `run-turn`), nên mặc định mở không làm lọt.
 */
export function useRunDoor() {
  const [door, setDoor] = useState<RunDoorView & { ready: boolean }>({ ...DOOR_OPEN, ready: false });
  useEffect(() => {
    let gone = false;
    let retry: number | undefined;
    function load(attempt: number) {
      withTimeout(getRunDoor(), DOOR_WAIT_MS, "Cửa trả theo lượt")
        .then((next) => {
          if (!gone) setDoor({ ...next, ready: true });
        })
        .catch(() => {
          if (gone) return;
          setDoor((current) => (current.ready ? current : { ...DOOR_OPEN, ready: true }));
          if (attempt < DOOR_RETRIES) retry = window.setTimeout(() => load(attempt + 1), DOOR_RETRY_MS);
        });
    }
    load(0);
    return () => {
      gone = true;
      if (retry !== undefined) window.clearTimeout(retry);
    };
  }, []);
  return door;
}

/** Chấm trạng thái cửa: xanh = mở, đỏ = đóng/bảo trì. */
export function DoorDot({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <span
      className={"door-dot " + (open ? "door-dot-open" : "door-dot-closed") + (className ? " " + className : "")}
      title={open ? "Cửa đang mở" : "Cửa đang đóng"}
      aria-label={open ? "Cửa đang mở" : "Cửa đang đóng"}
    />
  );
}

export function RunDoorClosed({ note }: { note: string }) {
  return (
    <section className="grid gap-1 rounded-xl border border-line bg-card p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <DoorDot open={false} />
        Trả theo lượt
      </h2>
      <p className="text-sm text-muted">{note}</p>
    </section>
  );
}

export function roomCustom(custom: Record<string, PriceOverride>, id: string): PriceOverride | undefined {
  return custom[id];
}
