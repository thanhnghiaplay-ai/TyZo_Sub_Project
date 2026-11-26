"""Bỏ câu chào kết video mà Whisper bịa ra ở chỗ không phải cuối bài.

Whisper hay sinh câu kiểu "다음 영상에서 만나요" (hẹn gặp ở video sau) dù người nói không nói.
Câu này chỉ hợp lý ở cuối video, nên chỉ bỏ một đoạn khi cả ba điều đúng:
  1. cả đoạn (sau chuẩn hóa) đúng bằng một câu chào trong danh sách,
  2. phía sau còn đoạn khác có chữ (đoạn cuối bài luôn được giữ, vì có thể là lời chào thật),
  3. đoạn là đoạn đầu tiên, hoặc chồng thời gian lên đoạn kế tiếp.
Không cần thư viện ngoài để dùng được cả trên Modal lẫn khi chấm lại trên CPU.
"""
import re
import unicodedata

OUTRO = {
    "ko": ["다음 영상에서 만나요", "다음 영상에서 봐요", "다음 영상에서 뵙겠습니다", "다음 영상에서 만나겠습니다",
           "다음 시간에 만나요", "다음에 또 만나요"],
    "ja": ["また次の動画でお会いしましょう", "次の動画でお会いしましょう", "それではまた次の動画で", "また次回お会いしましょう"],
    "zh": ["我们下期再见", "下期再见", "我们下次再见", "下次再见", "我们下个视频再见", "下个视频见"],
    "en": ["see you in the next video", "see you next time", "see you in the next one", "i'll see you in the next video"],
}


def _norm(text):
    return re.sub(r"[^\w]|_", "", unicodedata.normalize("NFKC", text).lower())


_PHRASES = {lang: {_norm(p) for p in items} for lang, items in OUTRO.items()}


def is_outro(text, lang):
    return _norm(text) in _PHRASES.get(lang, set())


def drop_misplaced_outro(segs, lang):
    """Trả (đoạn giữ lại, đoạn đã bỏ). Không đổi thứ tự hay nội dung các đoạn giữ lại."""
    keep, dropped = [], []
    for i, seg in enumerate(segs):
        later = [s for s in segs[i + 1:] if _norm(s.get("text", ""))]
        if is_outro(seg.get("text", ""), lang) and later and (
                i == 0 or later[0]["start"] < seg["end"]):
            dropped.append(seg)
        else:
            keep.append(seg)
    return keep, dropped
