package vn.tyzo.sub

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Phụ đề nổi trên mọi ứng dụng (quyền «hiển thị trên ứng dụng khác»).
 * Kéo lên xuống để đổi chỗ; nút Dừng ngay trên khung. Mọi hàm gọi từ luồng chính.
 */
class CaptionOverlay(private val context: Context, private val prefs: Prefs, private val onStop: () -> Unit) {
    private val wm = context.getSystemService(WindowManager::class.java)
    private var root: LinearLayout? = null
    private lateinit var sourceView: TextView
    private lateinit var textView: TextView
    private lateinit var statusView: TextView
    private lateinit var params: WindowManager.LayoutParams

    private fun dp(v: Int) = (v * context.resources.displayMetrics.density).toInt()

    @SuppressLint("ClickableViewAccessibility")
    fun show(): Boolean {
        if (root != null) return true
        if (!Settings.canDrawOverlays(context)) return false
        val box = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(8), dp(14), dp(8))
            background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.argb(170, 0, 0, 0))
            }
        }
        sourceView = TextView(context).apply {
            setTextColor(Color.argb(210, 255, 255, 255))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, (prefs.textSize * 0.7f).coerceAtLeast(12f))
            visibility = View.GONE
        }
        textView = TextView(context).apply {
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, prefs.textSize.toFloat())
            setTypeface(typeface, Typeface.BOLD)
            setShadowLayer(4f, 0f, 1f, Color.BLACK)
            gravity = Gravity.CENTER_HORIZONTAL
            text = "Đang mở phiên dịch…"
        }
        val bar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        statusView = TextView(context).apply {
            setTextColor(Color.argb(190, 255, 255, 255))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
        }
        val stop = TextView(context).apply {
            text = "■ Dừng"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(dp(12), dp(6), dp(4), dp(6))
            setOnClickListener { onStop() }
        }
        bar.addView(statusView, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(stop)
        box.addView(sourceView)
        box.addView(textView)
        box.addView(bar)

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
                    params.y = (downY + (event.rawY - downRaw).toInt()).coerceIn(0, screen - dp(60))
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

    fun update(lines: List<Transcript.Line>, status: String) {
        if (root == null) return
        val last = lines.lastOrNull()
        if (last != null) {
            val earlier = lines.dropLast(1).lastOrNull()?.shownTranslation.orEmpty()
            val now = last.shownTranslation.ifEmpty { "…" }
            textView.text = if (earlier.isNotEmpty()) "$earlier\n$now" else now
            if (prefs.showSource && last.shownSource.isNotEmpty()) {
                sourceView.text = last.shownSource
                sourceView.visibility = View.VISIBLE
            } else {
                sourceView.visibility = View.GONE
            }
        }
        statusView.text = status
    }

    fun message(text: String) {
        if (root == null) return
        textView.text = text
    }

    fun hide() {
        root?.let { runCatching { wm.removeView(it) } }
        root = null
    }
}
