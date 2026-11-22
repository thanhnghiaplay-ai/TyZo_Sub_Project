package vn.tyzo.sub.thu

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Bước thử Android: bấm Bắt đầu, mở video ở Bilibili / YouTube / TikTok,
 * xem thanh mức âm có nhảy không. Không nhảy = ứng dụng đó chặn thu.
 */
class MainActivity : Activity() {

    companion object {
        private const val REQ_PERMISSIONS = 10
        private const val REQ_CAPTURE = 11
        private const val PREFS = "ket_qua"
        private const val KEY_LOG = "log"
        private const val VERDICT_AFTER_MS = 8_000L
        private val APPS = listOf("Bilibili", "YouTube", "TikTok", "Khác")
    }

    private val ui = Handler(Looper.getMainLooper())
    private lateinit var appGroup: RadioGroup
    private lateinit var button: Button
    private lateinit var meter: ProgressBar
    private lateinit var levelText: TextView
    private lateinit var statsText: TextView
    private lateinit var verdictText: TextView
    private lateinit var logText: TextView
    private var wasRunning = false
    private var testingApp = APPS[0]

    private val tick = object : Runnable {
        override fun run() {
            render()
            ui.postDelayed(this, 100)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        BuildConfigInfo.init(this)
        setContentView(buildLayout())
        renderLog()
    }

    override fun onResume() {
        super.onResume()
        ui.post(tick)
    }

    override fun onPause() {
        ui.removeCallbacks(tick)
        super.onPause()
    }

    // ---------- Giao diện (dựng bằng mã, không cần thư viện) ----------

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun text(size: Float, bold: Boolean = false, value: String = "") = TextView(this).apply {
        textSize = size
        text = value
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(6), 0, dp(6))
    }

    private fun buildLayout(): View {
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
        }
        col.addView(text(22f, bold = true, value = "Thử thu âm ứng dụng khác"))
        col.addView(text(14f, value = "Bản thử ${BuildConfigInfo.versionName()}. Chỉ đo mức âm thanh để biết " +
                "Bilibili, YouTube, TikTok có cho thu không. Không quay hình, không lưu tiếng, không gửi gì " +
                "ra ngoài (ứng dụng không có quyền dùng mạng)."))

        col.addView(text(16f, bold = true, value = "1. Đang thử ứng dụng nào"))
        appGroup = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
        APPS.forEachIndexed { i, name ->
            appGroup.addView(RadioButton(this).apply {
                id = View.generateViewId()
                text = name
                tag = name
                isChecked = i == 0
                setPadding(0, 0, dp(8), 0)
            })
        }
        appGroup.setOnCheckedChangeListener { g, checkedId ->
            testingApp = g.findViewById<RadioButton>(checkedId)?.tag as? String ?: APPS.last()
        }
        col.addView(appGroup)

        col.addView(text(16f, bold = true, value = "2. Bấm Bắt đầu, rồi mở video có tiếng"))
        col.addView(text(13f, value = "Khi Android hỏi chia sẻ, chọn «Toàn bộ màn hình» nếu có lựa chọn này. " +
                "Để video chạy khoảng 15 giây rồi quay lại đây."))
        button = Button(this).apply {
            textSize = 18f
            setOnClickListener { onButton() }
        }
        col.addView(button, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(56)))

        col.addView(text(16f, bold = true, value = "3. Mức âm thanh thu được"))
        meter = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = (-CaptureState.FLOOR_DB).toInt()
        }
        col.addView(meter, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(28)))
        levelText = text(15f)
        statsText = text(14f)
        verdictText = text(17f, bold = true).apply { gravity = Gravity.START }
        col.addView(levelText)
        col.addView(statsText)
        col.addView(verdictText)

        col.addView(text(16f, bold = true, value = "Kết quả các lần thử (chụp màn hình phần này gửi lại)"))
        logText = text(14f).apply { setTextIsSelectable(true) }
        col.addView(logText)
        col.addView(Button(this).apply {
            text = "Xóa kết quả"
            setOnClickListener {
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(KEY_LOG).apply()
                renderLog()
            }
        })
        col.addView(text(12f, value = "Máy: ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"))

        return ScrollView(this).apply { addView(col) }
    }

    private fun render() {
        val s = CaptureState
        val running = s.running
        button.text = if (running) "Dừng" else "Bắt đầu thu"

        val db = if (running) s.levelDb else CaptureState.FLOOR_DB
        meter.progress = (db - CaptureState.FLOOR_DB).toInt().coerceIn(0, meter.max)
        levelText.text = if (running) "Bây giờ: ${db.toInt()} dB" else "Chưa thu."

        if (s.startedAtMs > 0) {
            val elapsed = (if (running) System.currentTimeMillis() else lastStopMs) - s.startedAtMs
            statsText.text = "Đã thu ${elapsed / 1000} giây · có tiếng ${s.soundMs / 1000} giây · " +
                    "lớn nhất ${s.peakDb.toInt()} dB"
            verdictText.text = when {
                elapsed < VERDICT_AFTER_MS && running -> "Đang nghe…"
                s.soundMs >= 2_000 -> "✅ Thu được tiếng."
                else -> "❌ Chưa nghe được tiếng. Nếu video đang phát có tiếng mà thanh không nhúc nhích, " +
                        "ứng dụng này chặn thu."
            }
        } else {
            statsText.text = ""
            verdictText.text = ""
        }
        s.error?.let { verdictText.text = "⚠️ $it" }

        if (wasRunning && !running) onStopped()
        wasRunning = running
    }

    private var lastStopMs = 0L

    // ---------- Bắt đầu / dừng ----------

    private fun onButton() {
        if (CaptureState.running) {
            CaptureService.stop(this)
            return
        }
        CaptureState.error = null
        val needed = mutableListOf<String>()
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            needed += android.Manifest.permission.RECORD_AUDIO
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            needed += android.Manifest.permission.POST_NOTIFICATIONS
        }
        if (needed.isEmpty()) askCapture() else requestPermissions(needed.toTypedArray(), REQ_PERMISSIONS)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQ_PERMISSIONS) return
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            askCapture()
        } else {
            CaptureState.error = "Cần quyền ghi âm để đo âm thanh. Mở Cài đặt → Ứng dụng → TyZo Thử thu âm → Quyền."
        }
    }

    private fun askCapture() {
        val manager = getSystemService(MediaProjectionManager::class.java)
        @Suppress("DEPRECATION")
        startActivityForResult(manager.createScreenCaptureIntent(), REQ_CAPTURE)
    }

    @Deprecated("Activity thường, không dùng AndroidX")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_CAPTURE) return
        if (resultCode != RESULT_OK || data == null) {
            CaptureState.error = "Đã không cho chia sẻ, chưa thu."
            return
        }
        startForegroundService(
            Intent(this, CaptureService::class.java)
                .putExtra(CaptureService.EXTRA_RESULT_CODE, resultCode)
                .putExtra(CaptureService.EXTRA_DATA, data),
        )
    }

    // ---------- Ghi lại kết quả mỗi lần ----------

    private fun onStopped() {
        lastStopMs = System.currentTimeMillis()
        val s = CaptureState
        if (s.startedAtMs == 0L) return
        val seconds = (lastStopMs - s.startedAtMs) / 1000
        if (seconds < 1) return
        val ok = s.soundMs >= 2_000
        val time = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(Date(s.startedAtMs))
        val line = "$time · $testingApp · ${if (ok) "✅ thu được" else "❌ không nghe được"} · " +
                "${seconds}s, có tiếng ${s.soundMs / 1000}s, lớn nhất ${s.peakDb.toInt()} dB"
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val old = prefs.getString(KEY_LOG, "") ?: ""
        prefs.edit().putString(KEY_LOG, (line + "\n" + old).lines().take(30).joinToString("\n").trim()).apply()
        renderLog()
    }

    private fun renderLog() {
        val log = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_LOG, "") ?: ""
        logText.text = log.ifBlank { "Chưa có lần thử nào." }
    }
}
