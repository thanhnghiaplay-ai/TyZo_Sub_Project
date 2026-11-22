package vn.tyzo.sub

/**
 * Ô «Từ cần giữ đúng», cùng luật với parseHotwords ở src/lib/live/live-caption.ts:
 * mỗi dòng «gốc = dịch» (hoặc «→», «->»), chỉ «gốc» thì giữ nguyên; tối đa 30 cặp, mỗi bên 40 ký tự, bỏ trùng.
 */
object Hotwords {
    const val MAX = 30
    private const val SIDE_MAX = 40
    private val SEP = Regex("""\s*(=|→|->)\s*""")

    fun parse(text: String): Map<String, String> {
        val out = LinkedHashMap<String, String>()
        for (raw in text.split('\n')) {
            if (out.size >= MAX) break
            val line = raw.trim()
            if (line.isEmpty()) continue
            val match = SEP.find(line)
            val left = (if (match != null) line.substring(0, match.range.first) else line).trim()
            val right = (if (match != null) line.substring(match.range.last + 1) else line).trim()
            if (left.isEmpty() || right.isEmpty() || left.length > SIDE_MAX || right.length > SIDE_MAX) continue
            if (out.containsKey(left)) continue
            out[left] = right
        }
        return out
    }
}
