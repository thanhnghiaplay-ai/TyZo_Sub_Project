package vn.tyzo.sub

// RE8-007 (R3-006): kiểm UpdateFlow thật trên JVM với DownloadManager GIẢ và lưu trữ giả. Trình tự gọi giống Updater.kt
// (start / resume / onReceive). Không phải thiết bị thật: vòng đời Activity, BroadcastReceiver và màn cài chưa được kiểm.

var fails = 0
fun check(name: String, ok: Boolean, info: String = "") {
    if (ok) println("PASS $name") else { fails++; println("FAIL $name $info") }
}

class FakeDm {
    var next = 100L
    val status = mutableMapOf<Long, Int>()  // mã → STATUS_*
    var enqueued = 0
    var removed = mutableListOf<Long>()
    fun enqueue(): Long { enqueued++; val id = next++; status[id] = 1; return id }
    fun query(id: Long) = UpdateFlow.fromCode(status[id])
}

/** Bản sao trình tự của Updater.kt với lưu trữ bền giả (`stored`) và tin «tải xong» giả. */
class Harness(val dm: FakeDm = FakeDm()) {
    var stored = -1L
    var listening = false
    var installs = 0
    var message = ""
    private fun apply(id: Long, step: UpdateFlow.Step) {
        if (step == UpdateFlow.Step.Wait) { message = UpdateFlow.message(step, "0.14"); listening = true; return }
        if (step == UpdateFlow.Step.StartNew) return
        listening = false; stored = -1L; message = UpdateFlow.message(step, "0.14")
        if (step == UpdateFlow.Step.Failed) dm.removed.add(id)
        if (step == UpdateFlow.Step.Install) installs++
    }
    fun start(completeDuringEnqueue: Boolean = false) {
        val old = stored
        val step = UpdateFlow.decide(old, if (old < 0) null else dm.query(old))
        if (step != UpdateFlow.Step.StartNew && step != UpdateFlow.Step.Gone && step != UpdateFlow.Step.Failed) { apply(old, step); return }
        if (step != UpdateFlow.Step.StartNew) apply(old, step)
        listening = true
        val id = dm.enqueue()
        if (completeDuringEnqueue) { dm.status[id] = 8; receive(id) }   // tin đến TRƯỚC khi lưu mã
        stored = id
        message = UpdateFlow.message(UpdateFlow.Step.Wait, "0.14")
        val now = UpdateFlow.decide(id, dm.query(id))
        if (now != UpdateFlow.Step.Wait) apply(id, now)
    }
    fun resume() { if (stored >= 0) apply(stored, UpdateFlow.decide(stored, dm.query(stored))) }
    fun receive(eventId: Long) {
        if (!listening) return
        if (!UpdateFlow.accepts(stored, eventId)) return
        apply(stored, UpdateFlow.decide(stored, dm.query(stored)))
    }
    /** Tắt ứng dụng: mất receiver và bộ nhớ, giữ lưu trữ bền và DownloadManager. */
    fun restart() = Harness(dm).also { it.stored = stored }
}

fun main() {
    // Bảng quyết định
    check("không có lượt → tải mới", UpdateFlow.decide(-1, null) == UpdateFlow.Step.StartNew)
    for (code in listOf(1, 2, 4)) check("đang tải (STATUS $code) → chờ", UpdateFlow.decide(5, UpdateFlow.fromCode(code)) == UpdateFlow.Step.Wait)
    check("tải xong → cài", UpdateFlow.decide(5, UpdateFlow.fromCode(8)) == UpdateFlow.Step.Install)
    check("tải lỗi → lỗi", UpdateFlow.decide(5, UpdateFlow.fromCode(16)) == UpdateFlow.Step.Failed)
    check("không còn bản ghi (hủy) → quên", UpdateFlow.decide(5, UpdateFlow.fromCode(null)) == UpdateFlow.Step.Gone)
    check("mã lạ → coi như không còn", UpdateFlow.fromCode(999) == UpdateFlow.Dl.MISSING)
    check("tin của lượt khác bị bỏ qua", !UpdateFlow.accepts(5, 6) && !UpdateFlow.accepts(-1, -1) && UpdateFlow.accepts(5, 5))

    // Tải thành công bình thường
    var h = Harness(); h.start(); h.dm.status[h.stored] = 8; h.receive(h.stored)
    check("thành công: mở màn cài một lần, quên mã", h.installs == 1 && h.stored == -1L && !h.listening)

    // Sự kiện đến sớm (trước khi lưu mã): lỗi cũ là kẹt; nay hỏi lại ngay sau khi lưu
    h = Harness(); h.start(completeDuringEnqueue = true)
    check("tin đến sớm: vẫn mở màn cài, không kẹt «Đang tải»", h.installs == 1 && h.stored == -1L, "stored=${h.stored} installs=${h.installs}")

    // Lỡ tin hoàn toàn (receiver không nhận), khách bấm lại
    h = Harness(); h.start(); h.dm.status[h.stored] = 8; h.listening = false; h.start()
    check("lỡ tin rồi bấm lại: cài bản đã tải, không tải lần hai", h.installs == 1 && h.dm.enqueued == 1)

    // Bấm hai lần khi đang tải
    h = Harness(); h.start(); h.start(); h.start()
    check("bấm nhiều lần khi đang tải: chỉ một lượt tải", h.dm.enqueued == 1 && h.message.startsWith("Đang tải"))

    // Tải lỗi rồi thử lại
    h = Harness(); h.start(); val failed = h.stored; h.dm.status[failed] = 16; h.receive(failed)
    check("lỗi: xóa lượt hỏng, báo thử lại", h.dm.removed == listOf(failed) && h.stored == -1L && h.message.contains("thử lại"))
    h.start()
    check("lỗi rồi bấm lại: tải lượt mới", h.dm.enqueued == 2 && h.stored != failed)

    // Khách hủy tải ở thanh thông báo (bản ghi biến mất)
    h = Harness(); h.start(); h.dm.status.remove(h.stored); h.resume()
    check("hủy tải: quên mã, báo tải lại", h.stored == -1L && h.message.contains("hủy"))
    h.start()
    check("hủy rồi bấm lại: tải lượt mới", h.dm.enqueued == 2)

    // Khởi động lại ứng dụng giữa chừng
    h = Harness(); h.start(); val id = h.stored
    var after = h.restart(); after.resume()
    check("khởi động lại khi đang tải: chờ tiếp và nghe lại tin", after.stored == id && after.listening && after.installs == 0)
    after.dm.status[id] = 8; after.receive(id)
    check("khởi động lại rồi tải xong: mở màn cài", after.installs == 1)
    h = Harness(); h.start(); val id2 = h.stored; h.dm.status[id2] = 8
    after = h.restart(); after.resume()
    check("tải xong lúc ứng dụng đang tắt: mở màn cài khi quay lại", after.installs == 1 && after.stored == -1L)

    // Tin cũ đến muộn sau khi đã bắt đầu lượt mới
    h = Harness(); h.start(); val first = h.stored; h.dm.status.remove(first); h.resume(); h.start(); val second = h.stored
    h.dm.status[first] = 8; h.receive(first)
    check("tin của lượt cũ không làm cài nhầm", h.installs == 0 && h.stored == second)

    println(if (fails == 0) "TẤT CẢ ĐÚNG" else "CÓ $fails CA SAI")
    if (fails != 0) kotlin.system.exitProcess(1)
}
