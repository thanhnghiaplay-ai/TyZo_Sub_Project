/**
 * Hộp xác nhận của app, thay cho window.confirm của trình duyệt (xấu, lệch giao diện, bị chặn trong một số khung nhúng).
 * KHÔNG dùng alert, confirm, prompt mặc định ở bất cứ đâu trong src: có test chặn (no-native-dialog.test.ts).
 * Báo tin thường thì dùng pushToast; hỏi lại trước việc khó hoàn tác thì dùng askConfirm.
 * Hộp được vẽ bởi ConfirmHost (components/confirm-dialog.tsx), gắn một lần ở gốc.
 *
 *   if (!(await askConfirm({ title: "Xóa khoản này?", text: "Không hoàn tác được.", confirmLabel: "Xóa", danger: true }))) return;
 */
type ConfirmOptions = {
  title?: string;
  /** Có thể nhiều dòng; xuống dòng được giữ nguyên. */
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Việc khó hoàn tác (xóa, ẩn, bảo trì): nút chính màu đỏ và tiêu điểm đặt sẵn ở nút Hủy. */
  danger?: boolean;
};

export type PendingConfirm = ConfirmOptions & { id: number; resolve: (ok: boolean) => void };

let listener: ((item: PendingConfirm) => void) | null = null;
let seq = 0;

/** ConfirmHost gọi khi gắn vào trang (nhận hộp mới) và khi gỡ ra (null). */
export function setConfirmListener(next: ((item: PendingConfirm) => void) | null) {
  listener = next;
}

/** Trả true nếu khách bấm nút chính, false nếu Hủy, bấm Esc, bấm ra ngoài hoặc hộp chưa sẵn sàng (chọn phía an toàn: không làm). */
export function askConfirm(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === "string" ? { text: options } : options;
  return new Promise((resolve) => {
    if (!listener) return resolve(false);
    listener({ ...opts, id: ++seq, resolve });
  });
}
