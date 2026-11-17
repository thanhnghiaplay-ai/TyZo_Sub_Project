/**
 * BẢNG NHÀ CUNG CẤP. Thêm nhà mới = thêm một dòng vào PROVIDERS và làm theo PROVIDERS.md.
 * Mọi chỗ cần nhãn, địa chỉ, kiểu gửi key, khả năng đều đọc từ đây, không chép tay.
 */
export type ProviderId = "groq" | "alibaba" | "deepgram";

/** asr: nhận dạng giọng · chat: dịch bằng mô hình ngôn ngữ · tts: đọc thành tiếng · live: dịch trực tiếp */
export type ProviderCap = "asr" | "chat" | "tts" | "live";

/** bearer: `Authorization: Bearer KEY` (kiểu OpenAI). token: `Authorization: Token KEY` (Deepgram). */
export type ProviderAuth = "bearer" | "token";

/**
 * Cách app đưa âm thanh cho nhà nhận dạng (chỉ nói về cách app đang dùng, không phải mọi khả năng của nhà):
 * chunks: cắt đoạn ở trình duyệt rồi gửi từng đoạn · link: gửi link công khai tới file ·
 * upload: tải cả file lên · stream: gửi luồng liên tục.
 */
export type ProviderIntake = "chunks" | "link" | "upload" | "stream";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  api: string;
  auth: ProviderAuth;
  caps: ProviderCap[];
  /** Cách nhận âm thanh khi nhận dạng. Nhà không có khả năng asr vẫn phải khai (dùng "chunks"). */
  intake: ProviderIntake;
  /** Trang khách lấy key. */
  keyPage: string;
  /** Tên khóa trong kho trình duyệt của khách, nơi key khách nhập được lưu (chỉ trên máy khách, không lên máy chủ). */
  clientStore: string;
  /** Đầu key mẫu hiện trong ô nhập của khách (không bắt buộc). */
  keyHint?: string;
  /** Tên dòng trong room_settings. */
  settings: { key: string; models: string; desk: string };
};

export const GROQ_API = "https://api.groq.com/openai/v1";
export const ALIBABA_API = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
export const DEEPGRAM_API = "https://api.deepgram.com/v1";

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  groq: {
    id: "groq",
    label: "Groq",
    api: GROQ_API,
    auth: "bearer",
    caps: ["asr", "chat", "tts"],
    intake: "chunks",
    keyPage: "console.groq.com/keys",
    clientStore: "gk",
    keyHint: "gsk_…",
    // Groq giữ tên dòng cũ: key lưu ở run_key (admin-room.ts, room-groq.ts, overview-data.ts đều đọc dòng này).
    settings: { key: "run_key", models: "run_models", desk: "run_desk" },
  },
  alibaba: {
    id: "alibaba",
    label: "Alibaba",
    api: ALIBABA_API,
    auth: "bearer",
    caps: ["asr", "live"],
    intake: "link",
    keyPage: "bailian.console.alibabacloud.com",
    clientStore: "gali",
    keyHint: "sk-…",
    settings: { key: "alibaba_key", models: "alibaba_models", desk: "alibaba_desk" },
  },
  deepgram: {
    id: "deepgram",
    label: "Deepgram",
    api: DEEPGRAM_API,
    auth: "token",
    caps: ["asr", "tts"],
    // Deepgram nhận được cả link, file và luồng; app hiện chỉ dùng link công khai (gửi file từ máy chưa làm).
    intake: "link",
    keyPage: "console.deepgram.com",
    clientStore: "gdg",
    settings: { key: "deepgram_key", models: "deepgram_models", desk: "deepgram_desk" },
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export const PROVIDER_LABEL: Record<ProviderId, string> = Object.fromEntries(
  PROVIDER_IDS.map((id) => [id, PROVIDERS[id].label]),
) as Record<ProviderId, string>;

export function providerApi(id: ProviderId) {
  return PROVIDERS[id].api;
}

export function modelListUrl(id: ProviderId) {
  return `${providerApi(id)}/models`;
}

export function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

/** Giá trị cho phần đầu Authorization theo kiểu của từng nhà. */
export function authHeader(id: ProviderId, key: string): string {
  return PROVIDERS[id].auth === "token" ? `Token ${key}` : `Bearer ${key}`;
}

export function providerHas(id: ProviderId, cap: ProviderCap): boolean {
  return PROVIDERS[id].caps.includes(cap);
}

const CAP_LABEL: Record<ProviderCap, string> = {
  asr: "nhận dạng giọng",
  chat: "dịch bằng mô hình",
  tts: "đọc thành tiếng",
  live: "dịch trực tiếp",
};

/**
 * Ghi chú dưới ô key phòng ở Admin, sinh từ khả năng của nhà (không viết tay từng nhà).
 * Nhà không có khả năng dịch bằng mô hình thì nhắc dịch vẫn do nhà nào làm.
 */
export function providerKeyNote(id: ProviderId): string {
  const info = PROVIDERS[id];
  const does = info.caps.map((cap) => CAP_LABEL[cap]).join(", ");
  const chatHouse = PROVIDER_IDS.find((other) => other !== id && PROVIDERS[other].caps.includes("chat"));
  const translate = !info.caps.includes("chat") && chatHouse ? ` Dịch vẫn bằng ${PROVIDERS[chatHouse].label}.` : "";
  return `Chỉ Chủ lưu. Khách không thấy key. ${info.label} làm: ${does}.${translate} Key này chạy cửa Trả theo lượt (phòng trả tiền, trừ Token dịch theo giá gốc). Cửa Thuê phòng dùng key của khách.`;
}

/** Đọc danh sách mã model từ phản hồi `/models` của từng nhà (mỗi nhà một dạng). */
export function modelIdsFrom(id: ProviderId, payload: unknown): string[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  if (id === "deepgram") {
    const out: string[] = [];
    for (const group of ["stt", "tts"] as const) {
      const rows = Array.isArray(root[group]) ? (root[group] as unknown[]) : [];
      for (const row of rows) {
        const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
        const name = typeof item.canonical_name === "string" ? item.canonical_name : typeof item.name === "string" ? item.name : "";
        if (name && !out.includes(name)) out.push(name);
      }
    }
    return out;
  }
  const rows = Array.isArray(root.data) ? (root.data as unknown[]) : [];
  return rows
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).id : undefined))
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

/** Chữ mẫu trong ô nhập key của khách, đọc từ khai của nhà (không viết tay từng nhà). */
export function clientKeyPlaceholder(id: ProviderId): string {
  const info = PROVIDERS[id];
  return `${info.keyHint ?? `Key ${info.label},`} chỉ lưu trên máy này`;
}
