"""Lập DOI_CHIEU_80.json: giữ nguyên trường lịch sử, thêm `reaccept_v5_49_4` (trạng thái, bằng chứng, ghi chú)."""
import json, sys
hist = json.load(open(sys.argv[1]))
auto = {x["id"]: x for x in json.load(open(sys.argv[2]))}
HEAD = sys.argv[3]
FULL = ["gate-cp6-test.log", "gate-cp6-test-group1.log", "gate-cp6-test-group2.log"]
over = {
  "REF-013": ("PASS", ["re3-007-after-restore-3.log"], "nap_dump dừng ở lỗi đầu, không đổi chỗ khi lỗi; thêm bảng kê (RE3-007)."),
  "AZ-001": ("PASS", ["re3-007-after-restore-3.log"], "khoi_phuc_vps gọi nap_dump (exit-on-error, một giao dịch, kiểm cấu trúc). Gói chuyển VPS không kèm bảng kê nguồn nên chưa so số dòng/mã băm."),
  "R8-001": ("PASS", ["re3-007-after-restore-3.log"], "Neon → VPS với dump hỏng: dữ liệu VPS không đổi (test dump-fail)."),
  "MAIN-040": ("PARTIAL", [], "Đọc mã: tyzo-modal-call.ts ghi recordSpendDurablyWith; chưa có test hành vi riêng."),
  "NEW-008": ("PARTIAL", [], "Không có test trong npm test; chưa chạy lại kịch bản 2 ca."),
  "R5-009": ("PARTIAL", [], "IndexedDB cần trình duyệt; chỉ tsc."),
  "AZ-002": ("PARTIAL", ["android-jvm-session-api.log"], "Backend test + JVM 10/10; chưa máy Android thật."),
  "AZ-003": ("PARTIAL", ["android-jvm-session-api.log"], "JVM: late sync cannot overwrite newer save; chưa máy thật."),
  "AZ-004": ("PARTIAL", ["android-jvm-session-api.log"], "JVM: history requires saved=true and receipt id; chưa máy thật."),
  "AZ-008": ("PARTIAL", ["android-jvm-session-api.log"], "JVM: offline unlink reports failure; chưa máy thật."),
  "R3-006": ("BLOCKED", [], "Updater/receiver cần Android SDK + máy thật; không có bộ kiểm JVM."),
  "R8-002": ("BLOCKED", ["env-r8-002-as-root.log"], "Test chmod 0 không chặn được root (phiên chạy bằng root). Mã migrate.mjs không đổi từ khi đạt (R8). Chạy lại bằng user thường."),
  "R8-005": ("PASS", [], "Kiểm tĩnh .github/workflows/android-thu.yml: mặc định contents: read; chỉ job phát hành contents: write."),
  "R7-002": ("BY_DESIGN", [], "Giữ quyết định lịch sử."),
  "R7-005": ("BY_DESIGN", [], "Giữ quyết định lịch sử."),
  "DEEP-003": ("PASS", ["re3-001-after-fault-2.log", "re3-001-after-related-2.log"], "Chi phí theo usage thật, nay ghi nguyên tử cùng khoản trừ (RE3-001)."),
  "DEEP-008": ("PASS", [], "Test fixture đạt; chưa đo trên mạng thật."),
  "R3-001": ("PASS", ["re3-002-after-related.log"], "Giữ trước khi gọi nhà (R01) + dự toán audio xác minh (RE3-002)."),
}
SCANNER = {"NEW-001", "NEW-002", "NEW-004", "NEW-007"}
out = []
for h in hist:
    a = auto[h["id"]]
    if h["id"] in over:
        st, ev, note = over[h["id"]]
    elif h["id"] in SCANNER:
        st, ev, note = ("PENDING_SCANNER", [], "Xác nhận ở đợt quét công cụ (cong-cu.sh).")
    elif a["failed_named_tests"]:
        st, ev, note = ("FAIL", FULL, "Có test mang ID thất bại.")
    elif a["passed_named_tests"]:
        st, ev, note = ("PASS", FULL, f"{a['passed_named_tests']} test mang ID đạt trên HEAD: " + " | ".join(a["sample"])[:240])
    elif a["test_files_with_id"]:
        st, ev, note = ("PASS", FULL, "Tệp test có ID nằm trong npm test, toàn bộ đạt: " + ", ".join(a["test_files_with_id"]))
    else:
        st, ev, note = ("PARTIAL", [], "Không có test tái hiện trên HEAD.")
    out.append({**h, "reaccept_v5_49_4": {"status": st, "head": HEAD, "evidence": ev, "note": note,
                                           "test_files": a["test_files_with_id"]}})
json.dump(out, open(sys.argv[4], "w"), ensure_ascii=False, indent=1)
from collections import Counter
print(Counter(x["reaccept_v5_49_4"]["status"] for x in out))
