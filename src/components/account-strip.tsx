import { useEffect, useState } from "react";
import { claimTrialDevice } from "@/lib/room-account";
import { payTurnNotice, roomAccess } from "@/lib/room-plans";
import { deviceId } from "@/lib/device-id";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AccountStrip({ payByRoom = false }: { payByRoom?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [text, setText] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function onRefresh() {
      setTick((value) => value + 1);
    }
    window.addEventListener("tyzo-room-refresh", onRefresh);
    return () => window.removeEventListener("tyzo-room-refresh", onRefresh);
  }, []);

  useEffect(() => {
    if (isPending || !user || user.isDevFallback) return;
    let gone = false;
    const id = deviceId();
    if (!id) {
      setText("Trình duyệt không cho lưu máy này, không mở được lượt thử.");
      return;
    }
    void claimTrialDevice({ data: id })
      .then((state) => {
        if (!gone) {
          const input = { plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft };
          setText(payByRoom ? payTurnNotice(input) : roomAccess(input).text);
        }
      })
      .catch(() => {
        if (!gone) setText("Chưa đọc được hạn gói.");
      });
    return () => {
      gone = true;
    };
  }, [isPending, payByRoom, user, tick]);

  if (isPending || !user || user.isDevFallback) return null;
  return <p className="text-xs text-muted">{text ?? "Đang xem hạn gói…"}</p>;
}
