package vn.tyzo.sub

import android.content.Context
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView

/**
 * Màu, chữ và kiểu khối giống web. Màu lấy từ bảng mặc định «Vàng» (src/lib/theme/theme.ts),
 * bo góc như --radius-card (16) và --radius-ctl (12), nút cao 44 như min-tap, font Be Vietnam Pro.
 */
data class Palette(
    val bg: Int, val card: Int, val raised: Int, val fg: Int, val muted: Int, val line: Int,
    val accent: Int, val ink: Int, val error: Int, val success: Int, val warning: Int,
)

object Theme {
    val DARK = Palette(
        bg = c("#0e141b"), card = c("#16202a"), raised = c("#1d2b38"), fg = c("#e8eef3"), muted = c("#93a6b6"),
        line = c("#2c4154"), accent = c("#e7b63a"), ink = c("#1a1400"), error = c("#e15b64"), success = c("#3dbe7a"),
        warning = c("#e39a3c"),
    )
    val LIGHT = Palette(
        bg = c("#f3f5f8"), card = c("#ffffff"), raised = c("#e9eef3"), fg = c("#14202b"), muted = c("#4f6172"),
        line = c("#cdd7e0"), accent = c("#d9a21b"), ink = c("#1a1400"), error = c("#c0343e"), success = c("#1f8a4f"),
        warning = c("#b86e0a"),
    )

    private fun c(hex: String) = Color.parseColor(hex)

    /** Web mặc định giao diện tối; ứng dụng theo chế độ sáng/tối của máy. */
    fun of(context: Context): Palette {
        val night = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        return if (night == Configuration.UI_MODE_NIGHT_NO) LIGHT else DARK
    }

    private var regular: Typeface? = null
    private var semibold: Typeface? = null

    fun regular(context: Context): Typeface =
        regular ?: runCatching { context.resources.getFont(R.font.be_vietnam_pro_regular) }.getOrDefault(Typeface.DEFAULT).also { regular = it }

    fun semibold(context: Context): Typeface =
        semibold ?: runCatching { context.resources.getFont(R.font.be_vietnam_pro_semibold) }.getOrDefault(Typeface.DEFAULT_BOLD).also { semibold = it }
}

/** Dựng khối giao diện theo kiểu web. */
class Ui(private val context: Context) {
    val p = Theme.of(context)

    fun dp(v: Int) = (v * context.resources.displayMetrics.density).toInt()
    private fun dpf(v: Float) = v * context.resources.displayMetrics.density

    fun round(fill: Int, radius: Float, stroke: Int? = null) = GradientDrawable().apply {
        cornerRadius = dpf(radius)
        setColor(fill)
        if (stroke != null) setStroke(dp(1), stroke)
    }

    fun text(value: String = "", size: Float = 15f, color: Int = p.fg, bold: Boolean = false) = TextView(context).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
        setTextColor(color)
        typeface = if (bold) Theme.semibold(context) else Theme.regular(context)
        setLineSpacing(0f, 1.25f)
    }

    fun muted(value: String, size: Float = 13f) = text(value, size, p.muted)

    /** Chữ nhỏ màu nhấn phía trên tiêu đề, như «Quản lý» trên đầu trang web. */
    fun eyebrow(value: String) = text(value, 12f, p.accent, bold = true).apply { letterSpacing = 0.04f }

    fun card(): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        background = round(p.card, 16f, p.line)
        setPadding(dp(16), dp(16), dp(16), dp(16))
    }

    fun gap(height: Int = 12) = View(context).apply { layoutParams = LinearLayout.LayoutParams(1, dp(height)) }

    private fun pill(fill: Int, stroke: Int?, textColor: Int, value: String, onClick: () -> Unit) = Button(context).apply {
        text = value
        isAllCaps = false
        stateListAnimator = null
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        setTextColor(textColor)
        typeface = Theme.semibold(context)
        minHeight = dp(44)
        minimumHeight = dp(44)
        setPadding(dp(16), 0, dp(16), 0)
        background = RippleDrawable(ColorStateList.valueOf(Color.argb(40, 255, 255, 255)), round(fill, 999f, stroke), null)
        setOnClickListener { onClick() }
    }

    /** Nút chính: nền vàng, chữ đậm màu mực (bg-accent text-ink rounded-full). */
    fun primary(value: String, onClick: () -> Unit) = pill(p.accent, null, p.ink, value, onClick)

    /** Nút phụ: viền mảnh (border border-line rounded-full). */
    fun secondary(value: String, onClick: () -> Unit) = pill(Color.TRANSPARENT, p.line, p.fg, value, onClick)

    fun danger(value: String, onClick: () -> Unit) = pill(Color.TRANSPARENT, p.error, p.error, value, onClick)

    fun input(hint: String, multi: Boolean = false) = EditText(context).apply {
        this.hint = hint
        setHintTextColor(p.muted)
        setTextColor(p.fg)
        typeface = Theme.regular(context)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        background = round(p.raised, 12f, p.line)
        setPadding(dp(12), dp(12), dp(12), dp(12))
        if (multi) {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            minLines = 3
            gravity = Gravity.TOP or Gravity.START
        } else {
            isSingleLine = true
        }
    }

    /** Ô chọn có chữ và nền theo bảng màu (ô chọn mặc định của máy không theo màu web). */
    fun select(items: List<String>, selected: Int, onPick: (Int) -> Unit): Spinner {
        val adapter = object : ArrayAdapter<String>(context, android.R.layout.simple_spinner_dropdown_item, items) {
            private fun style(view: View, drop: Boolean): View {
                (view as? TextView)?.apply {
                    setTextColor(p.fg)
                    typeface = Theme.regular(context)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                    setPadding(dp(12), dp(if (drop) 12 else 10), dp(12), dp(if (drop) 12 else 10))
                    setBackgroundColor(if (drop) p.raised else Color.TRANSPARENT)
                }
                return view
            }
            override fun getView(position: Int, convertView: View?, parent: ViewGroup) = style(super.getView(position, convertView, parent), false)
            override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup) = style(super.getDropDownView(position, convertView, parent), true)
        }
        return Spinner(context, Spinner.MODE_DROPDOWN).apply {
            this.adapter = adapter
            background = round(p.raised, 12f, p.line)
            setPopupBackgroundDrawable(round(p.raised, 12f, p.line))
            setSelection(selected.coerceIn(0, (items.size - 1).coerceAtLeast(0)))
            onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) = onPick(position)
                override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
            }
        }
    }

    /** Hàng nút chọn một (như các nút Nhỏ / Vừa / Lớn / Rất lớn ở «Tùy chỉnh chữ» trên web). */
    fun segmented(items: List<String>, selected: Int, onPick: (Int) -> Unit): LinearLayout {
        val row = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
        val buttons = mutableListOf<TextView>()
        fun paint(active: Int) {
            buttons.forEachIndexed { i, b ->
                val on = i == active
                b.background = round(if (on) p.accent else Color.TRANSPARENT, 999f, if (on) null else p.line)
                b.setTextColor(if (on) p.ink else p.fg)
            }
        }
        items.forEachIndexed { i, label ->
            val b = text(label, 14f, bold = true).apply {
                gravity = Gravity.CENTER
                minHeight = dp(40)
                setPadding(dp(4), 0, dp(4), 0)
                setOnClickListener {
                    paint(i)
                    onPick(i)
                }
            }
            buttons += b
            row.addView(b, LinearLayout.LayoutParams(0, dp(40), 1f).apply { if (i > 0) marginStart = dp(6) })
        }
        paint(selected)
        return row
    }

    /** Công tắc dạng nút bật/tắt, cùng kiểu với hàng chọn. */
    fun toggle(label: String, on: Boolean, onChange: (Boolean) -> Unit): LinearLayout {
        val row = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(44)
        }
        val name = text(label, 15f)
        val state = text("", 13f, bold = true).apply {
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(6), dp(14), dp(6))
        }
        var value = on
        fun paint() {
            state.text = if (value) "Bật" else "Tắt"
            state.background = round(if (value) p.accent else Color.TRANSPARENT, 999f, if (value) null else p.line)
            state.setTextColor(if (value) p.ink else p.muted)
        }
        row.addView(name, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(state)
        row.setOnClickListener {
            value = !value
            paint()
            onChange(value)
        }
        paint()
        return row
    }

    fun full(top: Int = 0) = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top) }
}
