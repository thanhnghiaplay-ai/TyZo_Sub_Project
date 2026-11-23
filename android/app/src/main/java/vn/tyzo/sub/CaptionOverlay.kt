package vn.tyzo.sub

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.provider.Settings
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Phụ đề nổi trên mọi ứng dụng (quyền «hiển thị trên ứng dụng khác"), cùng tùy chỉnh với phụ đề nổi của web:
 * cỡ chữ, số dòng, chữ gốc, nền đậm; phần chữ tạm (chưa chốt) hiện mờ. Kéo lên xuống để đổi chỗ.
 * Mọi hàm gọi từ luồng chính.
 */
class CaptionOverlay(
    private val context: Context,
    private val prefs: Prefs,
    private val onStop: () -> Unit,
    private val onPause: () -> Unit,
) {
    private val wm = context.getSystemService(WindowManager::class.java)
    private val ui = Ui(context)
    private var root: LinearLayout? = null
    private lateinit var body: TextView
    private lateinit var statusView: TextView
    private lateinit var pauseView: TextView
    private lateinit var params: WindowManager.LayoutParams

    @SuppressLint("ClickableViewAccessibility")
    fun show(): Boolean {
        if (root != null) return true
        if (!Settings.canDrawOverlays(context)) return false
        val box = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(ui.dp(14), ui.dp(10), ui.dp(14), ui.dp(8))
            // Nền đậm như web (solid) hoặc nền mờ để thấy video phía sau.
            // Mặc định không nền, chữ viền đen như phụ đề phim (Chủ: nền quá đậm); «Nền đậm» thì có nền.
            background = if (prefs.solid) ui.round(Color.argb(200, 14, 20, 27), 16f) else null
        }
        body = TextView(context).apply {
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, Caption.sp(prefs.captionSize))
            typeface = Theme.semibold(context)
            // Viền đen quanh chữ để đọc được trên mọi cảnh phim khi không có nền.
            setShadowLayer(if (prefs.solid) 4f else 7f, 0f, 0f, Color.BLACK)
            // Chữ bám đáy, khung giữ tối thiểu 2 dòng: thêm chữ không làm khung co giãn, mắt đọc một chỗ.
            gravity = Gravity.CENTER_HORIZONTAL or Gravity.BOTTOM
            minLines = prefs.captionLines.coerceIn(1, 4) + if (prefs.showSource) 1 else 0
            setLineSpacing(0f, 1.15f)
            text = "Đang mở phiên dịch…"
        }
        val bar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            // Không nền thì riêng thanh nút có nền mờ nhỏ để chữ trạng thái và nút vẫn đọc được.
            if (prefs.solid) setPadding(0, ui.dp(6), 0, 0)
            else {
                background = ui.round(Color.argb(110, 0, 0, 0), 999f)
                setPadding(ui.dp(10), ui.dp(4), ui.dp(4), ui.dp(4))
            }
        }
        val logo = View(context).apply { background = context.getDrawable(R.drawable.ic_logo) }
        statusView = TextView(context).apply {
            setTextColor(Color.argb(200, 232, 238, 243))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            typeface = Theme.regular(context)
            setPadding(ui.dp(6), 0, 0, 0)
        }
        pauseView = TextView(context).apply {
            text = "⏸ Tạm dừng"
            setTextColor(Color.WHITE)
            typeface = Theme.semibold(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            background = ui.round(Color.argb(90, 255, 255, 255), 999f)
            setPadding(ui.dp(12), ui.dp(5), ui.dp(12), ui.dp(5))
            setOnClickListener { onPause() }
        }
        val stop = TextView(context).apply {
            text = "■ Dừng"
            setTextColor(Theme.DARK.ink)
            typeface = Theme.semibold(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            background = ui.round(Theme.DARK.accent, 999f)
            setPadding(ui.dp(12), ui.dp(5), ui.dp(12), ui.dp(5))
            setOnClickListener { onStop() }
        }
        bar.addView(logo, LinearLayout.LayoutParams(ui.dp(16), ui.dp(16)))
        bar.addView(statusView, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(pauseView, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { marginEnd = ui.dp(8) })
        bar.addView(stop)
        box.addView(body)
        box.addView(bar, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = ui.dp(4) })

        val screen = context.resources.displayMetrics.heightPixels
        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            horizontalMargin = 0.03f
            y = prefs.overlayY.takeIf { it in 0 until screen } ?: (screen * 0.62).toInt()
        }

        var downRaw = 0f
        var downY = 0
        box.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRaw = event.rawY
                    downY = params.y
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.y = (downY + (event.rawY - downRaw).toInt()).coerceIn(0, screen - ui.dp(60))
                    runCatching { wm.updateViewLayout(box, params) }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    prefs.overlayY = params.y
                    true
                }
                else -> false
            }
        }

        return runCatching { wm.addView(box, params) }.onSuccess { root = box }.isSuccess
    }

    /**
     * Vẽ hai vùng như phụ đề phim: câu đã xong (trắng, đứng yên) và câu đang nói (mờ hơn, chỉ vùng này đổi).
     * Rỗng (đã ẩn sau HIDE_MS) thì khung chỉ còn thanh trạng thái.
     */
    fun update(shown: CaptionLayout.Shown, source: String, status: String) {
        if (root == null) return
        statusView.text = status
        val out = SpannableStringBuilder()
        shown.done.forEach {
            if (out.isNotEmpty()) out.append('\n')
            out.append(it)
        }
        if (shown.live.isNotEmpty()) {
            if (out.isNotEmpty()) out.append('\n')
            val s = out.length
            out.append(shown.live)
            out.setSpan(ForegroundColorSpan(Color.argb(190, 255, 255, 255)), s, out.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        if (prefs.showSource && source.isNotEmpty() && !shown.isEmpty) {
            out.append('\n')
            val s = out.length
            out.append(Caption.tail(source, Caption.maxChars(prefs.captionSize) * 2))
            out.setSpan(ForegroundColorSpan(Color.argb(210, 232, 238, 243)), s, out.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            out.setSpan(RelativeSizeSpan(0.7f), s, out.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        body.text = out
    }

    /** Chỉ đổi dòng trạng thái, giữ chữ trong khung (vd. «Đang nghe… mở video có tiếng.» lúc chưa có phụ đề). */
    fun setStatus(status: String) {
        if (root == null) return
        statusView.text = status
    }

    /** Đổi chữ nút: đang tạm dừng thì «▶ Tiếp tục». */
    fun setPaused(paused: Boolean) {
        if (root == null) return
        pauseView.text = if (paused) "▶ Tiếp tục" else "⏸ Tạm dừng"
    }

    fun message(text: String) {
        if (root == null) return
        body.text = text
    }

    fun hide() {
        root?.let { runCatching { wm.removeView(it) } }
        root = null
    }
}
