/**
 * BẢNG NHÀ CUNG CẤP. Thêm nhà mới = thêm một dòng vào PROVIDERS và làm theo PROVIDERS.md.
 * Mọi chỗ cần nhãn, địa chỉ, kiểu gửi key, khả năng đều đọc từ đây, không chép tay.
 */
export type ProviderId = "groq" | "alibaba" | "deepgram";

/** asr: nhận dạng giọng · chat: dịch bằng mô hình ngôn ngữ · tts: đọc thành tiếng · live: dịch trực tiếp */
export type ProviderCap = "asr" | "chat" | "tts" | "live";

/** bearer: `Authorization: Bearer KEY` (kiểu OpenAI). token: `Authorization: Token KEY` (Deepgram). */
export type ProviderAuth = "bearer" | "token";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  api: string;
  auth: ProviderAuth;
  caps: ProviderCap[];
  /** Trang khách lấy key. */
  keyPage: string;
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
    keyPage: "console.groq.com/keys",
    settings: { key: "groq_key", models: "run_models", desk: "run_desk" },
  },
  alibaba: {
    id: "alibaba",
    label: "Alibaba",
    api: ALIBABA_API,
    auth: "bearer",
    caps: ["asr", "live"],
    keyPage: "bailian.console.alibabacloud.com",
    settings: { key: "alibaba_key", models: "alibaba_models", desk: "alibaba_desk" },
  },
  deepgram: {
    id: "deepgram",
    label: "Deepgram",
    api: DEEPGRAM_API,
    auth: "token",
    caps: ["asr", "tts"],
    keyPage: "console.deepgram.com",
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
