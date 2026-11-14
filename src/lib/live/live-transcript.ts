import type { ParsedEvent } from "./qwen-protocol.ts";

export type LiveLine = {
  /** Mã câu gốc. Câu chỉ có bản dịch mà chưa ghép được thì dùng mã của bản dịch. */
  id: string;
  startMs: number;
  endMs: number;
  source: string;
  sourceStash: string;
  translation: string;
  translationStash: string;
  speaker: string;
  final: boolean;
};

/**
 * Gộp sự kiện thành các dòng phụ đề. Chạy ở cả cầu nối lẫn trình duyệt.
 * Bản dịch và chữ gốc đến độc lập, thứ tự bất kỳ; ghép bằng sự kiện `pair`.
 */
export class LiveTranscript {
  private lines = new Map<string, LiveLine>();
  private order: string[] = [];
  /** Mã bản dịch → mã câu gốc. */
  private link = new Map<string, string>();
  private speakers = new Map<string, string>();

  private line(id: string, now: number): LiveLine {
    let line = this.lines.get(id);
    if (!line) {
      line = { id, startMs: now, endMs: now, source: "", sourceStash: "", translation: "", translationStash: "", speaker: this.speakers.get(id) ?? "", final: false };
      this.lines.set(id, line);
      this.order.push(id);
    }
    return line;
  }

  private target(translationId: string, now: number): LiveLine {
    return this.line(this.link.get(translationId) ?? translationId, now);
  }

  apply(event: ParsedEvent, nowMs: number): void {
    switch (event.kind) {
      case "speaker": {
        this.speakers.set(event.sourceId, event.speakerId);
        const line = this.lines.get(event.sourceId);
        if (line) line.speaker = event.speakerId;
        return;
      }
      case "pair": {
        this.link.set(event.translationId, event.sourceId);
        const orphan = this.lines.get(event.translationId);
        if (orphan && event.translationId !== event.sourceId) {
          // Bản dịch đến trước khi biết cặp: chuyển chữ sang dòng của câu gốc.
          const home = this.line(event.sourceId, orphan.startMs);
          home.translation = orphan.translation;
          home.translationStash = orphan.translationStash;
          home.endMs = Math.max(home.endMs, orphan.endMs);
          home.final = home.final || orphan.final;
          this.lines.delete(event.translationId);
          this.order = this.order.filter((item) => item !== event.translationId);
        }
        return;
      }
      case "source": {
        const line = this.line(event.id, nowMs);
        line.source = event.text;
        line.sourceStash = event.stash;
        line.endMs = nowMs;
        return;
      }
      case "source-delta": {
        const line = this.line(event.id, nowMs);
        line.source += event.delta;
        line.endMs = nowMs;
        return;
      }
      case "translation": {
        const line = this.target(event.id, nowMs);
        line.translation = event.text;
        line.translationStash = event.stash;
        line.endMs = nowMs;
        if (event.final) line.final = true;
        return;
      }
      case "translation-delta": {
        const line = this.target(event.id, nowMs);
        line.translation += event.delta;
        line.endMs = nowMs;
        return;
      }
      default:
        return;
    }
  }

  list(): LiveLine[] {
    return this.order.map((id) => this.lines.get(id)!).filter(Boolean);
  }

  /** Dòng để lưu SRT/VTT/TXT: bỏ dòng trống, giây tính từ lúc bắt đầu phiên. */
  cues(): Array<{ start: number; end: number; original: string; translation: string | null; speaker: string }> {
    return this.list()
      .filter((line) => line.source.trim() || line.translation.trim())
      .map((line, index, all) => {
        const start = line.startMs / 1000;
        const next = all[index + 1];
        const end = Math.max(start + 1, Math.min(line.endMs / 1000, next ? next.startMs / 1000 : Infinity));
        return {
          start,
          end,
          original: line.source.trim(),
          translation: line.translation.trim() || null,
          speaker: line.speaker,
        };
      });
  }
}
