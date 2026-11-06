import { useEffect, useState } from "react";
import { getRunDoor, type RunDoorView } from "@/lib/admin-room";
import { RUN_DESK_DEFAULT } from "@/lib/run-desk";

const CLOSED: RunDoorView = { open: false, note: RUN_DESK_DEFAULT.note, turbo: 0, large: 0 };

export function useRunDoor() {
  const [door, setDoor] = useState<RunDoorView>(CLOSED);
  useEffect(() => {
    void getRunDoor()
      .then(setDoor)
      .catch(() => setDoor(CLOSED));
  }, []);
  return door;
}

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function RunDoorClosed({ note }: { note: string }) {
  return (
    <section className="grid gap-1 rounded-xl border border-line bg-card p-3">
      <h2 className="text-sm font-semibold">Trả theo lượt</h2>
      <p className="text-sm text-muted">{note || RUN_DESK_DEFAULT.note}</p>
    </section>
  );
}

export function RunDoorPrices({ turbo, large }: { turbo: number; large: number }) {
  return (
    <p className="text-sm text-muted">
      Turbo {turbo > 0 ? dong(turbo) : "chưa niêm yết"} mỗi phút. Large {large > 0 ? dong(large) : "chưa niêm yết"} mỗi phút.
    </p>
  );
}
