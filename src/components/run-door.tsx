import { useEffect, useState } from "react";
import { getRunDoor, type RunDoorView } from "@/lib/admin-room";
import type { PriceOverride } from "@/lib/run-desk";

export const DOOR_OPEN: RunDoorView = { open: true, note: "", markup: 0, custom: {}, offered: null };

export function useRunDoor() {
  const [door, setDoor] = useState<RunDoorView & { ready: boolean }>({ ...DOOR_OPEN, ready: false });
  useEffect(() => {
    void getRunDoor()
      .then((next) => setDoor({ ...next, ready: true }))
      .catch(() => setDoor({ ...DOOR_OPEN, ready: true }));
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
