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

        overlay = CaptionOverlay(this, prefs) { requestStop() }.also { it.show() }
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
            while (capturing.get()) {
                val n = rec.read(shorts, 0, shorts.size)
                if (n < 0) {
                    main.post { finish("Đọc âm thanh lỗi (mã $n).") }
                    break
                }
                if (n == 0) continue
                var sum = 0.0
                bytes.clear()
                for (i in 0 until n) {
                    val s = shorts[i]
                    sum += s.toDouble() * s
                    bytes.putShort(s)
                }
                val rms = sqrt(sum / n)
                LiveState.levelDb = if (rms < 1.0) -90.0 else max(-90.0, 20.0 * log10(rms / 32768.0))
                if (socketOpen.get()) socket?.send(bytes.array().toByteString(0, n * 2))
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

    private fun openSession() {
        val ticket = try {
            Api.ticket(prefs.web, prefs.token, prefs.model, prefs.target, prefs.source, Hotwords.parse(prefs.words))
        } catch (e: ApiError) {
            if (e.status == 401) LiveState.unlinked = true
            main.post { finish(e.message ?: "Chưa mở được phiên dịch.") }
            return
        }
        LiveState.perMinute = ticket.perMinute
        LiveState.balance = ticket.balance
        if (finished.get()) return
        val request = Request.Builder().url(ticket.url.replaceFirst("wss://", "https://").replaceFirst("ws://", "http://")).build()
        socket = Api.client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                socketOpen.set(true)
                main.post { recorder?.let { startReading(it) } }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
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
                socketOpen.set(false)
                main.post { finish(closeText(code, reason)) }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                socketOpen.set(false)
                main.post { finish(if (LiveState.phase == LiveState.Phase.STOPPING) "" else "Mất kết nối tới cầu nối dịch. Hãy thử lại.") }
            }
        })
    }

    private var lastError = ""
    private var sessionStartMs = 0L

    private fun handle(msg: JSONObject) {
        if (finished.get()) return
        when (msg.optString("type")) {
            "ready" -> {
                LiveState.phase = LiveState.Phase.LIVE
                LiveState.startedAtMs = System.currentTimeMillis()
                if (sessionStartMs == 0L) sessionStartMs = LiveState.startedAtMs
                LiveState.status = "Đang dịch"
                overlay?.message("Đang nghe… mở video có tiếng.")
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
        overlay?.update(transcript.latest(prefs.captionLines), LiveState.status)
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
        overlay?.update(transcript.latest(prefs.captionLines), LiveState.status)
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
        stopReading()
        // Lưu chữ của phiên vừa rồi trên máy, như web (xuất SRT, VTT, TXT sau).
        if (sessionStartMs > 0) Session.save(this, transcript.cues(), sessionStartMs)
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
