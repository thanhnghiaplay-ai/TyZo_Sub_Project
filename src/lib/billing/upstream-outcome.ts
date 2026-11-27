/** An HTTP/transport failure is not proof that remote work stopped. */
export class UncertainUpstreamError extends Error {
  constructor(cause: unknown) {
    super("Chưa xác minh được kết quả công việc. Không tự gửi lại; cần đối soát.", { cause });
    this.name = "UncertainUpstreamError";
  }
}

export function definitiveProviderRejection(status: number): boolean {
  return [400, 401, 403, 404, 413, 415, 422, 429].includes(status);
}
