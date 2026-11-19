import { Children, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AGE_LEVELS } from "@/lib/home-state";

type Option = { value: string; label: string };

/** Lấy danh sách lựa chọn từ các thẻ <option> con, để ô chọn cũ đổi sang hộp web mà không phải viết lại. */
function optionsOf(children: ReactNode): Option[] {
  const out: Option[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== "option") continue;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode }>;
    const label = Children.toArray(el.props.children).join("");
    out.push({ value: String(el.props.value ?? label), label });
  }
  return out;
}

/**
 * Ô chọn dùng hộp của web (không dùng danh sách gốc của điện thoại).
 * `trigger` vẽ nút mở theo kiểu của nơi dùng. Khi danh sách có đủ ba mức 18+ (adult, softcore, sex),
 * hộp hiện khu «18+» nổi bật ở trên cùng với thanh Thấp / Vừa / Cao; mỗi mức là một thể loại riêng.
 */
export function PickerSelect({
  label,
  value,
  onChange,
  children,
  trigger,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  trigger: (open: () => void, current: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const options = optionsOf(children);
  const current = options.find((o) => o.value === value)?.label ?? value;
  const levelIds: string[] = AGE_LEVELS.map(([id]) => id);
  const hasAge = levelIds.every((id) => options.some((o) => o.value === id));
  const plain = hasAge ? options.filter((o) => !levelIds.includes(o.value)) : options;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (next: string) => {
    setOpen(false);
    onChange(next);
  };
  const levelOn = AGE_LEVELS.findIndex(([id]) => id === value);

  return (
    <>
      {trigger(() => setOpen(true), current)}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="text-base font-semibold">{label}</h3>
                <button type="button" className="min-tap rounded-[var(--radius-ctl)] px-3 text-sm text-muted hover:text-fg" onClick={() => setOpen(false)}>
                  Đóng
                </button>
              </div>
              <div className="overflow-y-auto" role="radiogroup" aria-label={label}>
                {hasAge && (
                  <div className="m-3 grid gap-2 rounded-[var(--radius-card)] border-2 border-accent p-3" data-age-block>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-ink">18+</span>
                      <span className="text-sm font-semibold text-fg">Thoại người lớn</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-full border border-line bg-bg p-1" role="group" aria-label="Mức 18+">
                      {AGE_LEVELS.map(([id, level]) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={value === id}
                          className={
                            "min-tap rounded-full px-2 text-sm font-semibold " + (value === id ? "bg-accent text-ink" : "text-muted hover:text-fg")
                          }
                          onClick={() => pick(id)}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted">
                      {AGE_LEVELS.map(([id, level]) => `${level}: ${options.find((o) => o.value === id)?.label}`).join(" · ")}
                    </p>
                    <p className="text-xs text-muted">{levelOn >= 0 ? "Đang chọn mức " + AGE_LEVELS[levelOn][1] + "." : "Chọn mức sẽ hỏi xác nhận trên 18 tuổi."}</p>
                  </div>
                )}
                {plain.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    className="flex min-tap w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left text-base last:border-b-0 hover:bg-bg"
                    onClick={() => pick(o.value)}
                  >
                    <span className="min-w-0">{o.label}</span>
                    <span
                      aria-hidden="true"
                      className={"grid size-5 shrink-0 place-items-center rounded-full border-2 " + (value === o.value ? "border-accent" : "border-line")}
                    >
                      {value === o.value && <span className="size-2.5 rounded-full bg-accent" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
