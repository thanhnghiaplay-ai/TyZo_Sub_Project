package vn.tyzo.sub

import android.content.Context

/** Cài đặt lưu trên máy. Khóa máy nằm trong vùng riêng của ứng dụng, không sao lưu (allowBackup=false). */
class Prefs(context: Context) {
    private val p = context.getSharedPreferences("tyzo", Context.MODE_PRIVATE)

    private fun str(key: String, def: String) = p.getString(key, def) ?: def
    private fun put(key: String, value: String) = p.edit().putString(key, value).apply()

    var web: String
        get() = str("web", BuildConfig.WEB_URL)
        set(v) = put("web", v)
    var token: String
        get() = str("token", "")
        set(v) = put("token", v)
    var email: String
        get() = str("email", "")
        set(v) = put("email", v)
    var userId: String
        get() = str("user_id", "")
        set(v) = put("user_id", v)

    /** One SharedPreferences snapshot, so an account switch cannot mix keys. */
    fun access(): AccountAccess? {
        val values = p.all
        val web = values["web"] as? String ?: BuildConfig.WEB_URL
        val token = values["token"] as? String ?: ""
        if (web.isBlank() || token.isBlank()) return null
        return AccountAccess(web, token, values["user_id"] as? String ?: "")
    }

    fun matches(account: AccountAccess): Boolean = access()?.let {
        it.web == account.web && it.token == account.token
    } == true

    fun link(web: String, account: LinkedAccount) = p.edit().putString("web", web)
        .putString("token", account.token).putString("email", account.email)
        .putString("user_id", account.userId).apply()
    var model: String
        get() = str("model", Models.DEFAULT)
        set(v) = put("model", v)
    var target: String
        get() = str("target", "vi")
        set(v) = put("target", v)
    /** Rỗng = tự nhận diện. */
    var source: String
        get() = str("source", "")
        set(v) = put("source", v)
    /** Cỡ phụ đề như web: s, m, l, xl (CAPTION_PX). */
    var captionSize: String
        get() = str("caption_size", "m").takeIf { it in Caption.SIZES } ?: "m"
        set(v) = put("caption_size", v)
    /** Số dòng phụ đề nổi, 1 đến 4 (web mặc định 2). */
    var captionLines: Int
        get() = p.getInt("caption_lines", 2).coerceIn(1, 4)
        set(v) = p.edit().putInt("caption_lines", v.coerceIn(1, 4)).apply()
    var showSource: Boolean
        get() = p.getBoolean("show_source", false)
        set(v) = p.edit().putBoolean("show_source", v).apply()
    /** Nền đậm (dễ đọc trên video sáng), web mặc định bật. */
    var solid: Boolean
        // Từ 0.8 mặc định không nền, chữ viền đen như phụ đề phim (Chủ: nền quá đậm). Khóa mới để mọi máy nhận mặc định mới.
        get() = p.getBoolean("caption_solid_v8", false)
        set(v) = p.edit().putBoolean("caption_solid_v8", v).apply()
    /** Chỉ hiện câu đã xong: không có chữ đang nhảy, đọc êm hơn, chậm hơn chút. */
    var finalOnly: Boolean
        get() = p.getBoolean("caption_final_only", false)
        set(v) = p.edit().putBoolean("caption_final_only", v).apply()
    /** Lọc cho giọng nói (VoiceFilter): bớt nhạc nền, tự chỉnh âm lượng. Mặc định bật. */
    var voiceFilter: Boolean
        get() = p.getBoolean("voice_filter", true)
        set(v) = p.edit().putBoolean("voice_filter", v).apply()
    /** Ô «Từ cần giữ đúng»: mỗi dòng «gốc = cách dịch». */
    var words: String
        get() = str("words", "")
        set(v) = put("words", v)
    /** Vị trí dọc của phụ đề nổi, -1 = chưa kéo. */
    var overlayY: Int
        get() = p.getInt("overlay_y", -1)
        set(v) = p.edit().putInt("overlay_y", v).apply()

    val linked get() = token.isNotBlank() && web.isNotBlank()

    fun unlink() = p.edit().remove("token").remove("email").remove("user_id").apply()
}

/** No generated toString(): never expose the device token in diagnostics. */
class AccountAccess(val web: String, val token: String, val userId: String) {
    val owner: Session.Owner? get() = if (userId.isBlank()) null else Session.Owner(web, userId)
}

object Models {
    const val M38 = "qwen3.8-livetranslate-flash-realtime"
    const val M35 = "qwen3.5-livetranslate-flash-realtime"
    /** Qwen 3.5 hiện chữ sau ~0,4 s, 3.8 sau ~2,9 s (đo thật 28/11/2026). */
    const val DEFAULT = M35

    fun name(id: String) = when (id) {
        M38 -> "Qwen 3.8 (mới nhất)"
        M35 -> "Qwen 3.5"
        else -> id
    }
}

/** Tùy chỉnh phụ đề, cùng giá trị với src/lib/live/live-caption.ts. */
object Caption {
    val SIZES = listOf("s", "m", "l", "xl")
    val SIZE_LABELS = listOf("Nhỏ", "Vừa", "Lớn", "Rất lớn")
    /** Cỡ chữ của phụ đề nổi (px trên web, sp ở đây). */
    fun sp(size: String) = when (size) {
        "s" -> 18f
        "l" -> 28f
        "xl" -> 34f
        else -> 22f
    }

    /**
     * Số ký tự tối đa của MỘT dòng phụ đề nổi. Bài hát hay lời nói liền không có chỗ ngắt thì Alibaba không chốt câu,
     * chữ cứ dồn thành một khối che cả video; chỉ giữ phần cuối. Chữ lớn thì giữ ít hơn.
     */
    fun maxChars(size: String) = when (size) {
        "s" -> 52
        "l" -> 34
        "xl" -> 28
        else -> 42
    }

    /**
     * Giữ phần cuối của chữ, không quá [max] ký tự, cắt ở đầu câu (sau . ? ! 。 ？ ！) hoặc ở khoảng trắng,
     * thêm «…» phía trước. Chữ ngắn thì để nguyên.
     */
    fun tail(text: String, max: Int): String {
        val t = text.trim()
        if (t.length <= max) return t
        val cut = t.substring(t.length - max)
        val sentence = cut.indexOfFirst { it == '.' || it == '?' || it == '!' || it == '。' || it == '？' || it == '！' }
        val start = when {
            sentence in 0 until cut.length - 1 && sentence < max / 2 -> sentence + 1
            else -> cut.indexOf(' ').let { if (it in 0 until max / 3) it + 1 else 0 }
        }
        return "…" + cut.substring(start).trim()
    }
}
