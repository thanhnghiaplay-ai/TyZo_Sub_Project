package vn.tyzo.sub.thu

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
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Dịch vụ chạy nền thu âm thanh mà ứng dụng khác đang phát (AudioPlaybackCapture, Android 10+).
 * Bước thử: chỉ đo mức âm, không lưu, không gửi đi đâu.
 */
class CaptureService : Service() {

    companion object {
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_DATA = "data"
        const val ACTION_STOP = "vn.tyzo.sub.thu.STOP"

        private const val CHANNEL_ID = "thu_am"
        private const val NOTIFICATION_ID = 1
        private const val SAMPLE_RATE = 16_000
        private const val FRAME_SAMPLES = SAMPLE_RATE / 10 // 100 ms

        fun stop(context: Context) {
            context.startService(Intent(context, CaptureService::class.java).setAction(ACTION_STOP))
        }
    }

    private var projection: MediaProjection? = null
    private var recorder: AudioRecord? = null
    private var worker: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null || intent.action == ACTION_STOP) {
            stopCapture()
            stopSelf()
            return START_NOT_STICKY
        }

        // Android 14+: phải vào chế độ chạy nền (loại mediaProjection) TRƯỚC khi lấy MediaProjection.
        startForeground(
            NOTIFICATION_ID,
            buildNotification(),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
        )

        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
        val data: Intent? = if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(EXTRA_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(EXTRA_DATA)
        }
        if (resultCode != Activity.RESULT_OK || data == null) {
            fail("Chưa được cho phép thu.")
            return START_NOT_STICKY
        }

        try {
            startCapture(resultCode, data)
        } catch (e: Exception) {
            fail("Không mở được bộ thu: ${e.message ?: e.javaClass.simpleName}")
        }
        return START_NOT_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startCapture(resultCode: Int, data: Intent) {
        stopCapture()
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            fail("Chưa có quyền ghi âm.")
            return
        }

        val manager = getSystemService(MediaProjectionManager::class.java)
        val mp = manager.getMediaProjection(resultCode, data)
            ?: run { fail("Android không trả về quyền thu."); return }
        projection = mp
        mp.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
                // Người dùng dừng chia sẻ từ thanh thông báo hoặc hệ thống thu hồi.
                stopCapture()
                stopSelf()
            }
        }, Handler(Looper.getMainLooper()))

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
        val minBuffer = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        val rec = AudioRecord.Builder()
            .setAudioFormat(format)
            .setBufferSizeInBytes(max(minBuffer, FRAME_SAMPLES * 2) * 2)
            .setAudioPlaybackCaptureConfig(config)
            .build()
        if (rec.state != AudioRecord.STATE_INITIALIZED) {
            rec.release()
            fail("Bộ thu không khởi động được trên máy này.")
            return
        }
        recorder = rec

        CaptureState.reset()
        CaptureState.running = true
        CaptureState.startedAtMs = System.currentTimeMillis()
        rec.startRecording()

        worker = Thread({ readLoop(rec) }, "thu-am").also { it.start() }
    }

    private fun readLoop(rec: AudioRecord) {
        val buffer = ShortArray(FRAME_SAMPLES)
        while (CaptureState.running) {
            val n = rec.read(buffer, 0, buffer.size)
            if (n < 0) {
                CaptureState.error = "Đọc âm thanh lỗi (mã $n)."
                break
            }
            if (n == 0) continue
            var sum = 0.0
            for (i in 0 until n) {
                val s = buffer[i].toDouble()
                sum += s * s
            }
            val rms = sqrt(sum / n)
            val db = if (rms < 1.0) CaptureState.FLOOR_DB
            else max(CaptureState.FLOOR_DB, 20.0 * log10(rms / 32768.0))
            CaptureState.levelDb = db
            if (db > CaptureState.peakDb) CaptureState.peakDb = db
            if (db > CaptureState.SOUND_THRESHOLD_DB) {
                CaptureState.soundMs += n * 1000L / SAMPLE_RATE
            }
        }
    }

    private fun stopCapture() {
        CaptureState.running = false
        CaptureState.levelDb = CaptureState.FLOOR_DB
        worker?.let { runCatching { it.join(500) } }
        worker = null
        recorder?.let {
            runCatching { it.stop() }
            it.release()
        }
        recorder = null
        projection?.let { runCatching { it.stop() } }
        projection = null
    }

    private fun fail(message: String) {
        stopCapture()
        CaptureState.error = message
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopCapture()
        super.onDestroy()
    }

    private fun buildNotification(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Thu âm thử", NotificationManager.IMPORTANCE_LOW),
            )
        }
        val open = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this, 1,
            Intent(this, CaptureService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_app)
            .setContentTitle("Đang đo âm thanh")
            .setContentText("Chỉ đo mức âm, không lưu và không gửi đi đâu.")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Dừng", stop).build())
            .build()
    }
}
