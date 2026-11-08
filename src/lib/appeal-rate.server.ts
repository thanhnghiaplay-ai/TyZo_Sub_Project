import { getRequest } from "@tanstack/react-start/server";
import { takeRate } from "@/lib/guard.server";

/** Trần yêu cầu công khai: theo email, theo cả cửa, và theo IP khi máy chủ thấy địa chỉ. */
export async function limitPublicAppeal(email: string) {
  await takeRate(`appeal:${email}`, 5, 3600);
  await takeRate("appeal:public", 40, 3600);
  const request = getRequest();
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip = forwarded || request?.headers.get("x-real-ip")?.trim() || "";
  if (ip) await takeRate(`appeal-ip:${ip}`, 20, 3600);
}
