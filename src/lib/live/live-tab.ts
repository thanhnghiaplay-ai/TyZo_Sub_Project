import { openBrowserGraph } from "./live-mic-browser.ts";
import type { CaptureEnv } from "./live-mic.ts";

type TrackLite = { stop(): void };
export type DisplayStreamLike = { getAudioTracks(): TrackLite[]; getVideoTracks(): TrackLite[]; getTracks(): TrackLite[] };
export type NavLike = { userAgent?: string; maxTouchPoints?: number; mediaDevices?: { getDisplayMedia?: unknown } };

/** Máy có thu được âm thanh của tab không. Điện thoại và máy tính bảng không có, dù trình duyệt đôi khi khai có hàm. */
export function canCaptureTab(nav: NavLike | undefined): boolean {
  if (!nav || typeof nav.mediaDevices?.getDisplayMedia !== "function") return false;
  const agent = nav.userAgent ?? "";
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(agent)) return false;
  if (/Macintosh/i.test(agent) && (nav.maxTouchPoints ?? 0) > 1) return false;
  return true;
}

/** Câu báo lỗi khi chia sẻ tab. */
export function tabErrorMessage(error: unknown): string {
  const name = typeof error === "object" && error && "name" in error ? String((error as { name: unknown }).name) : "";
  switch (name) {
    case "NoTabAudio":
      return "Tab đã chọn chưa có âm thanh được chia sẻ. Hãy chọn lại, chọn tab trình duyệt và bật mục chia sẻ âm thanh của tab.";
    case "NotAllowedError":
    case "SecurityError":
      return "Bạn đã hủy chọn tab hoặc trình duyệt chặn chia sẻ. Hãy thử lại và bấm Chia sẻ.";
    case "NotFoundError":
    case "NotSupportedError":
      return "Trình duyệt này không thu được âm thanh của tab. Hãy dùng Chrome hoặc Edge trên máy tính, hoặc dùng micro.";
    case "NotReadableError":
    case "AbortError":
      return "Không mở được tab để thu âm. Hãy thử lại.";
    default:
      return "Chưa thu được âm thanh của tab. Hãy thử lại.";
  }
}

/**
 * Chỉ giữ phần âm thanh của luồng chia sẻ màn hình. Trình duyệt bắt buộc xin cả hình, nên phải tắt hình ngay.
 * Không có đường tiếng nào (khách quên bật chia sẻ âm thanh) thì hình đã tắt, chỉ còn báo lỗi riêng.
 */
export function audioOnly<T>(stream: DisplayStreamLike, make: (tracks: TrackLite[]) => T): T {
  const audio = stream.getAudioTracks();
  stream.getVideoTracks().forEach((track) => track.stop());
  if (audio.length === 0) {
    throw Object.assign(new Error("Chưa chia sẻ âm thanh."), { name: "NoTabAudio" });
  }
  return make(audio);
}

/** Thu âm thanh của tab trình duyệt (Chrome, Edge trên máy tính). */
export function tabEnv(): CaptureEnv {
  return {
    getStream: async () => {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      return audioOnly(stream, (tracks) => new MediaStream(tracks as MediaStreamTrack[]));
    },
    openGraph: openBrowserGraph,
  };
}
