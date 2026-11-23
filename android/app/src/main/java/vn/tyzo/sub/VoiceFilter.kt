package vn.tyzo.sub

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tanh

/**
 * «Lọc cho giọng nói» cho tiếng đang phát trên máy, trước khi gửi đi dịch (Chủ hỏi 23/11/2026: micro nhận dạng chuẩn hơn).
 * Cùng cách với web (src/lib/live/voice-filter.ts): lọc thông cao 150 Hz + thông thấp 6 kHz,
 * tự chỉnh âm lượng về mức chuẩn (tăng tối đa 8 lần), đoạn im thì không tăng (không gửi ồn nền, không trừ thêm Token),
 * chặn đỉnh mềm. Không đụng Android để thử được trên máy tính (android/tools/VoiceFilterCheck.kt).
 */
class VoiceFilter(rate: Int = 16_000) {
    companion object {
        const val TARGET_RMS = 0.1
        const val MAX_GAIN = 8.0
        const val MIN_GAIN = 0.5
        /** Cùng ngưỡng SILENT_PEAK của LiveService: 100 trên thang 16 bit. */
        const val SILENT_LEVEL = 100.0 / 32768.0
        private const val LIMIT = 0.9
    }

    private class Stage(high: Boolean, freq: Double, rate: Int) {
        private val b0: Double
        private val b1: Double
        private val b2: Double
        private val a1: Double
        private val a2: Double
        private var x1 = 0.0
        private var x2 = 0.0
        private var y1 = 0.0
        private var y2 = 0.0

        init {
            val w = 2 * PI * freq / rate
            val c = cos(w)
            val alpha = sin(w) / (2 * sqrt(0.5))
            val a0 = 1 + alpha
            val nb0 = if (high) (1 + c) / 2 else (1 - c) / 2
            val nb1 = if (high) -(1 + c) else 1 - c
            b0 = nb0 / a0; b1 = nb1 / a0; b2 = nb0 / a0
            a1 = -2 * c / a0; a2 = (1 - alpha) / a0
        }

        fun run(x: Double): Double {
            val y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x; y2 = y1; y1 = y
            return y
        }
    }

    private val high = Stage(true, 150.0, rate)
    private val low = Stage(false, min(6000.0, rate * 0.45), rate)
    private var energy = TARGET_RMS * TARGET_RMS
    private var gain = 1.0
    private val energyStep = 1.0 / (rate * 0.4)
    private val gainStep = 1.0 / (rate * 0.05)

    /** Lọc tại chỗ [n] mẫu đầu của [samples] (số thực -1..1). */
    fun process(samples: DoubleArray, n: Int = samples.size) {
        var peak = 0.0
        for (i in 0 until n) peak = max(peak, abs(samples[i]))
        val quiet = peak < SILENT_LEVEL
        for (i in 0 until n) {
            val y = low.run(high.run(samples[i]))
            if (!quiet) energy += (y * y - energy) * energyStep
            val want = if (quiet) 1.0 else (TARGET_RMS / sqrt(max(energy, 1e-9))).coerceIn(MIN_GAIN, MAX_GAIN)
            gain += (want - gain) * gainStep
            samples[i] = softLimit(y * gain)
        }
    }

    /** Lọc tại chỗ mẫu 16 bit. */
    fun process(shorts: ShortArray, n: Int) {
        val buf = DoubleArray(n) { shorts[it] / 32768.0 }
        process(buf, n)
        for (i in 0 until n) shorts[i] = (buf[i] * 32767.0).toInt().coerceIn(-32768, 32767).toShort()
    }

    private fun softLimit(v: Double): Double {
        val a = abs(v)
        if (a <= LIMIT) return v
        val over = LIMIT + (1 - LIMIT) * tanh((a - LIMIT) / (1 - LIMIT))
        return if (v < 0) -over else over
    }
}
