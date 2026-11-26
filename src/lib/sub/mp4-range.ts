/** Validate range identity before allocating/reading a response of bounded size. */
export async function readMp4Range(response: Response, start: number, end: number, total: number): Promise<Uint8Array> {
  const expected = end - start;
  const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get("content-range") ?? "");
  const length = response.headers.get("content-length");
  if (response.status !== 206 || !range || Number(range[1]) !== start || Number(range[2]) !== end - 1 || Number(range[3]) !== total || expected <= 0 || end > total || (length !== null && Number(length) !== expected)) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Máy chủ trả Content-Range hoặc kích thước video không đúng đoạn đã xin.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Không đọc được luồng video theo đoạn.");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > expected) {
      await reader.cancel().catch(() => {});
      throw new Error("Máy chủ trả đoạn video vượt kích thước đã xin.");
    }
    chunks.push(value);
  }
  if (size !== expected) throw new Error("Máy chủ trả đoạn video thiếu dữ liệu.");
  const data = new Uint8Array(expected); let at = 0;
  for (const chunk of chunks) { data.set(chunk,at); at += chunk.byteLength; }
  return data;
}
