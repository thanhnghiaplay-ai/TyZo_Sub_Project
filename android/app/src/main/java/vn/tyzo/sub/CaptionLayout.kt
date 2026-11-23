package vn.tyzo.sub

/**
 * Sắp chữ cho phụ đề nổi như phụ đề phim (Chủ góp ý 23/11/2026: chữ nhảy, khó đọc khi thoại liên tục).
 *
 * Alibaba không chốt câu khi lời nói hay bài hát không có chỗ ngắt, nên một «dòng» của nó có thể dài cả đoạn.
 * Ở đây tự tách theo dấu câu (Alibaba đã chèn dấu vào bản dịch), rồi chia hai vùng:
 *  - [done]: những câu đã xong, đứng yên;
 *  - [live]: câu đang nói (phần chưa có dấu kết câu + chữ tạm), hiện mờ, chỉ vùng này thay đổi.
 * Câu dài quá [maxChars] được chia ở dấu phẩy hoặc khoảng trắng, mỗi đoạn tối đa [maxChars].
 *
 * Không đụng Android để chạy được test trên máy tính (CaptionLayoutTest trong tài liệu ứng dụng).
 */
object CaptionLayout {
    /** Một mục của bản ghi: chữ đã chốt, chữ tạm, Alibaba đã chốt cả mục chưa. */
    data class Piece(val text: String, val stash: String, val final: Boolean)

    data class Shown(val done: List<String>, val live: String) {
        val isEmpty get() = done.isEmpty() && live.isEmpty()
    }

    /** Câu xong đứng một mình quá chừng này mà không có gì mới thì ẩn, như phụ đề phim. */
    const val HIDE_MS = 4_000L

    private val ENDERS = charArrayOf('.', '?', '!', '…', '。', '？', '！')
    private val SOFT = charArrayOf(',', ';', ':', '，', '；', '：', '、')

    /** Tách theo dấu kết câu. Trả (các câu, có kết thúc bằng dấu kết câu không). */
    fun sentences(text: String): Pair<List<String>, Boolean> {
        val out = mutableListOf<String>()
        val sb = StringBuilder()
        for (ch in text) {
            sb.append(ch)
            if (ch in ENDERS) {
                val s = sb.toString().trim()
                // Dấu chấm lửng «...» hay «?!» liền nhau: gộp vào câu trước, không tạo câu rỗng.
                if (s.isNotEmpty() && s.any { it !in ENDERS }) out += s else if (s.isNotEmpty() && out.isNotEmpty()) out[out.size - 1] = out.last() + s
                sb.setLength(0)
            }
        }
        val rest = sb.toString().trim()
        if (rest.isNotEmpty()) out += rest
        return out to (rest.isEmpty() && out.isNotEmpty())
    }

    /**
     * Chia câu dài thành các đoạn không quá [max] ký tự, độ dài gần đều nhau (không để đuôi trơ trọi một chữ).
     * Mỗi lần cắt nhắm vào điểm chia đều; dấu phẩy gần điểm đó thì cắt sau dấu phẩy, không thì ở khoảng trắng gần nhất;
     * chữ không có khoảng trắng (tiếng Trung) thì cắt cứng. Cùng cách với web (src/lib/live/caption-layout.ts).
     */
    fun chunks(sentence: String, max: Int): List<String> {
        val out = mutableListOf<String>()
        var rest = sentence.trim()
        while (rest.length > max) {
            val parts = (rest.length + max - 1) / max
            val target = (rest.length + parts - 1) / parts
            val reach = maxOf(4, max / 4)
            var cut = -1
            var d = 0
            while (d <= reach && cut < 0) {
                for (i in intArrayOf(target - 1 + d, target - 1 - d)) {
                    if (i > 0 && i < max && rest[i] in SOFT) { cut = i; break }
                }
                d++
            }
            d = 0
            while (cut < 0 && d < max) {
                for (i in intArrayOf(target + d, target - d)) {
                    if (i > 0 && i <= max && i < rest.length && rest[i] == ' ') { cut = i - 1; break }
                }
                d++
            }
            if (cut < 0) cut = minOf(max, target) - 1
            out += rest.substring(0, cut + 1).trim()
            rest = rest.substring(cut + 1).trim()
        }
        if (rest.isNotEmpty()) out += rest
        return out
    }

    /**
     * @param pieces các mục gần nhất, cũ trước mới sau
     * @param keep số câu xong giữ lại phía trên câu đang nói
     * @param finalOnly chỉ hiện câu đã xong (đọc êm, chậm hơn chút): không có vùng [live]
     */
    fun build(pieces: List<Piece>, keep: Int, maxChars: Int, finalOnly: Boolean): Shown {
        val done = mutableListOf<String>()
        var live = ""
        pieces.forEachIndexed { i, piece ->
            val (list, closed) = sentences(piece.text)
            val last = i == pieces.lastIndex
            // Mục cũ coi như đã xong; mục mới nhất chưa chốt thì câu cuối (chưa có dấu) còn đang nói.
            val open = last && !piece.final && !closed && list.isNotEmpty()
            val complete = if (open) list.dropLast(1) else list
            complete.forEach { done += chunks(it, maxChars) }
            if (last && !piece.final) {
                live = ((if (open) list.last() else "") + " " + piece.stash).trim()
            }
        }
        if (finalOnly) return Shown(done.takeLast(keep.coerceAtLeast(1)), "")
        // Câu đang nói dài thì chỉ hiện đoạn cuối, các đoạn trước coi như đã xong.
        val liveParts = chunks(live, maxChars)
        if (liveParts.size > 1) {
            done += liveParts.dropLast(1)
            live = liveParts.last()
        }
        return Shown(done.takeLast(keep.coerceAtLeast(0)), live)
    }
}
