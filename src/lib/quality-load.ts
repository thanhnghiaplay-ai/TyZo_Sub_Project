import { DEFAULT_QUALITY_THRESHOLDS, type QualityThresholds } from "@/lib/sub/quality";

let cached: Promise<QualityThresholds> | null = null;

/** Trình duyệt đọc ngưỡng một lần mỗi phiên. Lỗi mạng thì dùng mặc định, không chặn lần dịch. */
export function loadQualityThresholds(): Promise<QualityThresholds> {
  if (!cached) {
    cached = import("@/lib/quality-room")
      .then((mod) => mod.getQualityThresholds())
      .catch(() => {
        cached = null;
        return { ...DEFAULT_QUALITY_THRESHOLDS };
      });
  }
  return cached;
}

/** Sau khi Chủ lưu ngưỡng mới thì bỏ bản nhớ để lần sau đọc lại. */
export function forgetQualityThresholds() {
  cached = null;
}
