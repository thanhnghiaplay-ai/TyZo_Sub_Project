// Thử CaptionLayout trên máy tính (không cần Android SDK). Cách chạy: chép CaptionLayout.kt (bỏ dòng package)
// và tệp này vào một dự án Kotlin JVM (plugin kotlin("jvm")), rồi gradle run. Phải in «TẤT CẢ ĐÚNG».
// Cùng các trường hợp với src/lib/live/caption-layout.test.ts (web).
import CaptionLayout.Piece

var fails = 0
fun check(name: String, got: Any?, want: Any?) {
    if (got != want) { fails++; println("SAI  $name\n   được: $got\n   cần:  $want") } else println("ĐÚNG $name")
}

fun main() {
    check("tách câu", CaptionLayout.sentences("Bạn có mệt không? Mệt. Có khó không"), listOf("Bạn có mệt không?", "Mệt.", "Có khó không") to false)
    check("tách câu đủ dấu", CaptionLayout.sentences("Khó. Bỏ không?"), listOf("Khó.", "Bỏ không?") to true)
    check("chấm lửng gộp", CaptionLayout.sentences("Thôi... Đi"), listOf("Thôi...", "Đi") to false)
    check("câu dài chia đều", CaptionLayout.chunks("Dù có khó đến đâu, cũng không thể để cha mẹ phải chịu khổ thêm nữa", 42),
        listOf("Dù có khó đến đâu, cũng không thể", "để cha mẹ phải chịu khổ thêm nữa"))
    check("cắt ở dấu phẩy gần giữa, không đuôi một chữ", CaptionLayout.chunks("Nếu tôi từ bỏ, thì ai sẽ gánh vác thay tôi?", 42), listOf("Nếu tôi từ bỏ,", "thì ai sẽ gánh vác thay tôi?"))
    check("không khoảng trắng cắt cứng", CaptionLayout.chunks("一二三四五六七八九十", 4), listOf("一二三四", "五六七", "八九十"))

    // Bài hát: một mục rất dài chưa chốt (lỗi cũ: cả khối che video).
    val song = Piece("Bạn có mệt không? Mệt. Có khó không? Khó. Bạn có muốn từ bỏ không? Có. Nhưng bạn có thể từ bỏ được không", "Không", false)
    val shown = CaptionLayout.build(listOf(song), keep = 1, maxChars = 42, finalOnly = false)
    check("bài hát: một câu xong + câu đang nói", shown, CaptionLayout.Shown(listOf("Có."), "Nhưng bạn có thể từ bỏ được không Không"))
    check("chỉ câu chốt", CaptionLayout.build(listOf(song), keep = 2, maxChars = 42, finalOnly = true).done, listOf("Bạn có muốn từ bỏ không?", "Có."))

    // Hai mục: mục cũ đã chốt, mục mới đang nói.
    val two = listOf(Piece("Thật đáng tiếc.", "", true), Piece("Anh ấy", "sẽ đến", false))
    check("hai mục", CaptionLayout.build(two, 1, 42, false), CaptionLayout.Shown(listOf("Thật đáng tiếc."), "Anh ấy sẽ đến"))
    // Mục mới nhất đã chốt: không còn câu đang nói.
    check("đã chốt hết", CaptionLayout.build(listOf(Piece("A b. C d.", "", true)), 1, 42, false), CaptionLayout.Shown(listOf("C d."), ""))
    // Câu đang nói dài: phần đầu lên vùng xong, chỉ đoạn cuối còn nhảy.
    val longLive = CaptionLayout.build(listOf(Piece("", "Dù có khó đến đâu, cũng không thể để cha mẹ phải chịu khổ thêm nữa", false)), 1, 42, false)
    check("câu đang nói dài", longLive, CaptionLayout.Shown(listOf("Dù có khó đến đâu, cũng không thể"), "để cha mẹ phải chịu khổ thêm nữa"))
    check("rỗng", CaptionLayout.build(emptyList(), 1, 42, false).isEmpty, true)
    println(if (fails == 0) "TẤT CẢ ĐÚNG" else "CÓ $fails CHỖ SAI")
}
