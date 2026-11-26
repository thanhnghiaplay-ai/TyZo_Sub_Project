"""Tách câu phụ đề quá dài hoặc kéo dài quá lâu thành các câu ngắn, chia thời gian theo số chữ.

Dùng sau bước gán mốc giờ (pml.align). Không cần thư viện ngoài.
Điểm cắt ưu tiên: sau dấu câu; rồi khoảng trắng (Hàn/Anh); rồi sau trợ từ tiếng Nhật; gần giữa câu nhất.
"""
import re
import unicodedata

# số chữ tối đa trên một câu phụ đề gốc (bản Việt thường dài gấp 2–3 lần với Nhật/Trung)
LIMIT = {"ja": 20, "zh": 20, "yue": 20, "ko": 28, "en": 70}
MAX_SECONDS = 7.0
PUNCT = "。！？!?、，,；;…"


def _len(text):
    return len(re.sub(r"[^\w]|_", "", unicodedata.normalize("NFKC", text)))


def _kind(ch):
    if "\u3040" <= ch <= "\u309f" or ch == "ー":
        return "hira"
    if "\u30a0" <= ch <= "\u30ff" or "\u4e00" <= ch <= "\u9fff":
        return "kanji"
    return "other"


def _cut(text, lang):
    """Vị trí cắt tốt nhất (chỉ số ký tự) hoặc None nếu không cắt được."""
    n = len(text)
    if n < 4:
        return None
    mid = n / 2
    rules = [lambda i: text[i - 1] in PUNCT, lambda i: text[i - 1] == " " or text[i] == " "]
    if lang == "ja":   # hết phần hiragana, bắt đầu kanji/katakana: thường là đầu từ mới
        rules.append(lambda i: _kind(text[i - 1]) == "hira" and _kind(text[i]) == "kanji")
    for rule in rules:
        pos = [i for i in range(1, n) if 0.2 * n <= i <= 0.8 * n and rule(i)]
        if pos:
            return min(pos, key=lambda p: abs(p - mid))
    if lang in ("ja", "zh", "yue") and _len(text) > 1.6 * LIMIT.get(lang, 42):
        return int(mid)          # quá dài mà không có chỗ ngắt tự nhiên: đành cắt giữa
    return None                  # Hàn/Anh không có khoảng trắng hợp lý: giữ nguyên


def split_long(segs, lang):
    limit = LIMIT.get(lang, 42)
    out = []
    todo = list(segs)
    while todo:
        seg = todo.pop(0)
        text = seg["text"].strip()
        dur = seg["end"] - seg["start"]
        if _len(text) <= limit and dur <= MAX_SECONDS:
            out.append(seg)
            continue
        cut = _cut(text, lang)
        if cut is None:
            out.append(seg)
            continue
        a, b = text[:cut].strip(), text[cut:].strip()
        if not a or not b:
            out.append(seg)
            continue
        t = seg["start"] + dur * _len(a) / max(1, _len(a) + _len(b))
        todo[:0] = [dict(seg, end=t, text=a), dict(seg, start=t, text=b)]
    return out
