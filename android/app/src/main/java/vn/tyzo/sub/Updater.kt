package vn.tyzo.sub

import android.app.Activity
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import java.io.File

/**
 * Tự cập nhật ứng dụng (không qua Google Play): tải tệp cài bản mới bằng DownloadManager vào thư mục riêng của ứng dụng,
 * xong thì mở màn cài của Android. Android bắt khách bấm «Cài đặt» một lần; bản mới phải cùng khóa ký thì mới cài đè được.
 */
object Updater {
    private const val FILE = "tyzo-sub-moi.apk"
    @Volatile var status = ""
    private var downloadId = -1L
    private var receiver: BroadcastReceiver? = null

    /** Android 8+: ứng dụng phải được phép cài ứng dụng khác. Chưa được thì mở trang cho phép. */
    fun canInstall(activity: Activity): Boolean {
        if (activity.packageManager.canRequestPackageInstalls()) return true
        status = "Bật «Cho phép từ nguồn này» cho TyZo Sub, rồi quay lại bấm Cập nhật ngay."
        runCatching {
            activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}")))
        }
        return false
    }

    fun start(activity: Activity, url: String, name: String) {
        if (downloadId != -1L) {
            status = "Đang tải bản $name…"
            return
        }
        if (!canInstall(activity)) return
        val context = activity.applicationContext
        val dm = context.getSystemService(DownloadManager::class.java)
        File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), FILE).delete()
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("TyZo Sub $name")
            .setDescription("Đang tải bản cập nhật")
            .setMimeType("application/vnd.android.package-archive")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, FILE)
        downloadId = runCatching { dm.enqueue(request) }.getOrElse {
            status = "Chưa tải được bản mới. Thử lại sau."
            -1L
        }
        if (downloadId == -1L) return
        status = "Đang tải bản $name…"
        val r = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
                if (id != downloadId) return
                finish(c, dm, id)
            }
        }
        receiver = r
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        // Tin «tải xong» do hệ thống gửi nên phải nhận từ bên ngoài ứng dụng.
        if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
        else context.registerReceiver(r, filter)
    }

    private fun finish(context: Context, dm: DownloadManager, id: Long) {
        receiver?.let { runCatching { context.unregisterReceiver(it) } }
        receiver = null
        downloadId = -1L
        var ok = false
        dm.query(DownloadManager.Query().setFilterById(id))?.use { c ->
            if (c.moveToFirst()) {
                ok = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL
            }
        }
        val uri = if (ok) dm.getUriForDownloadedFile(id) else null
        if (uri == null) {
            status = "Tải bản mới chưa xong (mạng yếu?). Bấm Cập nhật ngay để thử lại."
            return
        }
        status = "Đã tải xong. Bấm «Cài đặt» ở màn hình Android vừa mở."
        val install = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(install) }.onFailure {
            status = "Không mở được màn cài. Tải tệp cài ở trang Tài khoản trên web."
        }
    }
}
