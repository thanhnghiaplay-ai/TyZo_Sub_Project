import { useEffect, useState } from "react";
import { claimTrialDevice } from "@/lib/room-account";
import { roomAccess } from "@/lib/room-plans";
import { deviceId } from "@/lib/device-id";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AccountStrip() {
  const { user, isPending } = useCurrentUserState();
  const [text, setText] = useState<string | null>(null);

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
        if (!gone) setText(roomAccess({ plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft }).text);
      })
      .catch(() => {
        if (!gone) setText("Chưa đọc được hạn gói.");
      });
    return () => {
      gone = true;
    };
  }, [isPending, user]);

  if (isPending || !user || user.isDevFallback) return null;
  return <p className="text-xs text-muted">{text ?? "Đang xem hạn gói…"}</p>;
}
