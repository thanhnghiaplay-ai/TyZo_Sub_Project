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
    private const val PREFS = "tyzo-updater"
    private const val KEY_ID = "download-id"
    private const val KEY_NAME = "download-name"
    @Volatile var status = ""
    private var receiver: BroadcastReceiver? = null

    // RE8-007: mã tải lưu bền (sống qua tắt ứng dụng); -1 = không có lượt nào.
    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun storedId(c: Context) = prefs(c).getLong(KEY_ID, -1L)
    private fun storedName(c: Context) = prefs(c).getString(KEY_NAME, "") ?: ""
    private fun remember(c: Context, id: Long, name: String) = prefs(c).edit().putLong(KEY_ID, id).putString(KEY_NAME, name).apply()
    private fun forget(c: Context) = prefs(c).edit().remove(KEY_ID).remove(KEY_NAME).apply()

    private fun query(dm: DownloadManager, id: Long): UpdateFlow.Dl = runCatching {
        dm.query(DownloadManager.Query().setFilterById(id))?.use { c ->
            if (c.moveToFirst()) UpdateFlow.fromCode(c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)))
            else UpdateFlow.Dl.MISSING
        } ?: UpdateFlow.Dl.MISSING
    }.getOrDefault(UpdateFlow.Dl.MISSING)

    /** Android 8+: ứng dụng phải được phép cài ứng dụng khác. Chưa được thì mở trang cho phép. */
    fun canInstall(activity: Activity): Boolean {
        if (activity.packageManager.canRequestPackageInstalls()) return true
        status = "Bật «Cho phép từ nguồn này» cho TyZo Sub, rồi quay lại bấm Cập nhật ngay."
        runCatching {
            activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}")))
        }
        return false
    }

    /**
     * Gọi khi quay lại màn hình (onResume): tin «tải xong» có thể đã đến lúc ứng dụng bị tắt hoặc trước khi đăng ký nhận.
     * Hỏi trạng thái thật của lượt đã lưu rồi xử lý; không có lượt nào thì không làm gì.
     */
    fun resume(context: Context) {
        val app = context.applicationContext
        val id = storedId(app)
        if (id < 0) return
        val dm = app.getSystemService(DownloadManager::class.java)
        apply(app, dm, id, UpdateFlow.decide(id, query(dm, id)), storedName(app))
    }

    fun start(activity: Activity, url: String, name: String) {
        val context = activity.applicationContext
        val dm = context.getSystemService(DownloadManager::class.java)
        val old = storedId(context)
        val step = UpdateFlow.decide(old, if (old < 0) null else query(dm, old))
        if (step != UpdateFlow.Step.StartNew && step != UpdateFlow.Step.Gone && step != UpdateFlow.Step.Failed) {
            apply(context, dm, old, step, name)   // đang tải thì chờ; đã tải xong (lỡ tin) thì mở màn cài
            return
        }
        if (step != UpdateFlow.Step.StartNew) apply(context, dm, old, step, name)   // dọn lượt hỏng/đã hủy
        if (!canInstall(activity)) return
        File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), FILE).delete()
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("TyZo Sub $name")
            .setDescription("Đang tải bản cập nhật")
            .setMimeType("application/vnd.android.package-archive")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, FILE)
        // RE8-007: đăng ký nhận tin TRƯỚC khi gửi lệnh tải, để không lỡ tin của lượt tải rất nhanh.
        listen(context, dm)
        val id = runCatching { dm.enqueue(request) }.getOrElse {
            status = "Chưa tải được bản mới. Thử lại sau."
            unlisten(context)
            return
        }
        remember(context, id, name)
        status = UpdateFlow.message(UpdateFlow.Step.Wait, name)
        // Tin có thể đã đến trước khi lưu mã: hỏi lại một lần ngay sau khi lưu.
        val now = UpdateFlow.decide(id, query(dm, id))
        if (now != UpdateFlow.Step.Wait) apply(context, dm, id, now, name)
    }

    private fun listen(context: Context, dm: DownloadManager) {
        if (receiver != null) return
        val r = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                val id = storedId(c)
                if (!UpdateFlow.accepts(id, intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L))) return
                apply(c.applicationContext, dm, id, UpdateFlow.decide(id, query(dm, id)), storedName(c))
            }
        }
        receiver = r
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        // Tin «tải xong» do hệ thống gửi nên phải nhận từ bên ngoài ứng dụng.
        if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
        else context.registerReceiver(r, filter)
    }

    private fun unlisten(context: Context) {
        receiver?.let { runCatching { context.unregisterReceiver(it) } }
        receiver = null
    }

    private fun apply(context: Context, dm: DownloadManager, id: Long, step: UpdateFlow.Step, name: String) {
        if (step == UpdateFlow.Step.Wait) {
            status = UpdateFlow.message(step, name)
            listen(context, dm)   // ứng dụng vừa khởi động lại: nhận tin cho lượt đang tải
            return
        }
        if (step == UpdateFlow.Step.StartNew) return
        unlisten(context)
        forget(context)
        status = UpdateFlow.message(step, name)
        if (step == UpdateFlow.Step.Failed) runCatching { dm.remove(id) }
        if (step != UpdateFlow.Step.Install) return
        val uri = runCatching { dm.getUriForDownloadedFile(id) }.getOrNull()
        if (uri == null) {
            status = UpdateFlow.message(UpdateFlow.Step.Failed, name)
            return
        }
        val install = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(install) }.onFailure {
            status = "Không mở được màn cài. Tải tệp cài ở trang Tài khoản trên web."
        }
    }
}
