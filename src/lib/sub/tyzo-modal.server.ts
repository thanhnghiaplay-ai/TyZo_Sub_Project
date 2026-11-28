import {
  UncertainUpstreamError,
  definitiveProviderRejection,
} from "../billing/upstream-outcome.ts";
import { modalCostUsd, type ModalPrice } from "./tyzo-modal-price.ts";
import { modalRequest, modalSegments, type TyzoProfile } from "./tyzo-modal.ts";

/** Whether the server has the endpoint and application token. This does not contact Modal. */
export function modalAsrConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.TYZO_ASR_URL?.trim() && env.TYZO_ASR_TOKEN?.trim());
}

/**
 * RE8-010: token proxy Modal (requires_proxy_auth). Chỉ đọc biến môi trường phía máy chủ TYZO_PROXY_KEY /
 * TYZO_PROXY_SECRET (Vercel); không có trong mã khách, ứng dụng Android hay nhật ký. Chưa đặt cả hai → không gửi
 * (endpoint chưa bật xác thực vẫn chạy như cũ). Đặt một nửa hoặc sai dạng → lỗi cấu hình, KHÔNG gọi GPU. Lỗi không in giá trị.
 */
export function modalProxyHeaders(env: Record<string, string | undefined> = process.env): Record<string, string> {
  const key = env.TYZO_PROXY_KEY ?? "";
  const secret = env.TYZO_PROXY_SECRET ?? "";
  if (!key && !secret) return {};
  const ok = (v: string) => v.length > 0 && v.length <= 200 && !/\s/.test(v);
  if (!ok(key) || !ok(secret)) throw new Error("Cấu hình xác thực TyZo Modal chưa đủ hoặc sai dạng.");
  return { "Modal-Key": key, "Modal-Secret": secret };
}

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
  const auth = modalProxyHeaders();
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(1800000)]);
  const payload = modalRequest(token, Buffer.from(audio).toString("base64"), language, profile);
  let dispatched = false;
  let complete = false;
  let polling = false;
  try {
    dispatched = true;
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      redirect: "manual",
      body: JSON.stringify(payload),
      signal: deadline,
    });
    while (response.status === 303) {
      polling = true;
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
      // Hỏi lại kết quả cũng qua proxy Modal: phải gửi lại header (chỉ tới đúng *.modal.run đã kiểm ở trên).
      response = await fetch(next, { headers: auth, redirect: "manual", signal: deadline });
    }
    if (!response.ok) {
      // A rejection while fetching a result says nothing about whether the original POST ran.
      complete = !polling && definitiveProviderRejection(response.status);
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
