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
    var textSize: Int
        get() = p.getInt("text_size", 20)
        set(v) = p.edit().putInt("text_size", v).apply()
    var showSource: Boolean
        get() = p.getBoolean("show_source", false)
        set(v) = p.edit().putBoolean("show_source", v).apply()
    /** Vị trí dọc của phụ đề nổi, -1 = chưa kéo. */
    var overlayY: Int
        get() = p.getInt("overlay_y", -1)
        set(v) = p.edit().putInt("overlay_y", v).apply()

    val linked get() = token.isNotBlank() && web.isNotBlank()

    fun unlink() = p.edit().remove("token").remove("email").apply()
}

object Models {
    const val M38 = "qwen3.8-livetranslate-flash-realtime"
    const val M35 = "qwen3.5-livetranslate-flash-realtime"
    const val DEFAULT = M38

    fun name(id: String) = when (id) {
        M38 -> "Qwen 3.8 (mới nhất)"
        M35 -> "Qwen 3.5"
        else -> id
    }
}
