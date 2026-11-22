package vn.tyzo.sub

import org.json.JSONObject

/**
 * Gộp sự kiện của cầu nối thành dòng phụ đề. Cùng cách với src/lib/live/live-transcript.ts:
 * chữ gốc và bản dịch đến độc lập, ghép bằng sự kiện "pair"; kiểu *.delta thì nối thêm.
 * Giờ của mỗi dòng tính bằng mili giây kể từ lúc bắt đầu phiên, để xuất SRT/VTT.
 */
class Transcript {
    class Line(val id: String, var startMs: Long) {
        var endMs = startMs
        var source = ""
        var sourceStash = ""
        var translation = ""
        var translationStash = ""
        var final = false

        val shownTranslation get() = (translation + translationStash).trim()
        val shownSource get() = (source + sourceStash).trim()
    }

    private val lines = LinkedHashMap<String, Line>()
    private val link = HashMap<String, String>()

    private fun line(id: String, now: Long) = lines.getOrPut(id) { Line(id, now) }
    private fun target(translationId: String, now: Long) = line(link[translationId] ?: translationId, now)

    fun apply(event: JSONObject, now: Long) {
        val id = event.optString("id")
        when (event.optString("kind")) {
            "pair" -> {
                val t = event.optString("translationId")
                val s = event.optString("sourceId")
                if (t.isEmpty() || s.isEmpty()) return
                link[t] = s
                val orphan = lines[t]
                if (orphan != null && t != s) {
                    val home = line(s, orphan.startMs)
                    lines.remove(t)
                    home.translation = orphan.translation
                    home.translationStash = orphan.translationStash
                    home.endMs = maxOf(home.endMs, orphan.endMs)
                    home.final = home.final || orphan.final
                }
            }
            "source" -> if (id.isNotEmpty()) line(id, now).apply {
                source = event.optString("text")
                sourceStash = event.optString("stash")
                endMs = now
            }
            "source-delta" -> if (id.isNotEmpty()) line(id, now).apply {
                source += event.optString("delta")
                endMs = now
            }
            "translation" -> if (id.isNotEmpty()) target(id, now).apply {
                translation = event.optString("text")
                translationStash = event.optString("stash")
                endMs = now
                if (event.optBoolean("final")) final = true
            }
            "translation-delta" -> if (id.isNotEmpty()) target(id, now).apply {
                translation += event.optString("delta")
                endMs = now
            }
        }
        // Giữ đủ cho một buổi dài; dòng cũ nhất bị bỏ khi quá nhiều.
        while (lines.size > 2000) lines.remove(lines.keys.first())
    }

    /** n dòng cuối có chữ, cũ trước mới sau. */
    fun latest(n: Int): List<Line> =
        lines.values.filter { it.shownTranslation.isNotEmpty() || it.shownSource.isNotEmpty() }.takeLast(n)

    fun cues(): List<Cue> {
        val list = lines.values.filter { it.source.isNotBlank() || it.translation.isNotBlank() }
        return list.mapIndexed { i, line ->
            val start = line.startMs / 1000.0
            val next = list.getOrNull(i + 1)
            val end = maxOf(start + 1, minOf(line.endMs / 1000.0, next?.let { it.startMs / 1000.0 } ?: Double.MAX_VALUE))
            Cue(start, end, line.source.trim(), line.translation.trim().ifEmpty { null })
        }
    }

    fun clear() {
        lines.clear()
        link.clear()
    }
}
