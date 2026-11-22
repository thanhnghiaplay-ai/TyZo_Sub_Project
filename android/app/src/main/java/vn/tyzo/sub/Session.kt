package vn.tyzo.sub

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

data class Cue(val start: Double, val end: Double, val original: String, val translation: String?)

/**
 * Chữ của phiên gần nhất, lưu trên máy như web (tải lại vẫn xuất được). Chỉ giữ một phiên.
 * Xuất SRT, VTT, TXT cùng cách với src/lib/sub/text.ts (toSrt, toVtt, toTxt).
 */
object Session {
    private fun file(context: Context) = File(context.filesDir, "phien-gan-nhat.json")

    fun save(context: Context, cues: List<Cue>, startedAtMs: Long) {
        if (cues.none { it.original.isNotBlank() || !it.translation.isNullOrBlank() }) return
        val arr = JSONArray()
        cues.forEach { arr.put(JSONObject().put("s", it.start).put("e", it.end).put("o", it.original).put("t", it.translation ?: JSONObject.NULL)) }
        runCatching { file(context).writeText(JSONObject().put("at", startedAtMs).put("cues", arr).toString()) }
    }

    fun load(context: Context): Pair<Long, List<Cue>>? = runCatching {
        val json = JSONObject(file(context).readText())
        val arr = json.getJSONArray("cues")
        json.optLong("at") to List(arr.length()) {
            val o = arr.getJSONObject(it)
            Cue(o.optDouble("s"), o.optDouble("e"), o.optString("o"), if (o.isNull("t")) null else o.optString("t"))
        }
    }.getOrNull()

    fun clear(context: Context) {
        file(context).delete()
    }

    private fun stamp(seconds: Double, dot: Boolean): String {
        val ms = maxOf(0L, Math.round(seconds * 1000))
        val h = ms / 3_600_000
        val m = (ms % 3_600_000) / 60_000
        val s = (ms % 60_000) / 1000
        return String.format(Locale.ROOT, "%02d:%02d:%02d%s%03d", h, m, s, if (dot) "." else ",", ms % 1000)
    }

    private fun line(cue: Cue) =
        (if (cue.translation.isNullOrBlank()) "[chưa dịch] ${cue.original}" else cue.translation).replace(Regex("""\s*\n\s*"""), " ").trim()

    private fun blocks(cues: List<Cue>, dot: Boolean) = cues.mapIndexed { i, cue ->
        var end = if (cue.end > cue.start) cue.end else cue.start + 0.4
        val next = cues.getOrNull(i + 1)
        if (next != null && end > next.start - 0.02) end = maxOf(cue.start + 0.02, minOf(end, next.start - 0.02))
        "${i + 1}\n${stamp(cue.start, dot)} --> ${stamp(end, dot)}\n${line(cue)}\n"
    }.joinToString("\n")

    fun export(cues: List<Cue>, format: String): String = when (format) {
        "vtt" -> "WEBVTT\n\n" + blocks(cues, true)
        "txt" -> cues.joinToString("\n") { line(it) } + "\n"
        else -> blocks(cues, false)
    }

    /** Tên tệp như web: dich-truc-tiep-20261114-2105.srt */
    fun name(format: String, atMs: Long): String =
        "dich-truc-tiep-" + SimpleDateFormat("yyyyMMdd-HHmm", Locale.ROOT).format(Date(atMs)) + ".$format"
}
