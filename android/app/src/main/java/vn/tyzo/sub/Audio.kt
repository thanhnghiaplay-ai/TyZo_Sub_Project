package vn.tyzo.sub

/**
 * Nén tiếng gửi lên cầu nối. G.711 μ-law: mỗi mẫu 16 bit còn 8 bit (nửa dữ liệu), chất lượng như điện thoại,
 * đủ cho nhận dạng giọng nói. Cầu nối giải lại (src/lib/live/mulaw.ts, cùng phép tính, có test).
 */
object Audio {
    private const val BIAS = 0x84
    private const val CLIP = 32635

    fun mulaw(sample: Int): Byte {
        var s = sample.coerceIn(-32768, 32767)
        val sign = if (s < 0) 0x80 else 0
        if (s < 0) s = -s
        if (s > CLIP) s = CLIP
        s += BIAS
        var exponent = 7
        var mask = 0x4000
        while ((s and mask) == 0 && exponent > 0) {
            exponent -= 1
            mask = mask shr 1
        }
        val mantissa = (s shr (exponent + 3)) and 0x0f
        return ((sign or (exponent shl 4) or mantissa).inv() and 0xff).toByte()
    }
}
