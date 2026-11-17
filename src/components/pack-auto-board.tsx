import { useMemo, useState } from "react";
import { AUTO_LEVELS, AUTO_LEVEL_LABEL, REQUIRED_ROLES, autoRoles, type AutoCandidate, type AutoChoice, type AutoLang, type AutoResult } from "@/lib/pack-auto";
import type { PriceBook } from "@/lib/run-bill";
import { PACK_ROLE_LABEL, PACK_ROLES, quotePack, type PackRole, type ServicePack } from "@/lib/service-pack";
import { PROVIDER_LABEL, type ProviderId } from "@/lib/sub/provider";

const dong = (n: number | null) => (n == null ? "chưa đủ giá" : new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ");

export type AutoDraft = { levels: Partial<Record<PackRole, AutoChoice>>; lang: AutoLang };

/**
 * Bảng kéo thanh dựng gói: mỗi việc một thanh ba mức (Tiết kiệm / Cân bằng / Chất lượng), việc không bắt buộc có thêm «Tắt».
 * Model do pack-auto.ts chọn từ các model có mặt trong bảng. Chỉ xem trước giá, chưa tạo gói (nút Tạo gói là bước sau).
 */
export function PackAutoBoard({
  candidates,
  books,
  onDraft,
  onCreate,
}: {
  candidates: AutoCandidate[];
  books: Partial<Record<ProviderId, PriceBook>> | null;
  /** Báo bản nháp hiện tại cho bên ngoài (để nút Tạo gói dùng ở bước sau). */
  onDraft?: (draft: AutoDraft) => void;
  /** Bấm «Tạo gói»: trả model đã chọn và mức đã dùng. Bên ngoài tự thêm gói nháp, chưa lưu. */
  onCreate?: (roles: AutoResult["roles"], draft: AutoDraft) => void;
}) {
  const [levels, setLevels] = useState<AutoDraft["levels"]>({ asr: "balanced", translate: "balanced" });
  const [lang, setLang] = useState<AutoLang>("other");

  const result = useMemo(() => (books ? autoRoles({ levels, candidates, books, lang }) : null), [levels, candidates, books, lang]);
  const quote = useMemo(() => {
    if (!books || !result) return null;
    const pack: ServicePack = { id: "pack_preview0", name: "Xem trước", note: "", enabled: false, doors: ["turn", "rent"], roles: result.roles };
    const input = { pack, seconds: 600, narration: Boolean(result.roles.narration), books };
    return { turn: quotePack({ ...input, door: "turn" }), rent: quotePack({ ...input, door: "rent" }) };
  }, [books, result]);

  function pick(role: PackRole, choice: AutoChoice) {
    const next = { ...levels, [role]: choice };
    setLevels(next);
    onDraft?.({ levels: next, lang });
  }

  function pickLang(next: AutoLang) {
    setLang(next);
    onDraft?.({ levels, lang: next });
  }

  const btn = (on: boolean) =>
    `min-tap flex-1 rounded-[var(--radius-ctl)] border px-2 text-sm ${on ? "border-accent bg-accent font-semibold text-ink" : "border-line"}`;

  return (
    <div className="grid gap-3 rounded-[var(--radius-ctl)] border border-line p-3">
      <div>
        <h4 className="text-sm font-semibold">Dựng gói tự động</h4>
        <p className="text-xs text-muted">Mỗi việc chọn một mức. Hệ thống tự chọn model theo điểm và giá gốc. Điểm model là số ước lượng, xem ở model-grade.ts.</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Ngôn ngữ lời gốc">
        <button type="button" className={btn(lang === "other")} onClick={() => pickLang("other")}>Lời gốc thường</button>
        <button type="button" className={btn(lang === "cjk")} onClick={() => pickLang("cjk")}>Trung, Nhật, Hàn</button>
      </div>

      {PACK_ROLES.map((role) => {
        const required = REQUIRED_ROLES.includes(role);
        const current: AutoChoice = levels[role] ?? (required ? "balanced" : "off");
        const choices: AutoChoice[] = required ? [...AUTO_LEVELS] : ["off", ...AUTO_LEVELS];
        const chosen = result?.roles[role];
        const missing = result?.missing.includes(role);
        return (
          <div key={role} className="grid gap-1">
            <span className="text-sm">{PACK_ROLE_LABEL[role]}</span>
            <div className="flex gap-1" role="group" aria-label={PACK_ROLE_LABEL[role]}>
              {choices.map((choice) => (
                <button key={choice} type="button" className={btn(current === choice)} aria-pressed={current === choice} onClick={() => pick(role, choice)}>
                  {AUTO_LEVEL_LABEL[choice]}
                </button>
              ))}
            </div>
            {chosen && <p className="text-xs text-muted">{PROVIDER_LABEL[chosen.provider]} · {chosen.model}</p>}
            {missing && <p className="text-xs text-danger">Chưa có model đủ điểm và giá cho việc này.</p>}
          </div>
        );
      })}

      {!books && <p className="text-xs text-muted">Đang đọc bảng giá…</p>}
      <button
        type="button"
        className="min-tap justify-self-start rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50"
        disabled={!result?.roles.asr || !result?.roles.translate}
        onClick={() => result && onCreate?.(result.roles, { levels, lang })}
      >
        Tạo gói từ bảng này
      </button>
      {quote && (
        <p className="text-xs text-muted">
          Ước tính 10 phút, theo giá gốc: {dong(quote.turn.base)} · giữ ví (trả theo lượt) {dong(quote.turn.hold)}
          {quote.turn.ready ? "" : " · chưa đủ giá để mở gói"}
        </p>
      )}
    </div>
  );
}
