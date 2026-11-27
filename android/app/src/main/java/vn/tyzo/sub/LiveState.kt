package vn.tyzo.sub

/** Trạng thái phiên dùng chung giữa dịch vụ và màn hình (cùng tiến trình). Màn hình đọc lại định kỳ. */
object LiveState {
    enum class Phase { IDLE, STARTING, LIVE, STOPPING }

    @Volatile var phase = Phase.IDLE
    @Volatile var status = ""
    @Volatile var levelDb = -90.0
    @Volatile var perMinute = 0L
    @Volatile var balance = 0L
    @Volatile var startedAtMs = 0L
    /** Máy chủ báo khóa máy không còn hiệu lực: màn hình đưa về bước liên kết. */
    @Volatile var unlinked: AccountAccess? = null
    /** Khách bấm Tạm dừng trên khung phụ đề: giữ phiên, không gửi tiếng (không trừ Token). */
    @Volatile var paused = false

    val running get() = phase != Phase.IDLE
}
