import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Icon } from "./icon";
import type { IconSlot } from "@/lib/theme/theme";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Button ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  icon?: IconSlot;
  iconName?: string;
  busy?: boolean;
};

const BUTTON_TONE = {
  primary: "bg-accent text-ink border-transparent hover:brightness-110",
  secondary: "bg-raised text-fg border-line hover:border-accent",
  ghost: "bg-transparent text-fg border-transparent hover:bg-raised",
  danger: "bg-error text-ink border-transparent hover:brightness-110",
} as const;

export function Button({ variant = "secondary", size = "md", icon, iconName, busy, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        "rounded-[var(--radius-ctl)]",
        size === "md" ? "min-tap px-4 text-sm" : "min-h-9 px-3 text-xs",
        BUTTON_TONE[variant],
        className,
      )}
      {...rest}
    >
      {(icon || iconName) && <Icon slot={icon} name={iconName} size="1.15em" />}
      {children}
    </button>
  );
}

/* ---------- IconButton (chỉ có icon, bắt buộc có nhãn) ---------- */
export function IconButton({ label, icon, iconName, variant = "ghost", className, ...rest }: Omit<ButtonProps, "children" | "size"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center border rounded-[var(--radius-ctl)] transition disabled:opacity-50",
        BUTTON_TONE[variant],
        className,
      )}
      {...rest}
    >
      <Icon slot={icon} name={iconName} size="1.3em" />
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cx("grid gap-3 border border-line bg-card p-4 rounded-[var(--radius-card)]", className)} {...rest} />;
}

export function CardHeader({ title, hint, icon, action }: { title: string; hint?: string; icon?: IconSlot; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <h2 className="flex items-center gap-2 font-semibold">
          {icon && <Icon slot={icon} />}
          {title}
        </h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

/* ---------- Badge ---------- */
const BADGE_TONE = {
  neutral: "border-line text-muted",
  ok: "border-success text-success",
  warn: "border-warning text-warning",
  error: "border-error text-error",
  info: "border-info text-info",
  accent: "border-accent text-accent",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof BADGE_TONE; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", BADGE_TONE[tone], className)}>{children}</span>;
}

/* ---------- Field: nhãn + ô nhập + gợi ý + lỗi ---------- */
export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={htmlFor} className="font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = "min-tap w-full border border-line bg-raised px-3 text-fg rounded-[var(--radius-ctl)] outline-none focus:border-accent";

/* ---------- Segmented: chọn một trong vài mục ---------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ id: T; label: string; icon?: IconSlot }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cx(
            "min-tap inline-flex items-center gap-2 border px-4 text-sm font-semibold rounded-full",
            value === option.id ? "border-transparent bg-accent text-ink" : "border-line text-fg hover:border-accent",
          )}
        >
          {option.icon && <Icon slot={option.icon} size="1.1em" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}
