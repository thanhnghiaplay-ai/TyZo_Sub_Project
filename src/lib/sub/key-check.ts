/**
 * Kiểm tra key Groq trước khi chạy. Hàm thuần, không import gì, chạy được trong test Node.
 * Groq không có lệnh hỏi số dư hạn mức. Cái kiểm được là: key có mở được không, có đang bị giới hạn
 * (429) không, và hai model sắp dùng (nhận dạng, dịch) có nằm trong danh sách key mở không.
 * Số còn lại chỉ hiện khi Groq gửi kèm trong phần đầu phản hồi.
 */

export type KeyProbe = {
  /** 0 là không gọi được tới Groq (mạng, hết giờ). */
  status: number;
  ids: string[];
  /** Giây phải chờ, 0 nếu Groq không nói. */
  retryAfter: number;
  remainingRequests: number | null;
  remainingTokens: number | null;
};

export type KeyVerdict = {
  /** ok: chạy được. warn: chưa kiểm được, vẫn cho chạy. bad: chắc chắn chạy không được. */
  state: "ok" | "warn" | "bad";
  text: string;
};

export type KeyNeed = {
  /** Mã model nhận dạng của Groq. null nếu không dùng Whisper của Groq. */
  asr: string | null;
  /** Mã model dịch. null khi để máy tự chọn. */
  chat: string | null;
};

function waitText(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 90) return ` Chờ khoảng ${Math.ceil(seconds)} giây.`;
  return ` Chờ khoảng ${Math.ceil(seconds / 60)} phút.`;
}

function leftText(probe: KeyProbe): string {
  const parts: string[] = [];
  if (probe.remainingRequests !== null) parts.push(`còn ${probe.remainingRequests} lượt gọi`);
  if (probe.remainingTokens !== null) parts.push(`còn ${probe.remainingTokens} token`);
  return parts.length ? ` · ${parts.join(", ")}` : "";
}

export function judgeKey(probe: KeyProbe, need: KeyNeed): KeyVerdict {
  const { status } = probe;
  if (status === 0 || status >= 500)
    return { state: "warn", text: "Chưa kiểm tra được key (mạng hoặc Groq đang bận). Vẫn có thể bấm Tải và dịch." };
  if (status === 401 || status === 403)
    return { state: "bad", text: "Key Groq không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại key ở console.groq.com/keys." };
  if (status === 429)
    return { state: "bad", text: `Key đang bị giới hạn hoặc hết hạn mức Groq.${waitText(probe.retryAfter)} Hạn mức tính theo tài khoản Groq của bạn.` };
  if (status < 200 || status >= 300) return { state: "bad", text: `Groq từ chối key này (mã ${status}).` };

  if (probe.ids.length === 0)
    return { state: "warn", text: "Key hợp lệ nhưng Groq không trả danh sách model, chưa kiểm được model." };

  const missing: string[] = [];
  if (need.asr && !probe.ids.includes(need.asr)) missing.push(need.asr);
  if (need.chat && !probe.ids.includes(need.chat)) missing.push(need.chat);
  if (missing.length)
    return {
      state: "bad",
      text: `Key này không mở được model: ${missing.join(", ")}. Chọn model khác ở mục Cách dịch hoặc Nhận dạng giọng.`,
    };
  return { state: "ok", text: `Key hợp lệ · dùng được ${probe.ids.length} model${leftText(probe)}.` };
}
