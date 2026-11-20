/**
 * ĐIỂM ĐO THẬT (ghi đè số ước lượng ở model-grade.ts). Rỗng = chưa có số đo, mọi điểm vẫn là ước lượng.
 * Tệp này do `npm run asr:grade` ghi từ báo cáo `eval/asr/out/*.json`; xem eval/asr/README.md mục 3.
 */
export const MEASURED_GRADE: Record<string, { quality?: number; asian?: number }> = {};
