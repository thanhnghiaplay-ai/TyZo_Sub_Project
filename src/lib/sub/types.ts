export type Seg = {
  start: number;
  end: number;
  original: string;
  /** Chữ Whisper nhận ra, chưa qua sửa tên của bước phân tích phim. Không có (bản lưu cũ) thì dùng original. */
  raw?: string;
  translation: string | null;
  /** Model không trả câu này sau khi đã thử lại riêng. UI phải hiện lỗi, không hiện câu gốc như bản dịch. */
  translationFailed?: boolean;
  busy?: boolean;
  model?: string;
  /** Cao độ đo được, Hz. Dùng để so các câu trong cùng video. */
  pitchHz?: number;
  /** Nam hoặc nữ sau khi so với các câu khác. Không có thì dùng giọng dự phòng. */
  voice?: "female" | "male";
  /** Người dùng khóa nam hoặc nữ cho đúng câu này. */
  voiceLock?: "female" | "male";
  /** Người dùng đã sửa tay. Đổi model hoặc ngôn ngữ đích không xóa câu này. */
  edited?: boolean;
  /** Bản dịch cũ so với model hoặc ngôn ngữ đích hiện tại, cần dịch lại. Câu đã sửa tay (edited) không bị coi là cũ. */
  stale?: boolean;
};

export type ChatTier = "standard" | "preview" | "enterprise" | "safety" | "key";

export type ChatModel = {
  id: string;
  name: string;
  tier: ChatTier;
  speed: number;
  quality: number;
  asian: number;
  price: string;
  note: string;
};

export type AutoProfile = "fast" | "balanced" | "accurate";
export type ModelMode = "manual" | "auto";

export type AsrModel = "whisper-large-v3-turbo" | "whisper-large-v3" | "qwen-audio-3.0-asr-flash-filetrans";

export const ASR_PRICE: Record<AsrModel, number> = {
  "whisper-large-v3-turbo": 0.04 / 3600,
  "whisper-large-v3": 0.111 / 3600,
  "qwen-audio-3.0-asr-flash-filetrans": 0.000035,
};

export type NarrationSettings = {
  enabled: boolean;
  engine: "browser" | "orpheus" | "edge";
  rate: number;
  pitch: number;
  volume: number;
  gender: "female" | "male" | "any";
  /** true: câu đo được nam/nữ từ tiếng phim thì đổi giọng; câu không đo được giữ giọng đã chọn */
  matchCast: boolean;
  voiceURI: string;
  orpheusVoice: string;
  duck: boolean;
  muteVideo: boolean;
  /** Giây lệch lúc đọc. Âm là đọc trước, dương là đọc sau, 0 là đúng lúc câu hiện. */
  lead: number;
  followPlayback: boolean;
  skipCues: boolean;
};

export const NARRATION_DEFAULT: NarrationSettings = {
  enabled: true,
  engine: "edge",
  rate: 1,
  pitch: 1,
  volume: 1,
  gender: "female",
  matchCast: true,
  voiceURI: "",
  orpheusVoice: "hannah",
  duck: true,
  muteVideo: false,
  lead: 0,
  followPlayback: true,
  skipCues: true,
};
