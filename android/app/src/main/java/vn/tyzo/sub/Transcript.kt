package vn.tyzo.sub

import org.json.JSONObject

/**
 * Gộp sự kiện của cầu nối thành dòng phụ đề. Cùng cách với src/lib/live/live-transcript.ts:
 * chữ gốc và bản dịch đến độc lập, ghép bằng sự kiện "pair"; kiểu *.delta thì nối thêm.
 */
class Transcript {
    class Line(val id: String) {
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

    private fun line(id: String) = lines.getOrPut(id) { Line(id) }
    private fun target(translationId: String) = line(link[translationId] ?: translationId)

    fun apply(event: JSONObject) {
        val id = event.optString("id")
        when (event.optString("kind")) {
            "pair" -> {
                val t = event.optString("translationId")
                val s = event.optString("sourceId")
                if (t.isEmpty() || s.isEmpty()) return
                link[t] = s
                val orphan = lines[t]
                if (orphan != null && t != s) {
                    lines.remove(t)
                    val home = line(s)
                    home.translation = orphan.translation
                    home.translationStash = orphan.translationStash
                    home.final = home.final || orphan.final
                }
            }
            "source" -> if (id.isNotEmpty()) line(id).apply {
                source = event.optString("text")
                sourceStash = event.optString("stash")
            }
            "source-delta" -> if (id.isNotEmpty()) line(id).source += event.optString("delta")
            "translation" -> if (id.isNotEmpty()) target(id).apply {
                translation = event.optString("text")
                translationStash = event.optString("stash")
                if (event.optBoolean("final")) final = true
            }
            "translation-delta" -> if (id.isNotEmpty()) target(id).translation += event.optString("delta")
        }
        while (lines.size > 60) lines.remove(lines.keys.first())
    }

    /** n dòng cuối có chữ. */
    fun latest(n: Int): List<Line> =
        lines.values.filter { it.shownTranslation.isNotEmpty() || it.shownSource.isNotEmpty() }.takeLast(n)

    fun clear() {
        lines.clear()
        link.clear()
    }
}
