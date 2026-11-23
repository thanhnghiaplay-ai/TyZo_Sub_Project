package vn.tyzo.sub

import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class ApiError(val status: Int, message: String) : Exception(message)

/** Bản ứng dụng mới nhất web đang phát (code 0 = web chưa báo). */
data class AppRelease(val code: Int, val name: String, val url: String)

data class Me(val email: String, val balance: Long, val models: List<String>, val app: AppRelease)
data class Ticket(val url: String, val perMinute: Long, val balance: Long)
/** Một phiên trong lịch sử chung với web. via: "web" hoặc "app". */
data class HistoryItem(val id: String, val via: String, val startedAt: String, val durationMs: Long, val lines: Int, val preview: String)

/**
 * Gọi các đường /api/app-* của web. Hàm chặn luồng: gọi từ luồng nền.
 * Lỗi máy chủ trả câu tiếng Việt trong trường "error".
 */
object Api {
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json; charset=utf-8".toMediaType()

    /** Chuẩn hóa địa chỉ web khách gõ. Chỉ nhận https. null khi sai. */
    fun normalizeWeb(raw: String): String? {
        var text = raw.trim().trimEnd('/')
        if (text.isEmpty()) return null
        if (!text.contains("://")) text = "https://$text"
        if (!text.startsWith("https://")) return null
        val host = text.removePrefix("https://").substringBefore('/')
        if (host.isBlank() || !host.contains('.')) return null
        return "https://$host"
    }

    private fun call(web: String, path: String, method: String, token: String?, body: JSONObject?): JSONObject {
        val builder = Request.Builder().url(web + path).header("accept", "application/json")
        if (token != null) builder.header("authorization", "Bearer $token")
        val payload = body?.toString()?.toRequestBody(JSON)
        builder.method(method, payload)
        try {
            client.newCall(builder.build()).execute().use { response ->
                val text = response.body?.string().orEmpty()
                val json = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
                if (!response.isSuccessful) {
                    val message = json.optString("error").ifBlank {
                        if (response.code == 404) "Địa chỉ web không đúng hoặc web chưa có bản hỗ trợ ứng dụng."
                        else "Máy chủ báo lỗi ${response.code}. Hãy thử lại."
                    }
                    throw ApiError(response.code, message)
                }
                return json
            }
        } catch (e: IOException) {
            throw ApiError(0, "Không kết nối được tới web. Kiểm tra mạng rồi thử lại.")
        }
    }

    fun link(web: String, code: String, name: String): Pair<String, String> {
        val json = call(web, "/api/app-link", "POST", null, JSONObject().put("code", code).put("name", name))
        return json.getString("token") to json.optString("email")
    }

    fun me(web: String, token: String): Me {
        val json = call(web, "/api/app-me", "GET", token, null)
        val arr = json.optJSONArray("models")
        val models = if (arr == null) emptyList() else List(arr.length()) { arr.getString(it) }
        val app = json.optJSONObject("app")
        val release = AppRelease(app?.optInt("code") ?: 0, app?.optString("name").orEmpty(), app?.optString("url").orEmpty())
        return Me(json.optString("email"), json.optLong("balance"), models, release)
    }

    fun ticket(web: String, token: String, model: String, target: String, source: String, words: Map<String, String>): Ticket {
        val body = JSONObject().put("model", model).put("target", target).put("source", source)
        if (words.isNotEmpty()) body.put("words", JSONObject(words as Map<*, *>))
        val json = call(web, "/api/app-ticket", "POST", token, body)
        return Ticket(json.getString("url"), json.optLong("perMinute"), json.optLong("balance"))
    }

    /** Lịch sử Dịch trực tiếp chung với web (src/routes/api/app-history.ts). */
    fun historySave(web: String, token: String, clientId: String, model: String, target: String, startedAtMs: Long, cues: List<Cue>) {
        val arr = JSONArray()
        cues.forEach { arr.put(JSONObject().put("s", it.start).put("e", it.end).put("o", it.original).put("t", it.translation ?: JSONObject.NULL)) }
        val body = JSONObject().put("clientId", clientId).put("model", model).put("target", target).put("startedAt", startedAtMs).put("cues", arr)
        call(web, "/api/app-history", "POST", token, body)
    }

    fun historyList(web: String, token: String): List<HistoryItem> {
        val arr = call(web, "/api/app-history", "GET", token, null).optJSONArray("items") ?: return emptyList()
        return List(arr.length()) {
            val o = arr.getJSONObject(it)
            HistoryItem(o.optString("id"), o.optString("via"), o.optString("startedAt"), o.optLong("durationMs"), o.optInt("lines"), o.optString("preview"))
        }
    }

    fun historyRead(web: String, token: String, id: String): Pair<Long, List<Cue>> {
        val json = call(web, "/api/app-history?id=" + java.net.URLEncoder.encode(id, "UTF-8"), "GET", token, null)
        val arr = json.optJSONArray("cues") ?: JSONArray()
        val at = runCatching { java.time.Instant.parse(json.optString("startedAt")).toEpochMilli() }.getOrDefault(System.currentTimeMillis())
        return at to List(arr.length()) {
            val o = arr.getJSONObject(it)
            Cue(o.optDouble("s"), o.optDouble("e"), o.optString("o"), if (o.isNull("t")) null else o.optString("t"))
        }
    }

    /** id null: xóa hết. */
    fun historyDelete(web: String, token: String, id: String?) {
        val query = if (id == null) "?all=1" else "?id=" + java.net.URLEncoder.encode(id, "UTF-8")
        call(web, "/api/app-history$query", "DELETE", token, null)
    }

    fun unlink(web: String, token: String) {
        runCatching { call(web, "/api/app-link", "DELETE", token, null) }
    }
}
