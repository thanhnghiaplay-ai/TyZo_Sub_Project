/** Che tên tệp của khách khi hiện cho nhân viên. Giữ 2 ký tự đầu và đuôi tệp, phần giữa thành dấu chấm tròn. */
export function maskFileName(name: string | null | undefined): string {
  const clean = String(name || "").trim();
  if (!clean) return "";
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 && clean.length - dot <= 6 ? clean.slice(dot) : "";
  const stem = ext ? clean.slice(0, dot) : clean;
  const head = Array.from(stem).slice(0, 2).join("");
  return `${head}•••${ext}`;
}
