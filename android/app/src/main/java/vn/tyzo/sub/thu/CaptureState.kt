package vn.tyzo.sub.thu

/**
 * Trạng thái dùng chung giữa dịch vụ thu và màn hình (cùng một tiến trình).
 * Màn hình đọc lại mỗi 100 ms, không cần gửi tin qua lại.
 */
object CaptureState {
    /** Ngưỡng coi là "có tiếng" (dBFS). Video có tiếng thường ở khoảng -40 đến -10. */
    const val SOUND_THRESHOLD_DB = -50.0
    const val FLOOR_DB = -90.0

    @Volatile var running = false
    @Volatile var startedAtMs = 0L
    @Volatile var levelDb = FLOOR_DB
    @Volatile var peakDb = FLOOR_DB
    @Volatile var soundMs = 0L
    @Volatile var error: String? = null

    fun reset() {
        running = false
        startedAtMs = 0L
        levelDb = FLOOR_DB
        peakDb = FLOOR_DB
        soundMs = 0L
        error = null
    }
}
