import {
  UncertainUpstreamError,
  definitiveProviderRejection,
} from "../billing/upstream-outcome.ts";
import { modalCostUsd, type ModalPrice } from "./tyzo-modal-price.ts";
import { modalRequest, modalSegments, type TyzoProfile } from "./tyzo-modal.ts";

// URL và chuỗi bảo vệ do quản trị đặt trên máy chủ.
export async function recognizeModalWav(
  audio: Uint8Array,
  language: string,
  profile: TyzoProfile,
  offset: number,
  signal: AbortSignal,
  price: ModalPrice,
) {
  const endpoint = process.env.TYZO_ASR_URL;
  const token = process.env.TYZO_ASR_TOKEN;
  if (!endpoint || !token) throw new Error("Phòng chưa cấu hình TyZo Modal.");
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".modal.run") ||
    url.username ||
    url.password
  ) {
    throw new Error("Địa chỉ TyZo Modal của phòng không hợp lệ.");
  }
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(1800000)]);
  const payload = modalRequest(token, Buffer.from(audio).toString("base64"), language, profile);
  let dispatched = false;
  let complete = false;
  try {
    dispatched = true;
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "manual",
      body: JSON.stringify(payload),
      signal: deadline,
    });
    while (response.status === 303) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Modal thiếu địa chỉ lấy kết quả.");
      const next = new URL(location, response.url);
      if (
        next.protocol !== "https:" ||
        !next.hostname.endsWith(".modal.run") ||
        next.username ||
        next.password
      ) {
        throw new Error("Địa chỉ lấy kết quả Modal không hợp lệ.");
      }
      void response.body?.cancel().catch(() => undefined);
      response = await fetch(next, { redirect: "manual", signal: deadline });
    }
    if (!response.ok) {
      complete = definitiveProviderRejection(response.status);
      throw new ModalHttpError(response.status);
    }
    const result = await response.json();
    complete = true;
    return {
      segments: modalSegments(result, offset),
      usd: modalCostUsd(price, profile, result.stats),
    };
  } catch (error) {
    if (dispatched && !complete) throw new UncertainUpstreamError(error);
    throw error;
  }
}

export class ModalHttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`TyZo Modal báo lỗi HTTP ${status}.`);
    this.status = status;
  }
}

/** Only a definite pre-work 429 may be submitted again. Unknown POST outcomes are never blindly replayed. */
export function isTransientModalError(error: unknown): boolean {
  return error instanceof ModalHttpError && error.status === 429;
}
