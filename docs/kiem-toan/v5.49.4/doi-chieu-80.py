"""Đối chiếu 80 mục lịch sử trên HEAD hiện tại: test mang ID (đạt/hỏng) trong log toàn bộ + tham chiếu ID trong mã.
Không sửa trạng thái lịch sử; chỉ thêm kết quả tái nghiệm thu. Đối số: <80.json> <log...>."""
import json, re, subprocess, sys
items = json.load(open(sys.argv[1]))
logs = "".join(open(p, encoding="utf-8").read() for p in sys.argv[2:])
oks = re.findall(r"^\s*(ok|not ok) \d+ - (.*)$", logs, re.M)
out = []
for it in items:
    i = it["id"]
    pat = re.compile(r"(?<![A-Z0-9-])" + re.escape(i) + r"(?![0-9])")
    passed = [n for s, n in oks if s == "ok" and pat.search(n)]
    failed = [n for s, n in oks if s == "not ok" and pat.search(n)]
    refs = subprocess.run(["git", "grep", "-l", "-E", r"(^|[^A-Z0-9-])" + re.escape(i) + r"([^0-9]|$)", "--", "src", "scripts", "android", "deploy", "migrations", ".github"],
                          capture_output=True, text=True).stdout.split()
    tests = [r for r in refs if ".test." in r or "/test/" in r]
    out.append({"id": i, "passed_named_tests": len(passed), "failed_named_tests": len(failed),
                "test_files_with_id": tests, "source_refs": [r for r in refs if r not in tests][:6],
                "sample": passed[:2]})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
