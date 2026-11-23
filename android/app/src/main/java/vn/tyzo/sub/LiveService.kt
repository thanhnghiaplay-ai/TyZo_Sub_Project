package vn.tyzo.sub

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.sqrt
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString
import org.json.JSONObject

/**
 * Phiên dịch: thu tiếng ứng dụng khác đang phát (AudioPlaybackCapture) → cầu nối Dịch trực tiếp → phụ đề nổi.
 * Giao thức cầu nối như trang web (src/lib/live/live-bridge.ts): gửi khung PCM 16 bit 16 kHz mono 100 ms,
 * nhận JSON ready / event / balance / low / closing / error. Ứng dụng chỉ nhận chữ, không phát tiếng dịch.
 */
class LiveService : Service() {

    companion object {
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_DATA = "data"
        const val ACTION_STOP = "vn.tyzo.sub.STOP"

        private const val CHANNEL_ID = "phien_dich"
        private const val NOTIFICATION_ID = 1
        private const val SAMPLE_RATE = 16_000
        private const val FRAME_SAMPLES = SAMPLE_RATE / 10 // 100 ms = 3200 byte
        private const val DRAIN_MS = 10_000L
        /** Dưới mức này (khoảng -50 dBFS) coi khung là im. Cùng ngưỡng với cầu nối. */
        private const val SILENT_PEAK = 100
        /** Im lâu hơn chừng này thì ngừng gửi. Đủ dài để Alibaba thấy khoảng lặng và chốt câu. */
        private const val QUIET_MS = 1_500L
        /** Số khung im (100 ms mỗi khung) gửi kèm ngay trước khi có tiếng lại. */
        private const val PREROLL_FRAMES = 3
        /** Hàng đợi gửi quá chừng này khung (100 ms mỗi khung) thì bỏ khung mới (mạng chậm), giữ phụ đề không trễ dồn. */
        private const val MAX_QUEUE_FRAMES = 15L
        /** Tạm dừng quá lâu thì tự kết thúc phiên. */
        private const val PAUSE_LIMIT_MS = 15 * 60_000L
        /** Vẽ lại khung phụ đề tối đa chừng này lần mỗi giây, đỡ chữ nhảy liên tục. */
        private const val REDRAW_MS = 350L
        /** Nối lại tối đa chừng này lần liên tiếp khi đường nối bị đứt. */
        private const val MAX_RETRIES = 3
        /** Mã đóng của cầu nối không nên nối lại: model/ngôn ngữ sai, hết Token, chưa cấu hình. */
        private val FINAL_CODES = setOf(4400, 4402, 4503)

        fun stop(context: Context) {
            context.startService(Intent(context, LiveService::class.java).setAction(ACTION_STOP))
        }
    }

    private val main = Handler(Looper.getMainLooper())
    private lateinit var prefs: Prefs
    private var overlay: CaptionOverlay? = null
    private var projection: MediaProjection? = null
    private var recorder: AudioRecord? = null
    private var worker: Thread? = null
    private var socket: WebSocket? = null
    private val capturing = AtomicBoolean(false)
    private val socketOpen = AtomicBoolean(false)
    private val finished = AtomicBoolean(false)
    private val transcript = Transcript()
    /** Cầu nối nhận tiếng nén μ-law (ready.codecs); đặt lại mỗi lần nối. */
    @Volatile private var mulaw = false
    private var redrawPending = false
    private var pausedAtMs = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null || intent.action == ACTION_STOP) {
            if (LiveState.running) requestStop() else stopSelf()
            return START_NOT_STICKY
        }
        if (LiveState.running) return START_NOT_STICKY

        // Android 14+: phải vào chế độ chạy nền (loại mediaProjection) TRƯỚC khi lấy MediaProjection.
        startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        finished.set(false)
        transcript.clear()
        sessionStartMs = 0L
        retries = 0
        mulaw = false
        LiveState.paused = false
        lastError = ""
        LiveState.unlinked = false
        LiveState.phase = LiveState.Phase.STARTING
        LiveState.status = "Đang mở phiên dịch…"
        LiveState.startedAtMs = 0L

        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
        val data: Intent? = if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(EXTRA_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(EXTRA_DATA)
        }
        if (resultCode != Activity.RESULT_OK || data == null) {
            finish("Chưa được cho phép thu tiếng.")
            return START_NOT_STICKY
        }

        overlay = CaptionOverlay(this, prefs, onStop = { requestStop() }, onPause = { togglePause() }).also { it.show() }
        try {
            openCapture(resultCode, data)
        } catch (e: Exception) {
            finish("Không mở được bộ thu: ${e.message ?: e.javaClass.simpleName}")
            return START_NOT_STICKY
        }
        if (finished.get()) return START_NOT_STICKY
        Thread({ openSession() }, "mo-phien").start()
        return START_NOT_STICKY
    }

    // ---------- Thu tiếng ----------

    @SuppressLint("MissingPermission")
    private fun openCapture(resultCode: Int, data: Intent) {
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            finish("Chưa có quyền ghi âm.")
            return
        }
        val manager = getSystemService(MediaProjectionManager::class.java)
        val mp = manager.getMediaProjection(resultCode, data) ?: run { finish("Android không trả về quyền thu."); return }
        projection = mp
        mp.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
                // Người dùng dừng chia sẻ từ thanh thông báo hoặc hệ thống thu hồi.
                main.post { requestStop() }
            }
        }, main)

        val config = AudioPlaybackCaptureConfiguration.Builder(mp)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
            .build()
        val format = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
            .build()
        val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val rec = AudioRecord.Builder()
            .setAudioFormat(format)
            .setBufferSizeInBytes(max(minBuffer, FRAME_SAMPLES * 2) * 4)
            .setAudioPlaybackCaptureConfig(config)
            .build()
        if (rec.state != AudioRecord.STATE_INITIALIZED) {
            rec.release()
            finish("Bộ thu không khởi động được trên máy này.")
            return
        }
        recorder = rec
    }

    private fun startReading(rec: AudioRecord) {
        if (!capturing.compareAndSet(false, true)) return
        rec.startRecording()
        worker = Thread({
            val shorts = ShortArray(FRAME_SAMPLES)
            val bytes = ByteBuffer.allocate(FRAME_SAMPLES * 2).order(ByteOrder.LITTLE_ENDIAN)
            // Vài khung im ngay trước khi có tiếng: gửi kèm để không mất âm đầu của câu.
            val preroll = ArrayDeque<ByteString>()
            val voice = if (prefs.voiceFilter) VoiceFilter(SAMPLE_RATE) else null
            var lastLoudMs = 0L
            while (capturing.get()) {
                val n = rec.read(shorts, 0, shorts.size)
                if (n < 0) {
                    main.post { finish("Đọc âm thanh lỗi (mã $n).") }
                    break
                }
                if (n == 0) continue
                var sum = 0.0
                var peak = 0
                for (i in 0 until n) {
                    val s = shorts[i].toInt()
                    sum += s.toDouble() * s
                    val a = if (s < 0) -s else s
                    if (a > peak) peak = a
                }
                val rms = sqrt(sum / n)
                LiveState.levelDb = if (rms < 1.0) -90.0 else max(-90.0, 20.0 * log10(rms / 32768.0))
                val ws = socket
                if (!socketOpen.get() || ws == null || LiveState.paused) {
                    preroll.clear()
                    continue
                }
                val now = System.currentTimeMillis()
                if (peak >= SILENT_PEAK) lastLoudMs = now
                // Lọc cho giọng nói sau khi đo mức thô (ngưỡng im vẫn tính trên tiếng gốc).
                voice?.process(shorts, n)
                // Nén μ-law (nửa dữ liệu) khi cầu nối nhận được; không thì PCM như cũ.
                val frame = if (mulaw) {
                    ByteArray(n) { Audio.mulaw(shorts[it].toInt()) }.toByteString()
                } else {
                    bytes.clear()
                    for (i in 0 until n) bytes.putShort(shorts[i])
                    bytes.array().toByteString(0, n * 2)
                }
                // Im quá QUIET_MS (sau câu đã gửi đủ khoảng lặng để chốt): không gửi, không tốn mạng, không trừ Token.
                if (now - lastLoudMs > QUIET_MS) {
                    preroll.addLast(frame)
                    while (preroll.size > PREROLL_FRAMES) preroll.removeFirst()
                    continue
                }
                // Mạng gửi không kịp (5G yếu): bỏ khung thay vì xếp hàng, để phụ đề không trễ dồn mãi.
                if (ws.queueSize() > frame.size * MAX_QUEUE_FRAMES) {
                    preroll.clear()
                    continue
                }
                while (preroll.isNotEmpty()) ws.send(preroll.removeFirst())
                ws.send(frame)
            }
        }, "thu-tieng").also { it.start() }
    }

    private fun stopReading() {
        capturing.set(false)
        worker?.let { if (it != Thread.currentThread()) runCatching { it.join(500) } }
        worker = null
        recorder?.let {
            runCatching { it.stop() }
            it.release()
        }
        recorder = null
        LiveState.levelDb = -90.0
    }

    // ---------- Phiên với cầu nối ----------

    /** Số lần nối lại liên tiếp chưa thành công. Về 0 khi cầu nối báo sẵn sàng. */
    private var retries = 0

    /** first = lần mở đầu (lỗi thì dừng hẳn); lần nối lại thì lỗi mạng được thử tiếp. */
    private fun openSession(first: Boolean = true) {
        val ticket = try {
            Api.ticket(prefs.web, prefs.token, prefs.model, prefs.target, prefs.source, Hotwords.parse(prefs.words))
        } catch (e: ApiError) {
            if (e.status == 401) LiveState.unlinked = true
            // Lỗi mạng (status 0) lúc nối lại thì thử tiếp; lỗi của web (hết Token, bảo trì…) thì dừng và báo đúng câu.
            if (!first && e.status == 0) main.post { reconnect("không gọi được web") }
            else main.post { finish(e.message ?: "Chưa mở được phiên dịch.") }
            return
        }
        LiveState.perMinute = ticket.perMinute
        LiveState.balance = ticket.balance
        if (finished.get() || LiveState.phase == LiveState.Phase.STOPPING) return
        val request = Request.Builder().url(ticket.url.replaceFirst("wss://", "https://").replaceFirst("ws://", "http://")).build()
        mulaw = false
        socket = Api.client.newWebSocket(request, object : WebSocketListener() {
            // Kết nối cũ (trước khi nối lại) báo muộn thì bỏ qua.
            private fun current(webSocket: WebSocket) = webSocket === socket

            override fun onOpen(webSocket: WebSocket, response: Response) {
                if (!current(webSocket)) return
                socketOpen.set(true)
                main.post { recorder?.let { startReading(it) } }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                if (!current(webSocket)) return
                val msg = runCatching { JSONObject(text) }.getOrNull() ?: return
                main.post { handle(msg) }
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                // Tiếng dịch: ứng dụng không bật, bỏ qua.
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (!current(webSocket)) return
                socketOpen.set(false)
                main.post {
                    // Cầu nối tự đóng mà khách không bấm Dừng (lỗi cầu nối, vé hết hạn, nhà cung cấp cắt): nối lại.
                    // Hết Token, model hay ngôn ngữ sai, chưa cấu hình thì dừng và báo đúng câu.
                    if (LiveState.phase != LiveState.Phase.STOPPING && code !in FINAL_CODES) reconnect("cầu nối đóng, mã $code")
                    else finish(closeText(code, reason))
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (!current(webSocket)) return
                socketOpen.set(false)
                val why = failureReason(t)
                main.post { if (LiveState.phase == LiveState.Phase.STOPPING) finish("") else reconnect(why) }
            }
        })
    }

    /** Đường nối bị đứt: giữ bộ thu và phụ đề, xin vé mới rồi nối lại. Quá MAX_RETRIES lần liên tiếp thì dừng. */
    private fun reconnect(why: String) {
        if (finished.get() || LiveState.phase == LiveState.Phase.STOPPING) return
        socket?.let { runCatching { it.cancel() } }
        socket = null
        if (retries >= MAX_RETRIES) {
            finish("Mất kết nối tới cầu nối dịch ($why). Đã thử nối lại $MAX_RETRIES lần. Kiểm tra mạng rồi bấm Bắt đầu.")
            return
        }
        retries += 1
        LiveState.status = "Mất kết nối ($why), đang nối lại $retries/$MAX_RETRIES…"
        paint()
        main.postDelayed({
            if (!finished.get() && LiveState.phase != LiveState.Phase.STOPPING) Thread({ openSession(first = false) }, "noi-lai").start()
        }, 1_000L * retries)
    }

    /** Lý do đứt ngắn gọn cho khách đọc. */
    private fun failureReason(t: Throwable): String {
        val text = (t.message ?: "").lowercase()
        return when {
            t is java.net.UnknownHostException -> "không có mạng"
            text.contains("ping") || text.contains("pong") -> "mạng không trả lời"
            t is java.net.SocketTimeoutException -> "quá giờ chờ"
            text.contains("reset") || text.contains("abort") || text.contains("broken pipe") -> "mạng bị ngắt"
            t is javax.net.ssl.SSLException -> "lỗi bảo mật kết nối"
            t is java.io.EOFException -> "máy chủ đóng kết nối"
            else -> t.javaClass.simpleName.ifBlank { "không rõ" }
        }
    }

    private var lastError = ""
    private var sessionStartMs = 0L

    private fun handle(msg: JSONObject) {
        if (finished.get()) return
        when (msg.optString("type")) {
            "ready" -> {
                LiveState.phase = LiveState.Phase.LIVE
                val reconnected = sessionStartMs > 0L
                if (LiveState.startedAtMs == 0L) LiveState.startedAtMs = System.currentTimeMillis()
                if (sessionStartMs == 0L) sessionStartMs = LiveState.startedAtMs
                // Nối lại được: đếm lại từ đầu, bỏ câu lỗi của kết nối cũ, giữ phụ đề đang có.
                retries = 0
                // Cầu nối nhận tiếng nén thì báo trước rồi mới gửi khung nén (thứ tự tin được giữ nguyên).
                val codecs = msg.optJSONArray("codecs")
                val canMulaw = codecs != null && (0 until codecs.length()).any { codecs.optString(it) == "mulaw" }
                if (canMulaw && !mulaw) {
                    socket?.send("{\"type\":\"codec\",\"value\":\"mulaw\"}")
                    mulaw = true
                }
                lastError = ""
                LiveState.status = "Đang dịch"
                if (!reconnected) overlay?.message("Đang nghe… mở video có tiếng.")
            }
            "event" -> {
                val event = msg.optJSONObject("event") ?: return
                if (event.optString("kind") == "error") {
                    LiveState.status = event.optString("message").ifBlank { "Nhà cung cấp báo lỗi." }
                } else {
                    transcript.apply(event, System.currentTimeMillis() - sessionStartMs)
                    if (LiveState.phase == LiveState.Phase.LIVE) LiveState.status = "Đang dịch"
                }
            }
            "balance" -> if (msg.optBoolean("denied")) LiveState.status = "Token dịch sắp hết"
            "low" -> LiveState.status = "Token dịch sắp hết"
            "reconnecting" -> LiveState.status = "Đang nối lại…"
            "closing" -> {
                LiveState.phase = LiveState.Phase.STOPPING
                if (msg.optString("reason") == "het-tien") lastError = "Đã hết Token dịch. Mua thêm ở trang Tài khoản."
                LiveState.status = "Đang kết thúc…"
            }
            "error" -> {
                lastError = msg.optString("message").ifBlank { "Cầu nối báo lỗi." }
                LiveState.status = lastError
            }
        }
        redraw()
    }

    /** Vẽ lại khung phụ đề, gom các thay đổi dồn dập (chữ tạm Alibaba sửa liên tục) thành tối đa ~3 lần mỗi giây. */
    private fun redraw() {
        if (redrawPending) return
        redrawPending = true
        main.postDelayed({
            redrawPending = false
            if (!finished.get()) paint()
        }, REDRAW_MS)
    }

    private var lastShownKey = ""
    private var shownChangedAt = 0L

    /**
     * Vẽ khung phụ đề theo CaptionLayout: câu đã xong đứng yên, câu đang nói mờ.
     * Không có câu đang nói mà câu xong đã đứng HIDE_MS thì ẩn, như phụ đề phim.
     */
    private fun paint() {
        val o = overlay ?: return
        val pieces = transcript.pieces(6)
        if (pieces.isEmpty()) return o.setStatus(statusLine())
        val lines = prefs.captionLines.coerceIn(1, 4)
        var shown = CaptionLayout.build(pieces, lines, Caption.maxChars(prefs.captionSize), prefs.finalOnly)
        // Có câu đang nói thì nhường một dòng cho nó: tổng số dòng đúng như khách chọn.
        if (shown.live.isNotEmpty() && shown.done.size >= lines) shown = shown.copy(done = shown.done.takeLast(lines - 1))
        val now = System.currentTimeMillis()
        val key = shown.done.lastOrNull().orEmpty() + "|" + shown.live
        if (key != lastShownKey) {
            lastShownKey = key
            shownChangedAt = now
        }
        if (shown.live.isEmpty() && !shown.isEmpty) {
            val left = CaptionLayout.HIDE_MS - (now - shownChangedAt)
            if (left <= 0) shown = CaptionLayout.Shown(emptyList(), "")
            else main.postDelayed({ if (!finished.get()) paint() }, left + 50)
        }
        o.update(shown, transcript.latestSource(), statusLine())
    }

    private fun statusLine(): String = if (LiveState.paused) "Đã tạm dừng. Bấm ▶ để dịch tiếp." else LiveState.status

    /** Tạm dừng / tiếp tục từ khung phụ đề: giữ phiên và quyền thu, chỉ ngừng gửi tiếng. */
    private fun togglePause() {
        if (finished.get() || LiveState.phase == LiveState.Phase.STOPPING) return
        LiveState.paused = !LiveState.paused
        overlay?.setPaused(LiveState.paused)
        if (LiveState.paused) {
            val at = System.currentTimeMillis()
            pausedAtMs = at
            // Quên tiếp tục quá lâu thì tự kết thúc, nhả Token giữ thừa.
            main.postDelayed({ if (LiveState.paused && pausedAtMs == at) requestStop() }, PAUSE_LIMIT_MS)
        }
        paint()
    }

    private fun closeText(code: Int, reason: String): String = when {
        lastError.isNotEmpty() -> lastError
        code == 1000 -> ""
        reason.isNotBlank() -> reason
        else -> "Phiên dịch đã đóng."
    }

    /** Khách bấm Dừng: báo cầu nối, chờ phần dịch cuối rồi đóng (cầu nối tự trả phần Token giữ thừa). */
    private fun requestStop() {
        if (finished.get()) return
        if (LiveState.phase == LiveState.Phase.STOPPING) return
        LiveState.phase = LiveState.Phase.STOPPING
        LiveState.status = "Đang kết thúc…"
        paint()
        stopReading()
        val ws = socket
        if (ws != null && socketOpen.get()) {
            ws.send("{\"type\":\"stop\"}")
            main.postDelayed({ finish("") }, DRAIN_MS)
        } else {
            finish("")
        }
    }

    private fun finish(message: String) {
        if (!finished.compareAndSet(false, true)) return
        LiveState.paused = false
        stopReading()
        // Lưu chữ của phiên vừa rồi trên máy, như web (xuất SRT, VTT, TXT sau).
        if (sessionStartMs > 0) {
            Session.save(this, transcript.cues(), sessionStartMs, prefs.model, prefs.target)
            val app = applicationContext
            val web = prefs.web
            val token = prefs.token
            Thread { runCatching { Session.sync(app, web, token) } }.start()
        }
        socket?.let { runCatching { it.close(1000, null) } }
        socket = null
        socketOpen.set(false)
        projection?.let { runCatching { it.stop() } }
        projection = null
        overlay?.hide()
        overlay = null
        LiveState.phase = LiveState.Phase.IDLE
        LiveState.status = message.ifBlank { "Đã dừng." }
        main.removeCallbacksAndMessages(null)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        if (!finished.get()) finish("")
        super.onDestroy()
    }

    private fun buildNotification(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Phiên dịch", NotificationManager.IMPORTANCE_LOW))
        }
        val open = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this, 1,
            Intent(this, LiveService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notify)
            .setColor(Theme.DARK.accent)
            .setContentTitle("Đang dịch")
            .setContentText("Đang trừ Token dịch theo thời gian nghe. Bấm Dừng khi xong.")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Dừng", stop).build())
            .build()
    }
}
