/** Quá hạn thì ném lỗi này. Màn hình bắt nó để hiện câu «chưa trả lời» thay vì kẹt mãi. */
export class TimeoutError extends Error {
  constructor(label = "Máy chủ") {
    super(`${label} chưa trả lời.`);
    this.name = "TimeoutError";
  }
}

/**
 * Chờ `work` tối đa `ms` mili giây. Lời gọi máy chủ không có hạn thì một lần máy chủ
 * không trả lời sẽ làm nút kẹt ở «Đang xử lý…» hoặc dòng «Đang xem…» mãi mãi.
 * Hết hạn chỉ thôi chờ ở trình duyệt, không hủy việc máy chủ đang làm.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
