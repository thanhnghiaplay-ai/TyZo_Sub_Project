package vn.tyzo.sub

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.InputType
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.TextView
import java.text.NumberFormat
import java.util.Locale

/**
 * Màn hình chính. Chưa liên kết: gõ địa chỉ web và mã liên kết (lấy ở trang Tài khoản).
 * Đã liên kết: chọn ngôn ngữ, cỡ chữ, rồi Bắt đầu; phụ đề nổi hiện trên ứng dụng đang phát video.
 */
class MainActivity : Activity() {

    companion object {
        private const val REQ_PERMISSIONS = 10
        private const val REQ_CAPTURE = 11
    }

    private lateinit var prefs: Prefs
    private val ui = Handler(Looper.getMainLooper())
    private val number = NumberFormat.getInstance(Locale("vi", "VN"))

    private var me: Me? = null
    private var note = ""

    // Phần cần cập nhật liên tục trên màn đã liên kết.
    private var startButton: Button? = null
    private var statusText: TextView? = null
    private var balanceText: TextView? = null
    private var meter: ProgressBar? = null
    private var lastPhase: LiveState.Phase? = null

    private val tick = object : Runnable {
        override fun run() {
            refreshLive()
            ui.postDelayed(this, 300)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        render()
    }

    override fun onResume() {
        super.onResume()
        ui.post(tick)
        if (prefs.linked) loadMe()
        render()
    }

    override fun onPause() {
        ui.removeCallbacks(tick)
        super.onPause()
    }

    // ---------- Dựng màn hình ----------

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun label(size: Float, value: String = "", bold: Boolean = false) = TextView(this).apply {
        textSize = size
        text = value
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(6), 0, dp(6))
    }

    private fun button(value: String, onClick: () -> Unit) = Button(this).apply {
        text = value
        isAllCaps = false
        textSize = 16f
        setOnClickListener { onClick() }
    }

    private fun column(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(20), dp(20), dp(32))
    }

    private fun full() = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)

    private fun render() {
        startButton = null
        statusText = null
        balanceText = null
        meter = null
        lastPhase = null
        val col = column()
        col.addView(label(24f, "TyZo Sub", bold = true))
        col.addView(label(14f, "Phụ đề dịch ngay trên video đang phát ở Bilibili, YouTube, TikTok và ứng dụng khác."))
        if (prefs.linked) buildMain(col) else buildLink(col)
        if (note.isNotEmpty()) col.addView(label(14f, note).apply { setTextColor(0xFFD93F3F.toInt()) })
        col.addView(label(12f, "Bản ${BuildConfig.VERSION_NAME} · ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE}"))
        setContentView(ScrollView(this).apply { addView(col) })
        refreshLive()
    }

    private fun buildLink(col: LinearLayout) {
        col.addView(label(18f, "Liên kết tài khoản", bold = true))
        col.addView(label(14f, "1. Trên web (máy tính hoặc điện thoại), đăng nhập rồi mở Tài khoản → Ứng dụng Android.\n" +
                "2. Bấm «Lấy mã liên kết». Mã có 8 ký tự, dùng được 10 phút.\n" +
                "3. Gõ địa chỉ web và mã vào hai ô dưới, bấm Liên kết."))
        col.addView(label(14f, "Địa chỉ web"))
        val web = EditText(this).apply {
            setText(prefs.web)
            hint = "ví dụ: tyzo.vn"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            isSingleLine = true
        }
        col.addView(web, full())
        col.addView(label(14f, "Mã liên kết"))
        val code = EditText(this).apply {
            hint = "ABCD-EFGH"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            isSingleLine = true
            textSize = 22f
        }
        col.addView(code, full())
        lateinit var go: Button
        go = button("Liên kết") {
            val base = Api.normalizeWeb(web.text.toString())
            if (base == null) {
                note = "Địa chỉ web không đúng. Gõ dạng tyzo.vn hoặc https://…"
                render()
                return@button
            }
            go.isEnabled = false
            note = ""
            val name = "${Build.MANUFACTURER} ${Build.MODEL}"
            Thread {
                try {
                    val (token, email) = Api.link(base, code.text.toString(), name)
                    runOnUiThread {
                        prefs.web = base
                        prefs.token = token
                        prefs.email = email
                        note = ""
                        loadMe()
                        render()
                    }
                } catch (e: ApiError) {
                    runOnUiThread {
                        note = e.message ?: "Chưa liên kết được."
                        render()
                    }
                }
            }.start()
        }
        col.addView(go, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56)))
        col.addView(guideButton { web.text.toString() }, full())
    }

    private fun buildMain(col: LinearLayout) {
        col.addView(label(15f, "Tài khoản: ${me?.email?.ifBlank { null } ?: prefs.email}"))
        balanceText = label(16f, bold = true)
        col.addView(balanceText)

        col.addView(label(16f, "Dịch sang", bold = true))
        col.addView(spinner(Langs.ALL.map { it.name }, Langs.ALL.indexOfFirst { it.code == prefs.target }) {
            prefs.target = Langs.ALL[it].code
        }, full())

        col.addView(label(16f, "Tiếng trong video", bold = true))
        val sources = listOf(Lang("", "Tự nhận diện")) + Langs.ALL
        col.addView(spinner(sources.map { it.name }, sources.indexOfFirst { it.code == prefs.source }) {
            prefs.source = sources[it].code
        }, full())

        val models = me?.models?.takeIf { it.isNotEmpty() } ?: listOf(Models.M38, Models.M35)
        if (prefs.model !in models) prefs.model = models.first()
        col.addView(label(16f, "Model", bold = true))
        col.addView(spinner(models.map { Models.name(it) }, models.indexOf(prefs.model)) {
            prefs.model = models[it]
        }, full())

        val sizeLabel = label(16f, "Cỡ chữ phụ đề: ${prefs.textSize}", bold = true)
        col.addView(sizeLabel)
        col.addView(SeekBar(this).apply {
            max = 36 - 14
            progress = prefs.textSize - 14
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(s: SeekBar?, value: Int, fromUser: Boolean) {
                    prefs.textSize = value + 14
                    sizeLabel.text = "Cỡ chữ phụ đề: ${prefs.textSize}"
                }
                override fun onStartTrackingTouch(s: SeekBar?) {}
                override fun onStopTrackingTouch(s: SeekBar?) {}
            })
        }, full())
        col.addView(CheckBox(this).apply {
            text = "Hiện cả chữ gốc"
            isChecked = prefs.showSource
            setOnCheckedChangeListener { _, checked -> prefs.showSource = checked }
        })

        if (!Settings.canDrawOverlays(this)) {
            col.addView(label(14f, "Cần cho phép hiện phụ đề trên ứng dụng khác."))
            col.addView(button("Cho phép hiện trên ứng dụng khác") {
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            }, full())
        }

        col.addView(label(16f, "Cách dùng", bold = true))
        col.addView(label(14f, "1. Bấm Bắt đầu. Android hỏi chia sẻ: chọn «Toàn bộ màn hình» nếu có. Ứng dụng chỉ lấy tiếng, không quay hình.\n" +
                "2. Mở video có tiếng ở Bilibili, YouTube, TikTok… Phụ đề hiện nổi trên video.\n" +
                "3. Kéo khung phụ đề lên xuống để đổi chỗ. Bấm «■ Dừng» trên khung hoặc nút Dừng ở đây khi xong.\n" +
                "Token dịch trừ theo thời gian nghe, kể cả lúc video im lặng."))
        startButton = button("Bắt đầu") { onStartStop() }.apply { textSize = 18f }
        col.addView(startButton, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(60)))
        meter = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { max = 90 }
        col.addView(meter, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(16)))
        statusText = label(15f)
        col.addView(statusText)

        col.addView(View(this), LinearLayout.LayoutParams(1, dp(24)))
        col.addView(guideButton { prefs.web }, full())
        col.addView(button("Gỡ liên kết máy này") {
            if (LiveState.running) LiveService.stop(this)
            val web = prefs.web
            val token = prefs.token
            Thread { Api.unlink(web, token) }.start()
            prefs.unlink()
            me = null
            note = "Đã gỡ liên kết."
            render()
        }, full())
    }

    /** Mở trang hướng dẫn trên web bằng trình duyệt. Chưa có địa chỉ web thì dùng ô đang gõ. */
    private fun guideButton(webOf: () -> String) = button("Xem hướng dẫn trên web") {
        val base = Api.normalizeWeb(webOf())
        if (base == null) {
            note = "Gõ địa chỉ web trước, rồi bấm Xem hướng dẫn."
            render()
            return@button
        }
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$base/huong-dan#ung-dung-android"))) }
            .onFailure {
                note = "Máy chưa có trình duyệt để mở hướng dẫn."
                render()
            }
    }

    private fun spinner(items: List<String>, selected: Int, onPick: (Int) -> Unit) = Spinner(this).apply {
        adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, items)
        setSelection(selected.coerceAtLeast(0))
        onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = onPick(position)
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun refreshLive() {
        if (LiveState.unlinked && prefs.linked) {
            LiveState.unlinked = false
            prefs.unlink()
            note = "Máy này đã bị gỡ liên kết. Hãy lấy mã mới ở trang Tài khoản."
            render()
            return
        }
        val phase = LiveState.phase
        startButton?.text = when (phase) {
            LiveState.Phase.IDLE -> "Bắt đầu"
            LiveState.Phase.STOPPING -> "Đang kết thúc…"
            else -> "Dừng"
        }
        startButton?.isEnabled = phase != LiveState.Phase.STOPPING
        meter?.progress = if (LiveState.running) (LiveState.levelDb + 90).toInt().coerceIn(0, 90) else 0
        val per = LiveState.perMinute
        statusText?.text = buildString {
            append(LiveState.status)
            if (LiveState.phase == LiveState.Phase.LIVE && LiveState.startedAtMs > 0) {
                val s = (System.currentTimeMillis() - LiveState.startedAtMs) / 1000
                append(" · ${s / 60}:${String.format(Locale.ROOT, "%02d", s % 60)}")
            }
            if (per > 0) append("\nKhoảng ${number.format(per)} Token dịch mỗi phút.")
        }
        balanceText?.text = me?.let { "Token dịch còn: ${number.format(it.balance)}" } ?: "Token dịch: đang tải…"
        if (lastPhase != null && lastPhase != LiveState.Phase.IDLE && phase == LiveState.Phase.IDLE) loadMe()
        lastPhase = phase
    }

    private fun loadMe() {
        val web = prefs.web
        val token = prefs.token
        if (web.isBlank() || token.isBlank()) return
        Thread {
            try {
                val got = Api.me(web, token)
                runOnUiThread {
                    val changed = me?.models != got.models
                    me = got
                    if (got.email.isNotBlank()) prefs.email = got.email
                    if (changed && !LiveState.running) render() else refreshLive()
                }
            } catch (e: ApiError) {
                runOnUiThread {
                    if (e.status == 401) {
                        prefs.unlink()
                        note = e.message ?: "Máy này đã bị gỡ liên kết."
                        render()
                    } else {
                        balanceText?.text = e.message
                    }
                }
            }
        }.start()
    }

    // ---------- Bắt đầu / dừng ----------

    private fun onStartStop() {
        if (LiveState.running) {
            LiveService.stop(this)
            return
        }
        note = ""
        if (!Settings.canDrawOverlays(this)) {
            LiveState.status = "Hãy bấm «Cho phép hiện trên ứng dụng khác» trước."
            return
        }
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
            LiveState.status = "Cần quyền ghi âm để nghe video. Mở Cài đặt → Ứng dụng → TyZo Sub → Quyền."
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
            LiveState.status = "Đã không cho chia sẻ, chưa bắt đầu."
            return
        }
        LiveState.status = "Đang mở phiên dịch…"
        startForegroundService(
            Intent(this, LiveService::class.java)
                .putExtra(LiveService.EXTRA_RESULT_CODE, resultCode)
                .putExtra(LiveService.EXTRA_DATA, data),
        )
    }
}
