import { closeRunTicket, openRunTicket, type RunTicketOpen } from "@/lib/run-turn";

/** Phiếu của lần chạy đang phát, chỉ để lời đọc gắn đúng phiếu khi hàm gọi không chỉ định. */
let playback: string | null = null;

export function roomTicketId() {
  return playback;
}

/** Giữ phiếu cho lời đọc. Chỉ bỏ khi vẫn là phiếu này, không đè phiếu của lần chạy khác. */
export function claimPlayback(id: string) {
  playback = id;
  return () => {
    if (playback === id) playback = null;
  };
}

export async function openRoomTicket(input: {
  fileName: string;
  seconds: number;
  asrModel: string;
  chatModel: string;
  packId?: string;
  narration?: boolean;
}): Promise<RunTicketOpen> {
  return openRunTicket({ data: input });
}

/** Đóng đúng phiếu đã mở: trừ số thật, nhả phần giữ thừa. Không bao giờ ném lỗi. */
export async function closeRoomTicket(id: string | null, failed: boolean) {
  if (!id) return;
  try {
    await closeRunTicket({ data: { id, failed } });
  } catch {
    /* phiếu giữ quá 6 giờ sẽ tự nhả */
  }
}
