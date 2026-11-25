#!/usr/bin/env bash
# Tự dựng bản đồ code graphify khi mở phiên Claude Code. Chỉ đọc code, không sửa code ứng dụng.
# An toàn: luôn thoát 0 (không bao giờ làm hỏng phiên), có giới hạn thời gian, không dùng AI/API key.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
GV="0.9.119"
if ! command -v graphify >/dev/null 2>&1; then
  timeout 150 pip install -q --break-system-packages "graphifyy==$GV" >/dev/null 2>&1 \
    || timeout 150 pip install -q "graphifyy==$GV" >/dev/null 2>&1 \
    || timeout 150 pipx install "graphifyy==$GV" >/dev/null 2>&1 || true
  export PATH="$HOME/.local/bin:$PATH"
fi
if ! command -v graphify >/dev/null 2>&1; then
  echo "Graphify chưa cài được (có thể mạng chặn). Cứ làm việc bình thường, không cần bản đồ."
  exit 0
fi
if [ ! -s graphify-out/graph.json ]; then
  timeout 240 graphify update . --no-cluster >/dev/null 2>&1 || true
fi
if [ -s graphify-out/graph.json ]; then
  echo "Graphify sẵn sàng. Trước khi sửa: dùng 'graphify query \"<câu hỏi>\" --budget 800' và 'graphify affected \"<tên hàm>\"' để định vị, rồi chỉ đọc đúng file cần sửa. Sau khi sửa và test xong mỗi lỗi: chạy 'graphify update . | tail -3'. Bản đồ chỉ để định vị, vẫn làm đúng BANG_DIEU.md và quy trình dự án."
else
  echo "Graphify đã cài nhưng chưa dựng được bản đồ. Cứ làm việc bình thường."
fi
exit 0
