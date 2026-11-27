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
 * Chữ của phiên gần nhất, lưu trên máy như web (tải lại vẫn xuất được). Chỉ giữ một phiên trên máy;
 * phiên cũ hơn nằm ở lịch sử chung với web trên máy chủ (sync, Api.history*).
 * Xuất SRT, VTT, TXT cùng cách với src/lib/sub/text.ts (toSrt, toVtt, toTxt).
 */
object Session {
    data class Owner(val web: String, val userId: String) {
        init { require(web.isNotBlank() && userId.isNotBlank()) }
        private val origin = java.net.URI(web).let {
            val scheme = it.scheme?.lowercase(Locale.ROOT)
            val host = it.host?.lowercase(Locale.ROOT)
            if (scheme == null || host == null) web.trimEnd('/').lowercase(Locale.ROOT)
            else {
                val defaultPort = it.port == -1 || (scheme == "https" && it.port == 443) || (scheme == "http" && it.port == 80)
                "$scheme://$host" + if (defaultPort) "" else ":${it.port}"
            }
        }
        val key: String = java.security.MessageDigest.getInstance("SHA-256")
            .digest((origin + "\u0000" + userId).toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    private val diskLock = Any()
    private fun file(context: Context, owner: Owner) = File(context.filesDir, "phien-${owner.key}.json")

    /** Old unowned data is retained, never silently attributed to a new account. */
    fun hasUnscopedLegacy(context: Context) = File(context.filesDir, "phien-gan-nhat.json").exists()

    fun hasSaved(context: Context, owner: Owner) = file(context, owner).exists()

    private fun read(context: Context, owner: Owner): JSONObject? = runCatching {
        JSONObject(file(context, owner).readText()).takeIf { it.optString("owner") == owner.key }
    }.getOrNull()

    private fun write(context: Context, owner: Owner, json: JSONObject): Boolean {
        var temporary: File? = null
        return try {
            val pending = File.createTempFile("phien-", ".tmp", context.filesDir)
            temporary = pending
            pending.setReadable(false, false)
            pending.setWritable(false, false)
            pending.setReadable(true, true)
            pending.setWritable(true, true)
            java.io.FileOutputStream(pending).use {
                it.write(json.toString().toByteArray(Charsets.UTF_8))
                it.fd.sync()
            }
            java.nio.file.Files.move(pending.toPath(), file(context, owner).toPath(),
                java.nio.file.StandardCopyOption.ATOMIC_MOVE, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
            true
        } catch (_: Exception) {
            false
        } finally {
            temporary?.delete()
        }
    }

    fun save(context: Context, owner: Owner, cues: List<Cue>, startedAtMs: Long, model: String = "", target: String = ""): Boolean {
        if (cues.none { it.original.isNotBlank() || !it.translation.isNullOrBlank() }) return true
        val arr = JSONArray()
        cues.forEach { arr.put(JSONObject().put("s", it.start).put("e", it.end).put("o", it.original).put("t", it.translation ?: JSONObject.NULL)) }
        val id = "a" + java.lang.Long.toString(startedAtMs, 36) + java.util.UUID.randomUUID().toString().replace("-", "").take(8)
        val json = JSONObject().put("owner", owner.key).put("at", startedAtMs).put("cues", arr).put("id", id)
            .put("model", model).put("target", target).put("synced", false)
        return synchronized(diskLock) { write(context, owner, json) }
    }

    /** Read one immutable snapshot; acknowledge only that same saved revision. */
    fun sync(context: Context, owner: Owner, token: String): Boolean {
        if (token.isBlank()) return false
        val snapshot = synchronized(diskLock) { read(context, owner) }
            ?: return !file(context, owner).exists()
        if (snapshot.optBoolean("synced", false)) return true
        if (snapshot.optString("id").isBlank()) return false
        val cues = runCatching { cues(snapshot) }.getOrNull() ?: return false
        return try {
            Api.historySave(owner.web, token, snapshot.getString("id"), snapshot.optString("model"),
                snapshot.optString("target"), snapshot.optLong("at"), cues)
            synchronized(diskLock) {
                val current = read(context, owner)
                // A newer save/clear wins over an old network completion.
                if (current == null || current.optString("id") != snapshot.optString("id")) false
                else write(context, owner, current.put("synced", true))
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun cues(json: JSONObject): List<Cue> {
        val arr = json.getJSONArray("cues")
        return List(arr.length()) {
            val o = arr.getJSONObject(it)
            Cue(o.optDouble("s"), o.optDouble("e"), o.optString("o"), if (o.isNull("t")) null else o.optString("t"))
        }
    }

    fun load(context: Context, owner: Owner): Pair<Long, List<Cue>>? = synchronized(diskLock) {
        runCatching { read(context, owner)?.let { it.optLong("at") to cues(it) } }.getOrNull()
    }

    fun clear(context: Context, owner: Owner) = synchronized(diskLock) { file(context, owner).delete() }

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
