export type Seg = {
  start: number;
  end: number;
  original: string;
  /** Chữ Whisper nhận ra, chưa qua sửa tên của bước phân tích nội dung. Không có (bản lưu cũ) thì dùng original. */
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
  /** Khoảng thật sự có từ, theo đồng hồ video. Thuyết minh không đọc ngoài các khoảng này. */
  talk?: Array<[number, number]>;
  /** Bản dịch cũ so với model hoặc ngôn ngữ đích hiện tại, cần dịch lại. Câu đã sửa tay (edited) không bị coi là cũ. */
  stale?: boolean;
};

type ChatTier = "standard" | "preview" | "enterprise" | "safety" | "key";

export type ChatModel = {
  id: string;
  name: string;
  tier: ChatTier;
  speed: number;
  quality: number;
  asian: number;
  price: string;
  note: string;
  /** Nhà chạy model này. Thiếu = Groq (danh mục gốc). */
  provider?: import("./provider.ts").ProviderId;
};

export type AutoProfile = "fast" | "balanced" | "accurate";
export type ModelMode = "manual" | "auto";

export type AsrModel =
  | "tyzo-modal-nhanh" | "tyzo-modal-ky"
  | "whisper-large-v3-turbo"
  | "whisper-large-v3"
  | "qwen-audio-3.0-asr-flash-filetrans"
  | "deepgram-nova-3"
  | "assemblyai-universal-3-5-pro"
  | "assemblyai-universal-2"
  | "speechmatics-standard"
  | "speechmatics-enhanced"
  | "soniox-stt-async"
  | "elevenlabs-scribe-v3"
  | "elevenlabs-scribe-v2";

export const ASR_PRICE: Record<AsrModel, number> = {
  "tyzo-modal-nhanh": 0, "tyzo-modal-ky": 0,
  "whisper-large-v3-turbo": 0.04 / 3600,
  "whisper-large-v3": 0.111 / 3600,
  "qwen-audio-3.0-asr-flash-filetrans": 0.000035,
  /** 0,0043 đô/phút (Nova-3, trả theo lượt, nói một ngôn ngữ). Giá dự phòng, cần đối chiếu trang giá Deepgram. */
  "deepgram-nova-3": 0.0043 / 60,
  /** Khoảng 0,21 đô/giờ (Universal-3.5 Pro) và 0,15 đô/giờ (Universal-2), theo tài liệu AssemblyAI tra 18/11/2026. Giá dự phòng, cần đối chiếu trang giá chính thức ở bước 6. */
  "assemblyai-universal-3-5-pro": 0.21 / 3600,
  "assemblyai-universal-2": 0.15 / 3600,
  /** Trả theo dùng, xử lý cả file: Standard 0,45 và Enhanced 0,75 đô/giờ, tra trang giá Speechmatics 18/11/2026. Giá dự phòng. */
  "speechmatics-standard": 0.45 / 3600,
  "speechmatics-enhanced": 0.75 / 3600,
  /** Khoảng 0,10 đô/giờ (async), theo ghi chú bước 1 docs/lich-su/HANDOFF_2026-11.md 18/11/2026. Giá dự phòng, cần đối chiếu trang giá Soniox ở bước 6. */
  "soniox-stt-async": 0.1 / 3600,
  /** Scribe v3 và v2 đều 0,20 đô/giờ, trang giá ElevenLabs đọc 21/11/2026. Giá dự phòng, Admin sửa tay được. */
  "elevenlabs-scribe-v3": 0.2 / 3600,
  "elevenlabs-scribe-v2": 0.2 / 3600,
};

export type NarrationSettings = {
  enabled: boolean;
  engine: "browser" | "orpheus" | "edge" | "aura" | "elevenlabs";
  rate: number;
  pitch: number;
  volume: number;
  gender: "female" | "male" | "any";
  /** true: câu đo được nam/nữ từ tiếng phim thì đổi giọng; câu không đo được giữ giọng đã chọn */
  matchCast: boolean;
  voiceURI: string;
  orpheusVoice: string;
  /** Giọng Deepgram Aura-2 (thalia, apollo, celeste...). Trừ Token dịch qua cửa của phòng. */
  auraVoice: string;
  /** Mã giọng ElevenLabs (đọc từ danh sách giọng của key). Rỗng = giọng đầu hợp giới. */
  elevenVoice: string;
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
  auraVoice: "thalia",
  elevenVoice: "",
  duck: true,
  muteVideo: false,
  lead: 0,
  followPlayback: true,
  skipCues: true,
};
