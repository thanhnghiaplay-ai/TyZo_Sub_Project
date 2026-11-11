export type ProviderId = "groq" | "alibaba";

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  groq: "Groq",
  alibaba: "Alibaba",
};

export const GROQ_API = "https://api.groq.com/openai/v1";
export const ALIBABA_API = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export function providerApi(id: ProviderId) {
  return id === "alibaba" ? ALIBABA_API : GROQ_API;
}

export function isProviderId(value: string): value is ProviderId {
  return value === "groq" || value === "alibaba";
}
