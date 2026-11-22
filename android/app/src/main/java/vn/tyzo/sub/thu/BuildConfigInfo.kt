package vn.tyzo.sub.thu

import android.content.Context

/** Lấy số phiên bản từ hệ thống, không cần bật BuildConfig. */
object BuildConfigInfo {
    private var cached: String? = null

    fun init(context: Context) {
        cached = runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        }.getOrNull()
    }

    fun versionName(): String = cached ?: "0.1-thu"
}
