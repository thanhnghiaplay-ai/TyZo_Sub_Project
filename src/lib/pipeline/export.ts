/**
 * BƯỚC CUỐI: xuất phụ đề ra tệp (SRT, VTT, TXT, bản nhận dạng gốc).
 * Chỉ người đã đăng nhập, không bị khóa, còn hạn dùng hoặc lượt thử mới được xuất.
 */
import { getMyPlace } from "@/lib/admin/admin-room";
import { authClient } from "@/lib/auth/client";
import { deviceId } from "@/lib/device-id";
import { claimTrialDevice } from "@/lib/room-account";
import { exportNotice } from "@/lib/room-plans";
import { standingBlock } from "@/lib/staff-role";
import { toRawSrt, toSrt, toTxt, toVtt } from "@/lib/sub/text";
import type { Seg } from "@/lib/sub/types";

export type SubFormat = "srt" | "vtt" | "txt" | "raw";

/** Câu báo vì sao chưa được xuất; null = được xuất. `what` là thứ định xuất, để ghi vào câu báo. */
export async function exportProblem(what: string): Promise<string | null> {
  const session = await authClient.getSession().catch(() => null);
  if (!session?.data?.user) return `Chưa đăng nhập. Hãy đăng ký hoặc đăng nhập rồi mới xuất ${what}.`;
  const id = deviceId();
  if (!id) return "Trình duyệt không cho lưu máy này, không mở được lượt thử.";
  try {
    const place = await getMyPlace();
    const blocked = standingBlock(place.status, place.reason);
    if (blocked) return blocked;
    const state = await claimTrialDevice({ data: id });
    const notice = exportNotice({ plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft, units: state.units });
    if (notice) return notice;
  } catch {
    return "Chưa đọc được tài khoản. Hãy đăng nhập lại.";
  }
  return null;
}

/** Chữ của tệp phụ đề và đuôi tệp. */
export function subtitleFile(segs: Seg[], format: SubFormat): { text: string; suffix: string } {
  if (format === "raw") return { text: toRawSrt(segs), suffix: ".whisper.srt" };
  return { text: format === "vtt" ? toVtt(segs) : format === "txt" ? toTxt(segs) : toSrt(segs), suffix: "." + format };
}

/** Tải chữ về máy khách, tên tệp theo tên video (bỏ đuôi). */
export function downloadText(text: string, videoName: string | undefined, suffix: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = ((videoName || "phu-de").replace(/\.[^.]+$/, "") || "phu-de") + suffix;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
