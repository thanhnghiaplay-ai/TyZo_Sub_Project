import type { AutoProfile, ChatModel } from "@/lib/sub/types";

/** Catalog mirrored from Groq docs, November 2026. Chat models only. */
export const CHAT_MODELS: ChatModel[] = [
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    tier: "standard",
    speed: 1000,
    quality: 7,
    asian: 6,
    price: "$0.075 / $0.30",
    note: "Nhanh nhất trong gói thường. Hợp câu ngắn.",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    tier: "standard",
    speed: 500,
    quality: 9,
    asian: 7.5,
    price: "$0.15 / $0.60",
    note: "Chất lượng cao, vẫn nhanh. Mặc định nên dùng.",
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    tier: "preview",
    speed: 450,
    quality: 9,
    asian: 10,
    price: "$0.80 / $4.00",
    note: "Mạnh tiếng Trung, Nhật, Hàn. Đắt hơn.",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    tier: "enterprise",
    speed: 280,
    quality: 8.5,
    asian: 7,
    price: "Enterprise",
    note: "Key trả phí / hợp đồng. Hội thoại tự nhiên.",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    tier: "enterprise",
    speed: 560,
    quality: 5.5,
    asian: 4,
    price: "Enterprise",
    note: "Rất nhanh, độ chính xác vừa. Hợp câu đơn.",
  },
  {
    id: "meta-models/muse-spark-open",
    name: "Muse Spark Open",
    tier: "enterprise",
    speed: 350,
    quality: 8,
    asian: 7,
    price: "Enterprise",
    note: "Model enterprise của Meta trên Groq.",
  },
  {
    id: "minimaxai/minimax-m2.7",
    name: "MiniMax M2.7",
    tier: "enterprise",
    speed: 260,
    quality: 8.5,
    asian: 8.5,
    price: "Enterprise",
    note: "Ngữ cảnh rất dài. Hợp nội dung dài nhiều tập.",
  },
  {
    id: "openai/gpt-oss-safeguard-20b",
    name: "GPT-OSS Safeguard",
    tier: "safety",
    speed: 1000,
    quality: 6,
    asian: 5,
    price: "$0.075 / $0.30",
    note: "Model an toàn. Có thể từ chối thoại 18+.",
  },
  // Alibaba (Qwen, cổng tương thích OpenAI, vùng Singapore). Giá lấy từ bảng Alibaba (alibaba-catalog.ts / bảng Singapore).
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    tier: "standard",
    speed: 300,
    quality: 8.5,
    asian: 9.5,
    price: "$0.40 / $1.20",
    note: "Alibaba. Mạnh tiếng Trung, ngữ cảnh dài. Cần key Alibaba hoặc phòng có key Alibaba.",
    provider: "alibaba",
  },
  {
    id: "qwen-max",
    name: "Qwen Max",
    tier: "standard",
    speed: 200,
    quality: 9,
    asian: 10,
    price: "$1.60 / $6.40",
    note: "Alibaba. Chắc nhất cho nội dung tiếng Trung, đắt hơn.",
    provider: "alibaba",
  },
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    tier: "standard",
    speed: 600,
    quality: 7,
    asian: 8.5,
    price: "$0.05 / $0.20",
    note: "Alibaba. Rẻ và nhanh, hợp câu ngắn.",
    provider: "alibaba",
  },
];

/** Nhà chạy một model dịch trong danh mục (thiếu khai = Groq). */
export function chatProviderOf(model: Pick<ChatModel, "provider">): import("./provider.ts").ProviderId {
  return model.provider ?? "groq";
}

export const ASR_MODELS = [
  { id: "tyzo-modal-nhanh", name: "TyZo Modal · Nhanh", price: "Theo giá phòng", note: "Trả theo lượt" },
  { id: "tyzo-modal-ky", name: "TyZo Modal · Kỹ", price: "Theo giá phòng", note: "Trả theo lượt" },
  { id: "whisper-large-v3-turbo", name: "Whisper Turbo", price: "$0.04/giờ", note: "Nhanh, đủ cho hầu hết video" },
  { id: "whisper-large-v3", name: "Whisper Large v3", price: "$0.111/giờ", note: "Chính xác hơn, chậm và đắt hơn" },
  { id: "qwen-audio-3.0-asr-flash-filetrans", name: "Alibaba Filetrans", price: "~$0.126/giờ", note: "Cả file, mạnh tiếng Á, cần link trực tiếp" },
] as const;

const BY_ID = new Map(CHAT_MODELS.map((model) => [model.id, model]));

export function chatModel(id: string): ChatModel | undefined {
  return BY_ID.get(id);
}

export function modelLabel(id: string): string {
  return BY_ID.get(id)?.name ?? id.replace(/^.*\//, "");
}

/** Tham số suy luận riêng của Groq. Model nhà khác (kể cả Qwen trên Alibaba) không nhận các trường này. */
export function reasoningOpts(model: string): Record<string, string | boolean> {
  if (CHAT_MODELS.some((row) => row.id === model && row.provider && row.provider !== "groq")) return {};
  if (/qwen/i.test(model)) return { reasoning_effort: "none" };
  if (/gpt-oss/i.test(model)) return { reasoning_effort: "low", include_reasoning: false };
  return {};
}

type PickInput = {
  profile: AutoProfile;
  texts: string[];
  sourceLang: string;
  genre: string;
  glossaryHit: boolean;
  allowEnterprise: boolean;
  available: Set<string> | null;
  cooling: Map<string, number>;
  blocked: Set<string>;
  escalate: boolean;
};

function known(id: string): boolean {
  return BY_ID.has(id);
}

function allowed(id: string, input: PickInput, now: number): boolean {
  if (!known(id)) return false;
  if (input.blocked.has(id)) return false;
  const meta = BY_ID.get(id);
  if (meta?.tier === "enterprise" && !input.allowEnterprise) return false;
  if (meta?.tier === "safety") return false;
  if (input.available && !input.available.has(id)) return false;
  const until = input.cooling.get(id) ?? 0;
  if (until > now) return false;
  return true;
}

function hardBatch(input: PickInput): boolean {
  if (input.escalate || input.glossaryHit) return true;
  if (/^(zh|ja|ko)$/.test(input.sourceLang)) return true;
  if (input.genre === "costume" || input.genre === "scifi") return true;
  return input.texts.some((line) => line.trim().length > 72);
}

function trivialBatch(input: PickInput, hard: boolean): boolean {
  if (hard) return false;
  return input.texts.every((line) => line.trim().length < 26) && input.texts.length <= 4;
}

export function rankAuto(input: PickInput): string[] {
  const hard = hardBatch(input);
  const cjk = /^(zh|ja|ko)$/.test(input.sourceLang) || input.genre === "costume";
  let order: string[];
  if (input.profile === "fast") {
    order = ["openai/gpt-oss-20b", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
    if (input.escalate) order = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"];
  } else if (input.profile === "accurate") {
    order = cjk
      ? [
          "qwen/qwen3.8-27b",
          "minimaxai/minimax-m2.7",
          "openai/gpt-oss-120b",
          "llama-3.3-70b-versatile",
          "meta-models/muse-spark-open",
          "openai/gpt-oss-20b",
        ]
      : [
          "openai/gpt-oss-120b",
          "llama-3.3-70b-versatile",
          "minimaxai/minimax-m2.7",
          "qwen/qwen3.8-27b",
          "meta-models/muse-spark-open",
          "openai/gpt-oss-20b",
        ];
  } else if (hard) {
    order = [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "minimaxai/minimax-m2.7",
      "llama-3.3-70b-versatile",
      "openai/gpt-oss-20b",
    ];
    if (input.escalate) order = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "minimaxai/minimax-m2.7", "llama-3.3-70b-versatile"];
  } else {
    order = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"];
  }
  // Sau thứ tự ưu tiên trên là mọi model dịch còn lại trong danh mục, của MỌI nhà (nhà mới tự vào đây),
  // xếp theo điểm hợp việc: phim Á xét điểm tiếng Á, còn lại xét chất lượng. Danh sách `available` lọc tiếp theo key/phòng.
  const rest = CHAT_MODELS.filter((model) => model.tier !== "safety" && !order.includes(model.id))
    .sort((a, b) => (cjk ? b.asian - a.asian : 0) || b.quality - a.quality || b.speed - a.speed)
    .map((model) => model.id);
  const seen = new Set<string>();
  return [...order, ...rest].filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

export function pickAutoModel(input: PickInput): { id: string; via: string } {
  const now = Date.now();
  const ranked = rankAuto(input);
  const open = ranked.filter((id) => allowed(id, input, now));
  const relaxed = ranked.filter((id) => {
    if (input.blocked.has(id)) return false;
    const meta = BY_ID.get(id);
    if (meta?.tier === "enterprise" && !input.allowEnterprise) return false;
    if (meta?.tier === "safety") return false;
    if (input.available && !input.available.has(id)) return false;
    return true;
  });
  // Không model xếp hạng nào dùng được (ví dụ chỉ có key một nhà ngoài danh mục): lấy model dịch có trong `available`.
  const spare = input.available ? [...input.available].find((id) => !input.blocked.has(id) && BY_ID.get(id)?.tier !== "safety" && !/whisper|orpheus|guard|tts|asr/i.test(id)) : undefined;
  const id = open[0] || relaxed[0] || spare || "openai/gpt-oss-120b";
  const hard = hardBatch(input);
  const trivial = trivialBatch(input, hard);
  const via =
    input.profile === "fast"
      ? "ưu tiên tốc độ"
      : input.profile === "accurate"
        ? "ưu tiên độ chính xác"
        : trivial
          ? "câu ngắn, dùng model nhanh"
          : hard
            ? "câu khó, dùng model chắc"
            : "xem là hiểu";
  return { id, via };
}

export function mergeCatalog(remoteIds: string[]): ChatModel[] {
  const knownIds = new Set(CHAT_MODELS.map((model) => model.id));
  const extras: ChatModel[] = [];
  for (const id of remoteIds) {
    if (knownIds.has(id)) continue;
    if (/whisper|orpheus|prompt-guard|tts|playai|canopylabs/i.test(id)) continue;
    extras.push({
      id,
      name: id.replace(/^.*\//, ""),
      tier: "key",
      speed: 0,
      quality: 7,
      asian: 6,
      price: "Trên key",
      note: "Model Groq trả về từ key này, ngoài danh mục cố định.",
    });
  }
  return [...CHAT_MODELS, ...extras];
}

export const TIER_LABEL: Record<ChatModel["tier"], string> = {
  standard: "Gói thường",
  preview: "Preview",
  enterprise: "Enterprise",
  safety: "An toàn",
  key: "Thêm từ key",
};

type VoiceLaneId = "fast" | "clear" | "cjk" | "soul";

type VoiceLane = {
  id: VoiceLaneId;
  title: string;
  fit: string;
  pace: string;
  models: readonly string[];
};

/** Bốn lối người dùng đọc được. Tên model chỉ là dòng phụ. */
export const VOICE_LANES: readonly VoiceLane[] = [
  {
    id: "fast",
    title: "Cho nhanh",
    fit: "Hợp nếu bạn chỉ muốn xem thử. Câu ngắn, cảm xúc yếu.",
    pace: "Nhanh, rẻ hơn",
    models: ["openai/gpt-oss-20b", "llama-3.1-8b-instant"],
  },
  {
    id: "clear",
    title: "Xem là hiểu",
    fit: "Hợp nội dung thường. Xem, đọc và nghe là hiểu ngay.",
    pace: "Vừa. Nên dùng",
    models: ["openai/gpt-oss-120b"],
  },
  {
    id: "cjk",
    title: "Nội dung Trung, Nhật, Hàn",
    fit: "Hợp khi lời gốc là tiếng Trung, Nhật hoặc Hàn.",
    pace: "Chậm hơn, đắt hơn",
    models: ["qwen/qwen3.8-27b"],
  },
  {
    id: "soul",
    title: "Có hồn hơn",
    fit: "Hợp khi bạn muốn lời tự nhiên hơn. Key phải mở được model này.",
    pace: "Chậm hơn",
    models: ["llama-3.3-70b-versatile", "minimaxai/minimax-m2.7"],
  },
];

export function voiceLaneOf(modelId: string): VoiceLaneId | null {
  return VOICE_LANES.find((lane) => lane.models.includes(modelId))?.id ?? null;
}

/** Model sẽ dùng cho cả lần dịch. Không nhảy sang lối khác. */
export function resolveVoiceLane(laneId: VoiceLaneId, available: Set<string> | null, allowEnterprise: boolean): string | null {
  const lane = VOICE_LANES.find((item) => item.id === laneId);
  if (!lane) return null;
  for (const id of lane.models) {
    const meta = BY_ID.get(id);
    if (!meta || meta.tier === "safety") continue;
    if (meta.tier === "enterprise" && !allowEnterprise) continue;
    if (available && !available.has(id)) continue;
    return id;
  }
  return null;
}
