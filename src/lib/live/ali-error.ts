/**
 * Đổi câu lỗi của Alibaba (tiếng Anh, kèm mã) sang câu tiếng Việt cho khách: thiếu gì, của ai, làm gì tiếp.
 * Dùng ở cầu nối trước khi chuyển lỗi cho web và ứng dụng. Lỗi lạ thì vẫn báo, kèm nguyên văn ngắn để tra.
 */
const RULES: Array<[RegExp, string]> = [
  [/arrearage|overdue|insufficient.?balance|account.*(suspend|arrears)/i, "Tài khoản Alibaba của phòng đang thiếu tiền hoặc bị tạm khóa thanh toán. Hãy báo Admin; bạn chưa bị trừ Token cho phần này."],
  [/free.?(tier|quota)|quota.*(exceed|exhaust|used up)|exceeded.*quota/i, "Phòng đã dùng hết hạn mức của Alibaba. Hãy báo Admin; bạn chưa bị trừ Token cho phần này."],
  [/invalid.?api.?key|api.?key.*(invalid|incorrect)|unauthori[sz]ed|authentication/i, "Key Alibaba của phòng không hợp lệ hoặc đã bị đổi. Hãy báo Admin."],
  [/access.?denied|forbidden|no permission|not (authorized|activated)|model.*(not.*open|not.*enabled)/i, "Key Alibaba của phòng chưa được mở quyền dùng model dịch trực tiếp này. Hãy báo Admin, hoặc chọn model khác."],
  [/model.*(not.?found|not.?exist|does not exist)|unknown model/i, "Alibaba không có model này ở vùng Singapore. Hãy chọn model khác."],
  [/throttl|rate.?limit|too many requests|request.*limit|concurrency/i, "Alibaba đang quá tải hoặc phòng gửi quá nhanh. Đợi vài giây rồi bấm Bắt đầu lại."],
  [/data.?inspection|content.*(moderat|security|inappropriate)|green.?net/i, "Alibaba từ chối dịch đoạn này vì bộ lọc nội dung. Phiên vẫn chạy tiếp với đoạn sau."],
  [/audio.*(format|sample.?rate)|invalid.*audio/i, "Alibaba không đọc được tiếng gửi lên. Hãy thử lại; nếu vẫn lỗi, báo Admin."],
  [/internal|system.?error|service.?unavailable|try again later|timeout/i, "Dịch vụ dịch của Alibaba đang trục trặc. Đợi một lúc rồi bấm Bắt đầu lại."],
];

export function aliErrorText(message: string): string {
  const raw = (message || "").trim();
  for (const [pattern, text] of RULES) if (pattern.test(raw)) return text;
  // Đã là câu tiếng Việt (vd. do cầu nối tự viết) thì giữ nguyên.
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(raw)) return raw;
  return `Dịch vụ dịch (Alibaba) báo lỗi${raw ? `: ${raw.slice(0, 120)}` : "."}`;
}
