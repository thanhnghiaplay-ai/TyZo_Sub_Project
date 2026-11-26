import { usePipeline } from "@/components/use-pipeline";
import { InfoTip } from "@/components/info-tip";
import { GENRES } from "@/lib/home-state";
import { STYLE_EXTRA_MAX } from "@/lib/sub/text";
import { usesBaseGlossary } from "@/lib/sub/glossary";
import { FIELD } from "@/components/studio-shared";
import { GlossaryEditor } from "@/components/studio-glossary";
import { Select } from "@/components/studio-parts";
import type * as React from "react";
import type { ToolId } from "@/components/studio-tools";

type PipelineApp = ReturnType<typeof usePipeline>;

export type CastPanelProps = {
  toolTab: ToolId;
  ctxView: "cast" | "terms" | "note";
  setCtxView: React.Dispatch<React.SetStateAction<"cast" | "terms" | "note">>;
  app: PipelineApp;
};

/** Thẻ «cast» của màn hình dịch (tách từ studio.tsx, đợt 5). */
export function CastPanel(props: CastPanelProps) {
  const { toolTab, ctxView, setCtxView, app } = props;
  return (
    <section id="tool-cast" role="region" aria-labelledby="tool-tab-cast" hidden={toolTab !== "cast"} className="grid gap-3 p-4">
        <div role="tablist" aria-label="Ngữ cảnh nội dung" className="grid grid-cols-3 gap-2">
          {(
            [
              ["cast", "Nhân vật"],
              ["terms", "Thuật ngữ"],
              ["note", "Ghi chú nội dung"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ctxView === id}
              className={"min-tap rounded-[var(--radius-ctl)] px-2 text-sm font-semibold " + (ctxView === id ? "bg-accent text-ink" : "border border-line")}
              onClick={() => setCtxView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div hidden={ctxView !== "cast"} className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              Phân tích nội dung
              <InfoTip label="Giải thích phân tích nội dung">Bước riêng, trước khi dịch. Bảng nhân vật khóa tên, giới và cách xưng hô.</InfoTip>
            </h2>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={app.pre}
            className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (app.pre ? "bg-accent text-ink" : "border border-line")}
            onClick={() => app.setPre(!app.pre)}
          >
            {app.pre ? "Đang bật" : "Tắt"}
          </button>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input className="mt-1" type="checkbox" checked={app.reviewBefore} onChange={(event) => app.setReviewBefore(event.target.checked)} />
          Dừng lại để xem và sửa bảng nhân vật trước khi dịch.
        </label>
        <div className="grid gap-2">
          <button
            type="button"
            className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm disabled:opacity-50"
            disabled={app.running || app.segs.length === 0}
            onClick={() => (app.analyzing ? app.cancel() : void app.analyzeNow())}
          >
            {app.analyzing ? "Hủy phân tích" : "Phân tích ngay"}
          </button>
          {!app.segs.length && <p className="text-xs text-muted">Chưa có lời thoại. Bật phân tích rồi bấm Tải và dịch — app sẽ dừng để bạn xem bảng trước khi dịch.</p>}
        </div>
        {app.bible?.failed && <p className="text-sm text-danger">Không tạo được bảng: {app.bible.failed}</p>}
        {app.bible && !app.bible.failed && (
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm text-muted">
              Tóm tắt
              <textarea className={FIELD} rows={3} value={app.bible.summary || ""} onChange={(event) => app.patchSummary(event.target.value)} />
            </label>
            <div className="grid max-h-80 gap-2 overflow-auto">
              {(app.bible.characters || []).map((character, index) => (
                // key chỉ theo vị trí: key có tên thì gõ một chữ là hàng bị dựng lại, mất focus, bàn phím ảo tắt
                <div key={`character-${index}`} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line bg-card p-3">
                  <p className="text-xs font-semibold text-muted">Nhân vật {index + 1}</p>
                  <label className="grid gap-1 text-xs text-muted">
                    Tên nhân vật
                    <input
                      className={FIELD}
                      aria-label="Tên nhân vật"
                      placeholder="Tên nhân vật"
                      value={character.name || ""}
                      onChange={(event) => app.patchCharacter(index, { name: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted">
                    Nam / nữ
                    <select
                      className={FIELD}
                      aria-label="Giới"
                      value={character.gender === "male" || character.gender === "female" ? character.gender : "unknown"}
                      onChange={(event) => app.patchCharacter(index, { gender: event.target.value })}
                    >
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                      <option value="unknown">Chưa rõ</option>
                    </select>
                  </label>
                  <p className="text-xs text-muted">Giới này được giữ khi phân tích lại, và thắng cao độ lúc đọc.</p>
                  <label className="grid gap-1 text-xs text-muted">
                    Tự xưng
                    <input
                      className={FIELD}
                      aria-label="Tự xưng"
                      placeholder="Tự xưng, ví dụ: tôi / em"
                      value={character.self || ""}
                      onChange={(event) => app.patchCharacter(index, { self: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted">
                    Được gọi
                    <input
                      className={FIELD}
                      aria-label="Được gọi"
                      placeholder="Được gọi, ví dụ: anh / chị"
                      value={character.addressed || ""}
                      onChange={(event) => app.patchCharacter(index, { addressed: event.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
            {(app.bible.terms || []).length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm text-muted">Thuật ngữ trong video</p>
                {(app.bible.terms || []).slice(0, 24).map((term, index) => (
                  <label key={`${term.src || "t"}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-sm">
                    <span className="truncate text-muted">{term.src}</span>
                    <input className={FIELD} aria-label="Cách dịch" value={term.tgt || ""} onChange={(event) => app.patchTerm(index, event.target.value)} />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
        <div hidden={ctxView !== "terms"} className="grid gap-3">        <div data-tour="glossary-genre">
        <Select label="Thể loại" value={app.genre} onChange={app.pickGenre}>
          {GENRES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {usesBaseGlossary(app.genre) && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={app.baseGloss} onChange={(event) => app.setBaseGloss(event.target.checked)} />
          Tự thêm thuật ngữ nền của ngôn ngữ nguồn
        </label>
      )}
      <p className="text-sm text-muted">
        {app.glossaryInfo?.failed ? (
          "Không tải được thuật ngữ có sẵn. Hãy thử lại."
        ) : app.glossaryInfo?.count > 0 ? (
          <>
            Đã nạp <strong className="studio-count">{app.glossaryInfo.count}</strong> thuật ngữ{app.glossaryInfo?.sources?.length > 1 ? " (thể loại này và bộ nền)" : " của thể loại này"}.
          </>
        ) : (
          "Chọn thể loại để nạp thuật ngữ. Thêm tay hoặc nhập CSV ở dưới."
        )}
      </p>
      <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2">
        <summary className="min-tap cursor-pointer text-sm font-medium">
          Thuật ngữ thể loại <span className="studio-count">{app.glossaryInfo?.count || 0}</span>
        </summary>
        <p className="pb-2 text-sm text-muted">
          Mỗi thể loại một bộ riêng, không dùng chung. Thêm tay hoặc nhập CSV vẫn lưu trên máy này, theo đúng cặp ngôn ngữ × thể loại.
          {app.glossaryInfo?.userCount ? ` Trong đó ${app.glossaryInfo.userCount} do bạn thêm.` : ""}
          {app.glossaryInfo?.sources?.length ? ` ${app.glossaryInfo.sources.map((s: string) => s.replace(/^\/glossaries\//, "")).join(", ")}.` : ""}
        </p>
        <GlossaryEditor app={app} />
      </details>
          <label className="grid gap-1 text-sm text-muted">
            Thuật ngữ riêng cho phim này
            <textarea className={FIELD} rows={4} placeholder="Bảng thuật ngữ, mỗi dòng: tên gốc = cách dịch" value={app.gloss} onChange={(event) => app.setGloss(event.target.value)} />
          </label>
        </div>
        <div hidden={ctxView !== "note"} className="grid gap-2">
            <input className={FIELD} placeholder="Tên video + năm" value={app.title} onChange={(event) => app.setTitle(event.target.value)} />
            <textarea className={FIELD} rows={3} placeholder="Dàn diễn viên hoặc tóm tắt cốt truyện" value={app.notes} onChange={(event) => app.setNotes(event.target.value)} />
            <textarea
              className={FIELD}
              rows={2}
              maxLength={STYLE_EXTRA_MAX}
              placeholder="Yêu cầu thêm cho bản dịch (giọng văn, mức trang trọng)"
              value={app.extra}
              onChange={(event) => app.setExtra(event.target.value)}
            />
            <p className="text-xs text-muted">{app.extra.length}/{STYLE_EXTRA_MAX} ký tự. Chỉ chỉnh giọng văn; không đổi định dạng kết quả.</p>
        </div>
    </section>
  );
}
