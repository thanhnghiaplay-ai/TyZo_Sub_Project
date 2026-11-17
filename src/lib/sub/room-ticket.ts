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

const OPEN_KEY = "tyzo-open-ticket";

/** Nhớ phiếu đang chạy. Nếu tab bị trình duyệt dọn hoặc tải lại, lần mở sau nhả phần Token còn giữ. */
export function rememberTicket(id: string | null) {
  if (!id) return;
  try {
    localStorage.setItem(OPEN_KEY, id);
  } catch {
    /* không lưu được thì phiếu tự nhả sau 6 giờ */
  }
}

export function forgetTicket(id: string | null) {
  if (!id) return;
  try {
    if (localStorage.getItem(OPEN_KEY) === id) localStorage.removeItem(OPEN_KEY);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Phiếu còn sót từ lần chạy bị ngắt (tab bị dọn, tải lại trang): đóng ngay để trả Token chưa dùng.
 * Phần đã trừ theo tiến độ vẫn giữ đúng. Trả true nếu có phiếu sót được đóng.
 */
export async function recoverOrphanTicket(): Promise<boolean> {
  let id: string | null = null;
  try {
    id = localStorage.getItem(OPEN_KEY);
    if (id) localStorage.removeItem(OPEN_KEY);
  } catch {
    return false;
  }
  if (!id) return false;
  await closeRoomTicket(id, false);
  return true;
}
