import { ICON_SLOTS, type IconSlot, type IconWeight } from "@/lib/theme/theme";
import { ICONS } from "./icon-registry";
import { useTheme } from "./theme-context";

type Props = {
  /** Tên chỗ đặt theo chức năng, ví dụ "nav.home". Cách dùng chính: admin đổi icon theo chỗ này. */
  slot?: IconSlot;
  /** Dùng khi cần một icon cố định, không cho admin đổi. */
  name?: string;
  size?: number | string;
  weight?: IconWeight;
  className?: string;
  /** Có nhãn thì đọc được bằng trình đọc màn hình. Không có thì ẩn khỏi trình đọc. */
  label?: string;
};

const DEFAULTS = new Map<string, string>(ICON_SLOTS.map(([slot, , key]) => [slot, key]));

export function Icon({ slot, name, size = "1.25em", weight, className, label }: Props) {
  const theme = useTheme();
  const key = name ?? (slot ? theme.icons[slot] || DEFAULTS.get(slot) : undefined) ?? "Question";
  const Glyph = ICONS[key] ?? ICONS[(slot && DEFAULTS.get(slot)) || ""] ?? ICONS.Question;
  return (
    <Glyph
      size={size}
      weight={weight ?? theme.iconWeight}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
