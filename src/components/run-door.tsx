import { useEffect, useState } from "react";
import { getRunDoor, type RunDoorView } from "@/lib/admin-room";
import type { PriceOverride } from "@/lib/run-desk";

export const DOOR_OPEN: RunDoorView = { open: true, note: "", markup: 0, custom: {} };

export function useRunDoor() {
  const [door, setDoor] = useState<RunDoorView>(DOOR_OPEN);
  useEffect(() => {
    void getRunDoor()
      .then(setDoor)
      .catch(() => setDoor(DOOR_OPEN));
  }, []);
  return door;
}

export function RunDoorClosed({ note }: { note: string }) {
  return (
    <section className="grid gap-1 rounded-xl border border-line bg-card p-3">
      <h2 className="text-sm font-semibold">Trả theo lượt</h2>
      <p className="text-sm text-muted">{note}</p>
    </section>
  );
}

export function roomCustom(custom: Record<string, PriceOverride>, id: string): PriceOverride | undefined {
  return custom[id];
}
