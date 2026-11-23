// Thử VoiceFilter trên máy tính (không cần Android SDK). Cách chạy: chép VoiceFilter.kt (bỏ dòng package)
// và tệp này vào một dự án Kotlin JVM (plugin kotlin("jvm")), rồi gradle run. Phải in «TẤT CẢ ĐÚNG».
// Cùng các trường hợp với src/lib/live/voice-filter.test.ts (web).
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

const val RATE = 16_000
var fails = 0
fun check(name: String, ok: Boolean, info: String) {
    if (!ok) { fails++; println("SAI  $name: $info") } else println("ĐÚNG $name: $info")
}

fun tone(freq: Double, amp: Double, seconds: Double) = DoubleArray((RATE * seconds).toInt()) { amp * sin(2 * PI * freq * it / RATE) }

/** Cho qua từng khung 100 ms như lúc chạy thật; trả (đỉnh, RMS) nửa giây cuối. */
fun run(f: VoiceFilter, x: DoubleArray): Pair<Double, Double> {
    var i = 0
    while (i < x.size) {
        val n = minOf(1600, x.size - i)
        val part = x.copyOfRange(i, i + n)
        f.process(part, n)
        part.copyInto(x, i)
        i += n
    }
    val tail = x.copyOfRange(x.size - RATE / 2, x.size)
    return tail.maxOf { abs(it) } to sqrt(tail.sumOf { it * it } / tail.size)
}

fun power(x: DoubleArray, freq: Double): Double {
    val tail = x.copyOfRange(x.size - RATE / 2, x.size)
    val k = 2 * cos(2 * PI * freq / RATE)
    var s1 = 0.0; var s2 = 0.0
    for (v in tail) { val s0 = v + k * s1 - s2; s2 = s1; s1 = s0 }
    return s1 * s1 + s2 * s2 - k * s1 * s2
}

fun main() {
    val bass = tone(40.0, 0.3, 3.0)
    val voice = tone(1000.0, 0.05, 3.0)
    val mix = DoubleArray(bass.size) { bass[it] + voice[it] }
    val before = power(mix, 1000.0) / power(mix, 40.0)
    run(VoiceFilter(), mix)
    val after = power(mix, 1000.0) / power(mix, 40.0)
    check("nhạc trầm lấn giọng: sau lọc giọng trội hơn hẳn", after > before * 50, "trước $before, sau $after")

    val small = run(VoiceFilter(), tone(800.0, 0.02, 4.0))
    check("tiếng nhỏ được kéo lên", small.second > 0.08 && small.second < 0.13, "RMS ${small.second}")
    val loud = run(VoiceFilter(), tone(800.0, 0.99, 4.0))
    check("tiếng to không vỡ, được hạ", loud.first <= 1.0 && loud.second < 0.4, "đỉnh ${loud.first}, RMS ${loud.second}")

    val f = VoiceFilter()
    run(f, tone(800.0, 0.02, 3.0))
    val hiss = run(f, tone(800.0, VoiceFilter.SILENT_LEVEL * 0.8, 2.0))
    check("im vẫn là im", hiss.first < VoiceFilter.SILENT_LEVEL, "đỉnh ${hiss.first}")

    println(if (fails == 0) "TẤT CẢ ĐÚNG" else "CÓ $fails SAI")
}
