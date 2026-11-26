/**
 * BẢNG NHÀ CUNG CẤP. Thêm nhà mới = thêm một dòng vào PROVIDERS và làm theo PROVIDERS.md.
 * Mọi chỗ cần nhãn, địa chỉ, kiểu gửi key, khả năng đều đọc từ đây, không chép tay.
 */
export type ProviderId = "groq" | "alibaba" | "deepgram" | "assemblyai" | "speechmatics" | "soniox" | "elevenlabs" | "tyzo-modal";

/** asr: nhận dạng giọng · chat: dịch bằng mô hình ngôn ngữ · tts: đọc thành tiếng · live: dịch trực tiếp */
export type ProviderCap = "asr" | "chat" | "tts" | "live";

/**
 * bearer: `Authorization: Bearer KEY` (kiểu OpenAI). token: `Authorization: Token KEY` (Deepgram). raw: `Authorization: KEY`, không tiền tố (AssemblyAI).
 * xi: header riêng `xi-api-key: KEY` (ElevenLabs), không dùng Authorization.
 */
type ProviderAuth = "bearer" | "token" | "raw" | "xi";

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
  /** Độ dài đúng của key khi nhà quy định cố định (ElevenLabs: 51). Sai độ dài thì báo ngay, không gọi nhà. */
  keyLength?: number;
  /**
   * Đường (nối sau `api`) app gọi để kiểm key và đọc danh sách model. Nhà có lệnh liệt kê model thì trỏ vào đó (`/models`);
   * nhà không có thì trỏ vào một lệnh nhẹ chỉ để biết key đúng hay sai (đi cùng `fixedModels`).
   */
  listPath: string;
  /** Danh sách model khai cố định cho nhà không có lệnh liệt kê model. Có trường này thì phản hồi của `listPath` không được đọc. */
  fixedModels?: string[];
  /**
   * false = nhà đang làm dở (PROVIDERS.md bước 2 đến 7): có trong bảng và trong kiểu `ProviderId` để code dựng dần,
   * nhưng chưa hiện ra Admin, khách, Hướng dẫn và chưa bị bài kiểm «đủ hai cửa» đếm tới. Đổi thành true khi làm xong bước 7.
   */
  ready: boolean;
  /** Tên dòng trong room_settings. */
  settings: { key: string; models: string; desk: string };
  /**
   * Đường dịch bằng mô hình (bắt buộc khi caps có "chat"). Mọi việc dùng mô hình ngôn ngữ (dịch, phân tích nội dung,
   * nhận thể loại, trau chuốt) đi qua đường này, theo nhà của model, không gắn cứng nhà nào.
   */
  chat?: ProviderChat;
};

/**
 * Cách gọi dịch của một nhà (dạng OpenAI `chat/completions`).
 * path: nối sau `api` · tokenField: tên trường giới hạn chữ trả về ·
 * browserDirect: trình duyệt gọi thẳng được bằng key khách (nhà cho phép CORS); false thì đi qua cửa chung của phòng, key không lưu.
 */
export type ProviderChat = { path: string; tokenField: "max_completion_tokens" | "max_tokens"; browserDirect: boolean };

const GROQ_API = "https://api.groq.com/openai/v1";
const ALIBABA_API = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
export const DEEPGRAM_API = "https://api.deepgram.com/v1";
const ASSEMBLYAI_API = "https://api.assemblyai.com/v2";
/** Speechmatics chia máy chủ theo vùng; key của vùng nào chỉ chạy ở vùng đó. Đang khai vùng US1, cần kiểm bằng key thật ở bước máy chủ. */
export const SPEECHMATICS_API = "https://us1.asr.api.speechmatics.com/v2";
const SONIOX_API = "https://api.soniox.com/v1";
const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  "tyzo-modal": {
    id: "tyzo-modal", label: "TyZo (Modal)", api: "", auth: "bearer", caps: ["asr"], intake: "chunks",
    keyPage: "", clientStore: "tyzo-modal", listPath: "", fixedModels: ["tyzo-modal-nhanh", "tyzo-modal-ky"], ready: true,
    settings: { key: "tyzo_modal_enabled", models: "tyzo_modal_models", desk: "tyzo_modal_price" },
  },
  groq: {
    id: "groq",
    label: "Groq",
    api: GROQ_API,
    auth: "bearer",
    caps: ["asr", "chat", "tts"],
    chat: { path: "/chat/completions", tokenField: "max_completion_tokens", browserDirect: true },
    intake: "chunks",
    keyPage: "console.groq.com/keys",
    clientStore: "gk",
    keyHint: "gsk_…",
    listPath: "/models",
    ready: true,
    // Groq giữ tên dòng cũ: key lưu ở run_key (admin-room.ts, room-groq.ts, overview-data.ts đều đọc dòng này).
    settings: { key: "run_key", models: "run_models", desk: "run_desk" },
  },
  alibaba: {
    id: "alibaba",
    label: "Alibaba",
    api: ALIBABA_API,
    auth: "bearer",
    caps: ["asr", "chat", "live"],
    // Qwen qua cổng tương thích OpenAI (vùng Singapore). Trình duyệt không gọi thẳng được: đi qua cửa chung.
    chat: { path: "/chat/completions", tokenField: "max_tokens", browserDirect: false },
    intake: "link",
    keyPage: "bailian.console.alibabacloud.com",
    clientStore: "gali",
    keyHint: "sk-…",
    listPath: "/models",
    ready: true,
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
    listPath: "/models",
    ready: true,
    settings: { key: "deepgram_key", models: "deepgram_models", desk: "deepgram_desk" },
  },
  assemblyai: {
    id: "assemblyai",
    label: "AssemblyAI",
    api: ASSEMBLYAI_API,
    auth: "raw",
    caps: ["asr"],
    // AssemblyAI nhận link công khai (audio_url) hoặc file tải lên; app dùng link trước.
    intake: "link",
    keyPage: "www.assemblyai.com/dashboard",
    clientStore: "gaai",
    // Không có lệnh liệt kê model: hỏi một lượt phiên âm gần nhất để kiểm key.
    listPath: "/transcript?limit=1",
    fixedModels: ["universal-3-5-pro", "universal-2"],
    ready: true,
    settings: { key: "assemblyai_key", models: "assemblyai_models", desk: "assemblyai_desk" },
  },
  speechmatics: {
    id: "speechmatics",
    label: "Speechmatics",
    api: SPEECHMATICS_API,
    auth: "bearer",
    caps: ["asr"],
    // Speechmatics nhận link (fetch_data) hoặc file tải lên; app dùng link trước.
    intake: "link",
    keyPage: "portal.speechmatics.com",
    clientStore: "gsm",
    // Không có lệnh liệt kê model: hỏi danh sách việc gần nhất để kiểm key.
    listPath: "/jobs/?limit=1",
    fixedModels: ["standard", "enhanced"],
    ready: true,
    settings: { key: "speechmatics_key", models: "speechmatics_models", desk: "speechmatics_desk" },
  },
  soniox: {
    id: "soniox",
    label: "Soniox",
    api: SONIOX_API,
    auth: "bearer",
    caps: ["asr"],
    // Soniox nhận link (audio_url) hoặc file tải lên; app dùng link trước.
    intake: "link",
    keyPage: "console.soniox.com",
    clientStore: "gsx",
    listPath: "/models",
    ready: true,
    settings: { key: "soniox_key", models: "soniox_models", desk: "soniox_desk" },
  },
  elevenlabs: {
    id: "elevenlabs",
    label: "ElevenLabs",
    api: ELEVENLABS_API,
    auth: "xi",
    caps: ["asr", "tts"],
    // Scribe nhận file tải lên hoặc link (source_url); app dùng link, trả kết quả ngay trong một yêu cầu.
    // Đọc thành tiếng: giọng Flash v2.5 qua cửa /api/room-elevenlabs (key phòng trừ Token dịch, key khách chỉ chuyển tiếp).
    // ElevenLabs không có model dịch chữ nên không khai "chat".
    intake: "link",
    keyPage: "elevenlabs.io/app/settings/api-keys",
    clientStore: "gel",
    keyHint: "sk_…",
    // ElevenLabs báo «API key must be exactly 51 characters» khi key sai độ dài (thử 22/11/2026).
    keyLength: 51,
    // /models chỉ liệt kê model đọc giọng: dùng để kiểm key, danh sách nhận dạng khai cố định.
    listPath: "/models",
    fixedModels: ["scribe_v3", "scribe_v2"],
    ready: true,
    settings: { key: "elevenlabs_key", models: "elevenlabs_models", desk: "elevenlabs_desk" },
  },
};

/** Mọi nhà trong bảng, kể cả nhà đang làm dở. Chỉ dùng khi cần cả bảng (kiểu, bài kiểm bảng). */
export const ALL_PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** Các nhà đã làm xong (`ready`): đây là danh sách Admin, khách và bài kiểm dùng. */
export const PROVIDER_IDS = ALL_PROVIDER_IDS.filter((id) => PROVIDERS[id].ready);

export const PROVIDER_LABEL: Record<ProviderId, string> = Object.fromEntries(
  ALL_PROVIDER_IDS.map((id) => [id, PROVIDERS[id].label]),
) as Record<ProviderId, string>;

export function providerApi(id: ProviderId) {
  return PROVIDERS[id].api;
}

export function modelListUrl(id: ProviderId) {
  return `${providerApi(id)}${PROVIDERS[id].listPath}`;
}

export function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

/** Giá trị cho phần đầu Authorization theo kiểu của từng nhà. Nhà kiểu "xi" không dùng Authorization: gọi `authHeaders`. */
export function authHeader(id: ProviderId, key: string): string {
  const auth = PROVIDERS[id].auth;
  return auth === "token" ? `Token ${key}` : auth === "raw" || auth === "xi" ? key : `Bearer ${key}`;
}

/** Header đăng nhập đầy đủ (tên và giá trị) theo kiểu của từng nhà. Dùng chỗ này khi gọi chung cho mọi nhà. */
export function authHeaders(id: ProviderId, key: string): Record<string, string> {
  return PROVIDERS[id].auth === "xi" ? { "xi-api-key": key } : { Authorization: authHeader(id, key) };
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

/** Nhà làm được những việc gì, một dòng cho khách (sinh từ khả năng khai, không viết tay từng nhà). */
export function providerDoes(id: ProviderId): string {
  return PROVIDERS[id].caps.map((cap) => CAP_LABEL[cap]).join(", ");
}

/**
 * Ghi chú dưới ô key phòng ở Admin, sinh từ khả năng của nhà (không viết tay từng nhà).
 * Nhà không có khả năng dịch bằng mô hình thì nhắc dịch vẫn do nhà nào làm.
 */
export function providerKeyNote(id: ProviderId): string {
  const info = PROVIDERS[id];
  const does = info.caps.map((cap) => CAP_LABEL[cap]).join(", ");
  const chatHouses = PROVIDER_IDS.filter((other) => other !== id && PROVIDERS[other].caps.includes("chat")).map((other) => PROVIDERS[other].label);
  const translate = !info.caps.includes("chat") && chatHouses.length ? ` Dịch bằng nhà có model dịch (${chatHouses.join(", ")}).` : "";
  return `Chỉ Admin lưu. Khách không thấy key. ${info.label} làm: ${does}.${translate} Key này chạy cửa Trả theo lượt (phòng trả tiền, trừ Token dịch theo giá gốc). Cửa Thuê phòng dùng key của khách.`;
}

/** Đọc danh sách mã model từ phản hồi `/models` của từng nhà (mỗi nhà một dạng). */
export function modelIdsFrom(id: ProviderId, payload: unknown): string[] {
  const fixed = PROVIDERS[id].fixedModels;
  if (fixed) return [...fixed];
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
  // Dạng OpenAI trả `data`; Soniox trả `models`.
  const rows = Array.isArray(root.data) ? (root.data as unknown[]) : Array.isArray(root.models) ? (root.models as unknown[]) : [];
  return rows
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).id : undefined))
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

/**
 * Lỗi 401/403 khi kiểm key chỉ vì thiếu quyền của lệnh kiểm (nhà đã nhận ra key). Chỉ áp cho nhà có danh sách model khai cố định,
 * vì lệnh kiểm của các nhà này chỉ để biết key đúng (ElevenLabs: /models cần models_read, app không dùng quyền đó).
 */
export function keyKnownButLimited(provider: ProviderId, raw: string): boolean {
  if (!PROVIDERS[provider].fixedModels) return false;
  return /missing_permissions?|missing the permission/i.test(raw) && !/invalid_api_key|invalid api key/i.test(raw);
}

/** Lỗi định dạng key trước khi gọi nhà (rỗng = được). Chỉ kiểm điều nhà đã quy định rõ (độ dài cố định). */
export function keyShapeProblem(id: ProviderId, key: string): string {
  const info = PROVIDERS[id];
  const value = key.trim();
  if (info.keyLength && value.length !== info.keyLength) {
    return `Key ${info.label} phải dài đúng ${info.keyLength} ký tự (key vừa dán dài ${value.length}). Hãy sao chép lại cả key ở ${info.keyPage}.`;
  }
  return "";
}

/** Chữ mẫu trong ô nhập key của khách, đọc từ khai của nhà (không viết tay từng nhà). */
export function clientKeyPlaceholder(id: ProviderId): string {
  const info = PROVIDERS[id];
  return `${info.keyHint ?? `Key ${info.label},`} chỉ lưu trên máy này`;
}

/** Đường dịch của nhà, null khi nhà không dịch. */
export function providerChat(id: ProviderId): ProviderChat | null {
  const info = PROVIDERS[id];
  return info.caps.includes("chat") && info.chat ? info.chat : null;
}

/** Các nhà (đã ready) làm được một việc. */
export function providersWith(cap: ProviderCap): ProviderId[] {
  return PROVIDER_IDS.filter((id) => PROVIDERS[id].caps.includes(cap));
}
