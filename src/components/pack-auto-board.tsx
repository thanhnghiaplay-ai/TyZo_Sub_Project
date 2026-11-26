import { dongOrNull } from "@/lib/money-format";
import { useMemo, useState } from "react";
import { AUTO_LEVELS, AUTO_LEVEL_LABEL, REQUIRED_ROLES, autoRoles, compareLevels, onlyKeyed, onlyRentOpen, type AutoCandidate, type AutoChoice, type AutoLang, type AutoResult } from "@/lib/pack-auto";
import type { PriceBook } from "@/lib/billing/run-bill";
import type { RentShow } from "@/lib/rent-show-rule";
import { PACK_ROLE_LABEL, PACK_ROLES, quotePack, type PackRole, type ServicePack } from "@/lib/service-pack";
import { shortModelName } from "@/lib/sub/model-short";
import { PROVIDER_LABEL, type ProviderId } from "@/lib/sub/provider";

const dong = (n: number | null) => dongOrNull(n, "chưa đủ giá");
/** Giá một phút của từng model: model rẻ chỉ vài đồng nên dưới 10 giữ một số lẻ, tránh hiện «0 đ». */
const perMinute = (n: number) => `${n < 10 ? n.toFixed(1).replace(".", ",") : dong(n).replace(" đ", "")} đ/phút`;
const scoreText = (n: number) => `${n.toFixed(1).replace(".", ",")} điểm`;

type AutoDraft = { levels: Partial<Record<PackRole, AutoChoice>>; lang: AutoLang };

/**
 * Bảng kéo thanh dựng gói: mỗi việc một thanh ba mức (Tiết kiệm / Cân bằng / Chất lượng), việc không bắt buộc có thêm «Tắt».
 * Model do pack-auto.ts chọn từ các model có mặt trong bảng. Chỉ xem trước giá, chưa tạo gói (nút Tạo gói là bước sau).
 */
export function PackAutoBoard({
  candidates,
  books,
  rentShow = null,
  keyed = null,
  onDraft,
  onCreate,
}: {
  candidates: AutoCandidate[];
  books: Partial<Record<ProviderId, PriceBook>> | null;
  /** Danh sách model Chủ đã mở cho thuê phòng. null = chưa lưu, ẩn ô lọc. */
  rentShow?: RentShow | null;
  /** Nhà nào đã lưu key phòng. null = chưa đọc được, không lọc và ẩn ô lọc. */
  keyed?: Partial<Record<ProviderId, boolean>> | null;
  /** Báo bản nháp hiện tại cho bên ngoài (để nút Tạo gói dùng ở bước sau). */
  onDraft?: (draft: AutoDraft) => void;
  /** Bấm «Tạo gói»: trả model đã chọn và mức đã dùng. Bên ngoài tự thêm gói nháp, chưa lưu. */
  onCreate?: (roles: AutoResult["roles"], draft: AutoDraft) => void;
}) {
  const [levels, setLevels] = useState<AutoDraft["levels"]>({ asr: "balanced", translate: "balanced" });
  const [lang, setLang] = useState<AutoLang>("other");
  const [rentOnly, setRentOnly] = useState(false);
  const [keyedOnly, setKeyedOnly] = useState(true);

  const pool = useMemo(() => {
    const byKey = keyedOnly ? onlyKeyed(candidates, keyed) : candidates;
    return rentOnly ? onlyRentOpen(byKey, rentShow) : byKey;
  }, [keyedOnly, rentOnly, candidates, keyed, rentShow]);
  const result = useMemo(() => (books ? autoRoles({ levels, candidates: pool, books, lang }) : null), [levels, pool, books, lang]);
  // Ba mức của từng việc cạnh nhau, cùng đường chọn với autoRoles nên dòng đang chọn luôn khớp model hiện ở dưới.
  const compare = useMemo(
    () => (books ? Object.fromEntries(PACK_ROLES.map((role) => [role, compareLevels(role, { candidates: pool, books, lang })])) as Record<PackRole, ReturnType<typeof compareLevels>> : null),
    [pool, books, lang],
  );
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

      {keyed && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={keyedOnly} onChange={(event) => setKeyedOnly(event.target.checked)} />
          Chỉ dùng nhà đã có key
        </label>
      )}

      {rentShow && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rentOnly} onChange={(event) => setRentOnly(event.target.checked)} />
          Chỉ dùng model đã mở cho thuê phòng
        </label>
      )}

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
            {current !== "off" && compare && !missing && (
              <ul className="grid gap-0.5 text-xs text-muted">
                {AUTO_LEVELS.map((level) => {
                  const view = compare[role][level];
                  if (!view) return null;
                  const on = current === level;
                  return (
                    <li key={level} className={on ? "font-semibold text-ink" : ""}>
                      {AUTO_LEVEL_LABEL[level]}: {shortModelName(view.model)} · {PROVIDER_LABEL[view.provider]} · {scoreText(view.score)} · {perMinute(view.cost)}
                    </li>
                  );
                })}
              </ul>
            )}
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
