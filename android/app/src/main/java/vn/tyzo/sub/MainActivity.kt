package vn.tyzo.sub

import android.app.Activity
import android.app.AlertDialog
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.webkit.MimeTypeMap
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Màn hình chính, cùng màu, font và kiểu thẻ với web.
 * Chưa liên kết: gõ địa chỉ web và mã liên kết (lấy ở Tài khoản → Ứng dụng Android).
 * Đã liên kết: Token dịch, chọn ngôn ngữ, từ cần giữ đúng, tùy chỉnh phụ đề, Bắt đầu/Dừng, phiên gần nhất.
 */
class MainActivity : Activity() {

    companion object {
        private const val REQ_PERMISSIONS = 10
        private const val REQ_CAPTURE = 11
    }

    private lateinit var prefs: Prefs
    private lateinit var ui: Ui
    private val handler = Handler(Looper.getMainLooper())
    private val number = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"))

    private var me: Me? = null
    /** Lịch sử chung với web: null = chưa tải, lỗi thì [historyError]. */
    private var history: List<HistoryItem>? = null
    private var historyError = ""
    private var historyBox: LinearLayout? = null
    private var note = ""

    // Phần cập nhật liên tục.
    private var startButton: Button? = null
    private var statusText: TextView? = null
    private var balanceText: TextView? = null
    private var meter: ProgressBar? = null
    private var lastPhase: LiveState.Phase? = null
    private var updateText: TextView? = null

    private val tick = object : Runnable {
        override fun run() {
            refreshLive()
            handler.postDelayed(this, 300)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        render()
    }

    override fun onResume() {
        super.onResume()
        handler.post(tick)
        if (prefs.linked) {
            loadMe()
            loadHistory()
        }
        render()
    }

    override fun onPause() {
        handler.removeCallbacks(tick)
        super.onPause()
    }

    // ---------- Dựng màn hình ----------

    private fun render() {
        ui = Ui(this)
        startButton = null
        historyBox = null
        updateText = null
        statusText = null
        balanceText = null
        meter = null
        lastPhase = null
        window.statusBarColor = ui.p.bg
        window.navigationBarColor = ui.p.bg

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(ui.dp(16), ui.dp(20), ui.dp(16), ui.dp(32))
        }
        col.addView(header())
        updateCard()?.let { col.addView(it, ui.full(16)) }
        if (note.isNotEmpty()) col.addView(ui.text(note, 14f, ui.p.error), ui.full(12))
        if (prefs.linked) buildMain(col) else buildLink(col)
        col.addView(
            ui.muted("Bản ${BuildConfig.VERSION_NAME} · ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE}", 12f)
                .apply { gravity = Gravity.CENTER },
            ui.full(20),
        )
        setContentView(ScrollView(this).apply {
            setBackgroundColor(ui.p.bg)
            isFillViewport = true
            addView(col)
        })
        refreshLive()
    }

    /** Đầu trang như web: logo, dòng nhỏ màu nhấn, tiêu đề. */
    private fun header(): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        row.addView(View(this).apply { background = getDrawable(R.drawable.ic_logo) }, LinearLayout.LayoutParams(ui.dp(44), ui.dp(44)))
        val titles = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(ui.dp(12), 0, 0, 0)
        }
        titles.addView(ui.eyebrow("TYZO SUB · CÔNG CỤ PHỤ ĐỀ AI"))
        titles.addView(ui.text("Phụ đề trên video", 20f, bold = true))
        row.addView(titles)
        return row
    }

    /** Web báo có bản mới hơn bản đang cài. */
    private fun updateCard(): View? {
        val app = me?.app ?: return null
        if (app.code <= BuildConfig.VERSION_CODE) return null
        val card = ui.card().apply { background = ui.round(ui.p.card, 16f, ui.p.accent) }
        card.addView(ui.text("Có bản mới ${app.name}", 16f, bold = true))
        if (app.url.isNotBlank()) {
            card.addView(ui.muted("Bấm Cập nhật ngay: ứng dụng tự tải rồi mở màn cài, bạn chỉ bấm «Cài đặt». " +
                "Máy báo «không cài đặt được» thì gỡ bản đang cài rồi cài lại (một lần, khi đổi khóa ký)."), ui.full(4))
            updateText = ui.text(Updater.status, 13f, ui.p.accent)
            card.addView(updateText, ui.full(6))
            card.addView(ui.primary("Cập nhật ngay") {
                Updater.start(this, app.url, app.name)
                updateText?.text = Updater.status
            }, ui.full(10))
            card.addView(ui.secondary("Tải bằng trình duyệt") { open(app.url) }, ui.full(8))
        } else {
            card.addView(ui.muted("Lấy tệp cài ở trang Tài khoản trên web, mục Ứng dụng Android."), ui.full(4))
        }
        return card
    }

    private fun section(col: LinearLayout, title: String, eyebrow: String? = null): LinearLayout {
        val card = ui.card()
        if (eyebrow != null) card.addView(ui.eyebrow(eyebrow))
        card.addView(ui.text(title, 17f, bold = true))
        col.addView(card, ui.full(16))
        return card
    }

    private fun buildLink(col: LinearLayout) {
        val card = section(col, "Liên kết tài khoản", "BẮT ĐẦU")
        card.addView(ui.muted(
            "1. Trên web, đăng nhập rồi mở Tài khoản → Ứng dụng Android.\n" +
                "2. Bấm «Lấy mã liên kết». Mã có 8 ký tự, dùng được 10 phút.\n" +
                "3. Gõ địa chỉ web và mã vào hai ô dưới, bấm Liên kết.", 14f,
        ), ui.full(8))
        card.addView(ui.text("Địa chỉ web", 14f, ui.p.muted), ui.full(14))
        val web = ui.input("ví dụ: tyzo.vn").apply {
            setText(prefs.web)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        }
        card.addView(web, ui.full(6))
        card.addView(ui.text("Mã liên kết", 14f, ui.p.muted), ui.full(12))
        val code = ui.input("ABCD-EFGH").apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            textSize = 22f
            letterSpacing = 0.15f
            typeface = Theme.semibold(this@MainActivity)
        }
        card.addView(code, ui.full(6))
        lateinit var go: Button
        go = ui.primary("Liên kết") {
            val base = Api.normalizeWeb(web.text.toString())
            if (base == null) {
                note = "Địa chỉ web không đúng. Gõ dạng tyzo.vn hoặc https://…"
                render()
                return@primary
            }
            go.isEnabled = false
            go.text = "Đang liên kết…"
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
        card.addView(go, ui.full(14))
        card.addView(ui.secondary("Xem hướng dẫn trên web") { openWeb(web.text.toString(), "/huong-dan#ung-dung-android") }, ui.full(8))
    }

    private fun buildMain(col: LinearLayout) {
        // Tài khoản và Token dịch.
        val account = section(col, me?.email?.ifBlank { null } ?: prefs.email, "TÀI KHOẢN")
        balanceText = ui.text("", 16f, ui.p.accent, bold = true)
        account.addView(balanceText, ui.full(6))
        account.addView(ui.secondary("Mua Token dịch") { openWeb(prefs.web, "/tai-khoan") }, ui.full(10))

        // Cho phép hiện trên ứng dụng khác.
        if (!Settings.canDrawOverlays(this)) {
            val perm = ui.card().apply { background = ui.round(ui.p.card, 16f, ui.p.warning) }
            perm.addView(ui.text("Cần cho phép hiện phụ đề trên ứng dụng khác", 15f, bold = true))
            perm.addView(ui.muted("Bấm nút dưới, bật quyền cho TyZo Sub rồi quay lại đây."), ui.full(4))
            perm.addView(ui.primary("Cho phép hiện trên ứng dụng khác") {
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            }, ui.full(10))
            col.addView(perm, ui.full(16))
        }

        // Bắt đầu / Dừng.
        val run = section(col, "Dịch video đang phát", "DỊCH TRỰC TIẾP")
        run.addView(ui.muted(
            "1. Mở phim ở Bilibili, YouTube, TikTok… rồi quay lại đây bấm Bắt đầu. Android hỏi chia sẻ: chọn «Toàn bộ màn hình» nếu có. Ứng dụng chỉ lấy tiếng, không quay hình.\n" +
                "2. Ứng dụng tự lùi về phim. Bấm phát, phụ đề hiện nổi trên video.\n" +
                "3. Kéo khung phụ đề lên xuống để đổi chỗ. «⏸ Tạm dừng» / «▶ Tiếp tục» ngay trên khung; «■ Dừng» khi xem xong.\n" +
                "Chỉ trừ Token khi điện thoại đang phát tiếng. Im lặng quá 2 giây hoặc đang Tạm dừng thì không gửi tiếng, không trừ Token.", 14f,
        ), ui.full(8))
        startButton = ui.primary("Bắt đầu") { onStartStop() }.apply { textSize = 17f; minHeight = ui.dp(52) }
        run.addView(startButton, ui.full(14))
        meter = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 90
            progressTintList = ColorStateList.valueOf(ui.p.accent)
            progressBackgroundTintList = ColorStateList.valueOf(ui.p.raised)
        }
        run.addView(meter, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, ui.dp(10)).apply { topMargin = ui.dp(12) })
        statusText = ui.text("", 14f, ui.p.muted)
        run.addView(statusText, ui.full(6))

        // Ngôn ngữ và model.
        val lang = section(col, "Ngôn ngữ", "DỊCH")
        lang.addView(ui.text("Dịch sang", 14f, ui.p.muted), ui.full(10))
        lang.addView(ui.select(Langs.ALL.map { it.name }, Langs.ALL.indexOfFirst { it.code == prefs.target }) {
            prefs.target = Langs.ALL[it].code
        }, ui.full(6))
        lang.addView(ui.text("Tiếng trong video", 14f, ui.p.muted), ui.full(12))
        val sources = listOf(Lang("", "Tự nhận diện")) + Langs.ALL
        lang.addView(ui.select(sources.map { it.name }, sources.indexOfFirst { it.code == prefs.source }) {
            prefs.source = sources[it].code
        }, ui.full(6))
        val models = me?.models?.takeIf { it.isNotEmpty() } ?: listOf(Models.M38, Models.M35)
        if (prefs.model !in models) prefs.model = models.first()
        lang.addView(ui.text("Model", 14f, ui.p.muted), ui.full(12))
        lang.addView(ui.select(models.map { Models.name(it) }, models.indexOf(prefs.model)) { prefs.model = models[it] }, ui.full(6))
        lang.addView(ui.text("Từ cần giữ đúng", 14f, ui.p.muted), ui.full(12))
        lang.addView(ui.muted("Tên nhân vật, thuật ngữ. Mỗi dòng «gốc = cách dịch», tối đa ${Hotwords.MAX} dòng. Áp dụng khi bấm Bắt đầu.", 12f), ui.full(2))
        val words = ui.input("Ví dụ:\n林动 = Lâm Động", multi = true).apply {
            setText(prefs.words)
            setOnFocusChangeListener { _, has -> if (!has) prefs.words = text.toString() }
        }
        lang.addView(words, ui.full(6))
        wordsBox = words
        lang.addView(ui.toggle("Lọc cho giọng nói (bớt nhạc nền, tự chỉnh âm lượng: nhận dạng rõ hơn). Áp dụng khi bấm Bắt đầu.", prefs.voiceFilter) { prefs.voiceFilter = it }, ui.full(10))

        // Tùy chỉnh phụ đề.
        val cap = section(col, "Tùy chỉnh chữ", "PHỤ ĐỀ NỔI")
        cap.addView(ui.text("Cỡ chữ", 14f, ui.p.muted), ui.full(10))
        cap.addView(ui.segmented(Caption.SIZE_LABELS, Caption.SIZES.indexOf(prefs.captionSize)) { prefs.captionSize = Caption.SIZES[it] }, ui.full(6))
        cap.addView(ui.text("Số dòng", 14f, ui.p.muted), ui.full(12))
        cap.addView(ui.segmented(listOf("1", "2", "3", "4"), prefs.captionLines - 1) { prefs.captionLines = it + 1 }, ui.full(6))
        cap.addView(ui.toggle("Hiện cả chữ gốc", prefs.showSource) { prefs.showSource = it }, ui.full(8))
        cap.addView(ui.toggle("Nền đậm (dễ đọc trên video sáng)", prefs.solid) { prefs.solid = it }, ui.full(2))
        cap.addView(ui.toggle("Chỉ hiện câu đã xong (đọc êm, chậm hơn khoảng 1 giây)", prefs.finalOnly) { prefs.finalOnly = it }, ui.full(2))
        cap.addView(ui.muted("Áp dụng từ lần Bắt đầu sau.", 12f), ui.full(4))

        // Phiên gần nhất.
        Session.load(this)?.let { (at, cues) -> sessionCard(col, at, cues) }

        // Lịch sử chung với web (máy chủ giữ 30 phiên gần nhất trong 30 ngày).
        val hist = section(col, "Lịch sử (web và ứng dụng)", "ĐỒNG BỘ")
        hist.addView(ui.muted("Phiên dịch trực tiếp trên web và trên ứng dụng của tài khoản này. Giữ 30 phiên gần nhất trong 30 ngày.", 12f), ui.full(4))
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        hist.addView(box, ui.full(6))
        historyBox = box
        fillHistory()

        // Khác.
        val more = section(col, "Khác")
        more.addView(ui.secondary("Xem hướng dẫn trên web") { openWeb(prefs.web, "/huong-dan#ung-dung-android") }, ui.full(10))
        more.addView(ui.secondary("Điều khoản và chính sách") { openWeb(prefs.web, "/dieu-khoan") }, ui.full(8))
        more.addView(ui.danger("Gỡ liên kết máy này") {
            if (LiveState.running) LiveService.stop(this)
            val web = prefs.web
            val token = prefs.token
            Thread { Api.unlink(web, token) }.start()
            prefs.unlink()
            history = null
            me = null
            note = "Đã gỡ liên kết."
            render()
        }, ui.full(8))
    }

    private var wordsBox: TextView? = null

    private fun sessionCard(col: LinearLayout, at: Long, cues: List<Cue>) {
        val card = section(col, "Phiên gần nhất", "LƯU TRÊN MÁY")
        val time = SimpleDateFormat("HH:mm dd/MM", Locale.ROOT).format(Date(at))
        card.addView(ui.muted("${cues.size} câu, bắt đầu lúc $time. Tải về thư mục Tải xuống hoặc gửi sang ứng dụng khác."), ui.full(4))
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        listOf("srt", "vtt", "txt").forEachIndexed { i, format ->
            row.addView(ui.secondary(format.uppercase()) { saveFile(cues, at, format) },
                LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = ui.dp(6) })
        }
        card.addView(row, ui.full(10))
        card.addView(ui.secondary("Gửi SRT sang ứng dụng khác") { sendSrt(cues, at) }, ui.full(8))
        card.addView(ui.danger("Xóa bản lưu") {
            Session.clear(this)
            render()
        }, ui.full(8))
    }

    /** Gửi phiên gần nhất nếu chưa gửi, rồi tải danh sách lịch sử. */
    private fun loadHistory() {
        val web = prefs.web
        val token = prefs.token
        val app = applicationContext
        Thread {
            runCatching { Session.sync(app, web, token) }
            val result = runCatching { Api.historyList(web, token) }
            runOnUiThread {
                result.onSuccess { history = it; historyError = "" }
                    .onFailure { historyError = it.message ?: "Chưa tải được lịch sử." }
                fillHistory()
            }
        }.start()
    }

    private fun fillHistory() {
        val box = historyBox ?: return
        box.removeAllViews()
        val list = history
        if (list == null) {
            box.addView(ui.muted(historyError.ifBlank { "Đang tải…" }))
            if (historyError.isNotBlank()) box.addView(ui.secondary("Thử lại") { historyError = ""; fillHistory(); loadHistory() }, ui.full(8))
            return
        }
        if (list.isEmpty()) {
            box.addView(ui.muted("Chưa có phiên nào. Phiên dịch xong sẽ tự lưu vào đây."))
            return
        }
        list.forEach { item -> box.addView(historyRow(item), ui.full(10)) }
        box.addView(ui.danger("Xóa hết lịch sử") {
            confirm("Xóa hết lịch sử?", "Mọi phiên bị xóa khỏi máy chủ, ở cả web và ứng dụng. Không lấy lại được.") { removeHistory(null) }
        }, ui.full(12))
    }

    private fun historyRow(item: HistoryItem): LinearLayout {
        val row = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val at = runCatching { java.time.Instant.parse(item.startedAt).toEpochMilli() }.getOrDefault(0L)
        val time = SimpleDateFormat("HH:mm dd/MM", Locale.ROOT).format(Date(at))
        val secs = item.durationMs / 1000
        val length = if (secs < 60) "$secs giây" else "${secs / 60} phút"
        val via = if (item.via == "app") "Ứng dụng" else "Web"
        row.addView(ui.text("$via · $time · ${item.lines} câu · $length", 14f, bold = true))
        if (item.preview.isNotBlank()) row.addView(ui.muted(item.preview, 12f).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }, ui.full(2))
        val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        listOf("srt", "vtt", "txt", "gửi", "xóa").forEachIndexed { i, action ->
            val label = action.uppercase(Locale.ROOT).let { if (action == "gửi") "Gửi" else if (action == "xóa") "Xóa" else it }
            val tap: () -> Unit = when (action) {
                "xóa" -> { { confirm("Xóa phiên này?", "Chữ của phiên bị xóa khỏi máy chủ, ở cả web và ứng dụng. Không lấy lại được.") { removeHistory(item.id) } } }
                "gửi" -> { { withHistory(item) { at2, cues -> sendSrt(cues, at2) } } }
                else -> { { withHistory(item) { at2, cues -> saveFile(cues, at2, action) } } }
            }
            val view = if (action == "xóa") ui.danger(label, tap) else ui.secondary(label, tap)
            buttons.addView(view, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = ui.dp(4) })
        }
        row.addView(buttons, ui.full(6))
        return row
    }

    /** Tải chữ của một phiên từ máy chủ rồi làm việc [then] trên luồng giao diện. */
    private fun withHistory(item: HistoryItem, then: (Long, List<Cue>) -> Unit) {
        val web = prefs.web
        val token = prefs.token
        LiveState.status = "Đang tải phiên…"
        refreshLive()
        Thread {
            val result = runCatching { Api.historyRead(web, token, item.id) }
            runOnUiThread {
                result.onSuccess { (at, cues) -> then(at, cues) }
                    .onFailure { LiveState.status = it.message ?: "Chưa tải được phiên này."; refreshLive() }
            }
        }.start()
    }

    private fun removeHistory(id: String?) {
        val web = prefs.web
        val token = prefs.token
        Thread {
            val result = runCatching { Api.historyDelete(web, token, id) }
            runOnUiThread {
                result.onFailure { LiveState.status = it.message ?: "Chưa xóa được."; refreshLive() }
                loadHistory()
            }
        }.start()
    }

    private fun confirm(title: String, body: String, yes: () -> Unit) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(body)
            .setNegativeButton("Hủy", null)
            .setPositiveButton("Xóa") { _, _ -> yes() }
            .show()
    }

    private fun sendSrt(cues: List<Cue>, at: Long) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, Session.name("srt", at))
            putExtra(Intent.EXTRA_TEXT, Session.export(cues, "srt"))
        }
        runCatching { startActivity(Intent.createChooser(send, "Gửi phụ đề")) }
    }

    /** Lưu vào Tải xuống (Android 10+ không cần quyền bộ nhớ). Có BOM để Notepad cũ đọc đúng tiếng Việt, như web. */
    private fun saveFile(cues: List<Cue>, at: Long, format: String) {
        val name = Session.name(format, at)
        val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(format) ?: "text/plain"
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, name)
            put(MediaStore.Downloads.MIME_TYPE, mime)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val ok = runCatching {
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("insert")
            contentResolver.openOutputStream(uri)!!.use { it.write(("﻿" + Session.export(cues, format)).toByteArray(Charsets.UTF_8)) }
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            contentResolver.update(uri, values, null, null)
        }.isSuccess
        LiveState.status = if (ok) "Đã lưu $name vào Tải xuống." else "Chưa lưu được tệp. Hãy dùng nút Gửi."
        note = ""
        refreshLive()
    }

    private fun open(url: String) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }.onFailure {
            note = "Máy chưa có trình duyệt để mở trang này."
            render()
        }
    }

    /** Mở một trang của web bằng trình duyệt. */
    private fun openWeb(rawWeb: String, path: String) {
        val base = Api.normalizeWeb(rawWeb)
        if (base == null) {
            note = "Gõ địa chỉ web trước."
            render()
            return
        }
        open(base + path)
    }

    private fun refreshLive() {
        if (LiveState.unlinked && prefs.linked) {
            LiveState.unlinked = false
            prefs.unlink()
            history = null
            note = "Máy này đã bị gỡ liên kết hoặc lâu không dùng. Hãy lấy mã mới ở trang Tài khoản."
            render()
            return
        }
        val phase = LiveState.phase
        startButton?.text = when (phase) {
            LiveState.Phase.IDLE -> "Bắt đầu"
            LiveState.Phase.STARTING -> "Đang mở…  (bấm để hủy)"
            LiveState.Phase.STOPPING -> "Đang kết thúc…"
            else -> "Dừng"
        }
        startButton?.isEnabled = phase != LiveState.Phase.STOPPING
        updateText?.text = Updater.status
        meter?.progress = if (LiveState.running) (LiveState.levelDb + 90).toInt().coerceIn(0, 90) else 0
        val per = LiveState.perMinute
        statusText?.text = buildString {
            append(LiveState.status.ifBlank { "Sẵn sàng." })
            if (phase == LiveState.Phase.LIVE && LiveState.startedAtMs > 0) {
                val s = (System.currentTimeMillis() - LiveState.startedAtMs) / 1000
                append(" · ${s / 60}:${String.format(Locale.ROOT, "%02d", s % 60)}")
            }
            if (per > 0) append("\nKhoảng ${number.format(per)} Token dịch mỗi phút.")
        }
        balanceText?.text = me?.let {
            val minutes = if (per > 0) " · khoảng ${number.format(it.balance / per)} phút" else ""
            "Token dịch còn: ${number.format(it.balance)}$minutes"
        } ?: "Token dịch: đang tải…"
        if (lastPhase != null && lastPhase != LiveState.Phase.IDLE && phase == LiveState.Phase.IDLE) {
            loadMe()
            // Phiên vừa xong: dịch vụ đang gửi lên lịch sử, chờ chút rồi tải lại danh sách.
            handler.postDelayed({ if (prefs.linked) loadHistory() }, 2500)
            render()
            return
        }
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
                    val changed = me?.models != got.models || me?.app != got.app || me == null
                    me = got
                    if (got.email.isNotBlank()) prefs.email = got.email
                    if (changed && !LiveState.running) render() else refreshLive()
                }
            } catch (e: ApiError) {
                runOnUiThread {
                    if (e.status == 401) {
                        prefs.unlink()
                        history = null
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
        wordsBox?.let { prefs.words = it.text.toString() }
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
        // Lùi về ứng dụng đang xem phim, khách khỏi phải tự chuyển. Phụ đề nổi hiện trên phim;
        // lúc chưa phát (im lặng) ứng dụng không gửi tiếng nên không trừ Token.
        moveTaskToBack(true)
    }
}
