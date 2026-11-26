import { modalCostUsd, type ModalPrice } from "./tyzo-modal-price.ts";
import { modalRequest, modalSegments, type TyzoProfile } from "./tyzo-modal.ts";

// URL và chuỗi bảo vệ do quản trị đặt trên máy chủ.
export async function recognizeModalWav(audio: Uint8Array, language: string, profile: TyzoProfile, offset: number, signal: AbortSignal, price: ModalPrice) {
  const endpoint = process.env.TYZO_ASR_URL;
  const token = process.env.TYZO_ASR_TOKEN;
  if (!endpoint || !token) throw new Error("Phòng chưa cấu hình TyZo Modal.");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".modal.run") || url.username || url.password) {
    throw new Error("Địa chỉ TyZo Modal của phòng không hợp lệ.");
  }
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(1800000)]);
  const payload = modalRequest(token, Buffer.from(audio).toString("base64"), language, profile);
  let response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, redirect: "manual",
    body: JSON.stringify(payload), signal: deadline,
  });
  while (response.status === 303) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Modal thiếu địa chỉ lấy kết quả.");
    const next = new URL(location, response.url);
    if (next.protocol !== "https:" || !next.hostname.endsWith(".modal.run") || next.username || next.password) {
      throw new Error("Địa chỉ lấy kết quả Modal không hợp lệ.");
    }
    await response.body?.cancel();
    response = await fetch(next, { redirect: "manual", signal: deadline });
  }
  if (!response.ok) throw new Error(`TyZo Modal báo lỗi HTTP ${response.status}.`);
  const result = await response.json();
  return { segments: modalSegments(result, offset), usd: modalCostUsd(price, profile, result.stats) };
}
