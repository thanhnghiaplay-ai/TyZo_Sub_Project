import type { Sql } from "../db.ts";

export const LIVE_REGION = "ap-southeast-1";

/** Workspace ID của Alibaba chỉ gồm chữ, số, gạch ngang. Sai dạng thì không ghép vào địa chỉ. */
export function validWorkspaceId(value: string | undefined | null): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,62}$/i.test(value.trim());
}

/** Đường nối kiểu mới: wss://<WorkspaceId>.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=... */
export function liveUpstreamUrl(workspaceId: string, model: string): string {
  return `wss://${workspaceId.trim().toLowerCase()}.${LIVE_REGION}.maas.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(model)}`;
}

/**
 * Địa chỉ và key Alibaba cho cầu nối. Key lấy từ key Chủ đã lưu trong phòng (cùng key của cửa trả theo lượt).
 * Workspace ID lấy từ biến môi trường ALIBABA_WORKSPACE_ID, hoặc mục `alibaba_workspace` trong cài đặt phòng.
 * Thiếu một trong hai thì trả null, cầu nối báo lỗi rõ cho khách.
 */
export async function loadLiveUpstream(sql: Sql, model: string, envWorkspace?: string): Promise<{ url: string; key: string } | null> {
  const key = (await sql<{ value: string }>`select value from room_settings where key = 'alibaba_key'`)[0]?.value?.trim();
  if (!key) return null;
  let workspace = envWorkspace?.trim();
  if (!validWorkspaceId(workspace)) {
    workspace = (await sql<{ value: string }>`select value from room_settings where key = 'alibaba_workspace'`)[0]?.value?.trim();
  }
  if (!validWorkspaceId(workspace)) return null;
  return { url: liveUpstreamUrl(workspace, model), key };
}
