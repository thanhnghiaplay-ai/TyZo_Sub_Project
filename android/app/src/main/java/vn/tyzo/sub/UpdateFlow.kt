package vn.tyzo.sub

/**
 * RE8-007 (R3-006): quyết định của trình cập nhật, THUẦN Kotlin (không dùng API Android) để kiểm trên JVM.
 * Lỗi cũ: receiver «tải xong» đăng ký SAU enqueue và không ai hỏi lại DownloadManager; lỡ tin (tải rất nhanh, ứng dụng
 * bị tắt giữa chừng, khách hủy tải ở thanh thông báo) thì mã tải kẹt, nút báo «Đang tải…» mãi.
 * Nay: mã tải lưu bền; mỗi lần bấm Cập nhật, quay lại màn hình hoặc nhận tin đều hỏi trạng thái thật rồi quyết định.
 */
object UpdateFlow {
    /** Trạng thái DownloadManager (STATUS_*), MISSING = không còn bản ghi (đã hủy hoặc đã xóa). */
    enum class Dl { PENDING, RUNNING, PAUSED, SUCCESSFUL, FAILED, MISSING }

    sealed class Step {
        /** Không có lượt tải nào: bắt đầu tải mới. */
        object StartNew : Step()
        /** Đang tải: chờ, không tải lần hai. */
        object Wait : Step()
        /** Tải xong: mở màn cài. */
        object Install : Step()
        /** Tải lỗi: xóa lượt, cho tải lại. */
        object Failed : Step()
        /** Lượt tải đã bị hủy hoặc xóa: quên mã cũ, cho tải lại. */
        object Gone : Step()
    }

    fun fromCode(code: Int?): Dl = when (code) {
        1 -> Dl.PENDING
        2 -> Dl.RUNNING
        4 -> Dl.PAUSED
        8 -> Dl.SUCCESSFUL
        16 -> Dl.FAILED
        else -> Dl.MISSING
    }

    /** Có mã tải đã lưu (hoặc không) và trạng thái hỏi được → bước tiếp theo. */
    fun decide(storedId: Long, status: Dl?): Step {
        if (storedId < 0) return Step.StartNew
        return when (status ?: Dl.MISSING) {
            Dl.PENDING, Dl.RUNNING, Dl.PAUSED -> Step.Wait
            Dl.SUCCESSFUL -> Step.Install
            Dl.FAILED -> Step.Failed
            Dl.MISSING -> Step.Gone
        }
    }

    /** Tin «tải xong» chỉ dành cho đúng lượt đang theo dõi (tin của lượt cũ hoặc ứng dụng khác bị bỏ qua). */
    fun accepts(storedId: Long, eventId: Long): Boolean = storedId >= 0 && eventId == storedId

    fun message(step: Step, name: String): String = when (step) {
        Step.StartNew -> ""
        Step.Wait -> "Đang tải bản $name…"
        Step.Install -> "Đã tải xong. Bấm «Cài đặt» ở màn hình Android vừa mở."
        Step.Failed -> "Tải bản mới chưa xong (mạng yếu?). Bấm Cập nhật ngay để thử lại."
        Step.Gone -> "Lượt tải trước đã bị hủy. Bấm Cập nhật ngay để tải lại."
    }
}
