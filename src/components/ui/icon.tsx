import { ICON_SIZES, ICON_SLOTS, type IconGroup, type IconSlot, type IconWeight } from "@/lib/theme/theme";
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
  const group = slot?.split(".")[0] as IconGroup | undefined;
  const groupWeight = group ? theme.iconGroups?.[group] : undefined;
  const chosen = weight ?? (groupWeight && groupWeight !== "same" ? groupWeight : theme.iconWeight);
  const scale = ICON_SIZES.find((item) => item[0] === theme.iconSize)?.[2] ?? 1;
  const style = {
    zoom: scale === 1 ? undefined : scale,
    color: theme.iconTone === "accent" ? "var(--color-accent)" : undefined,
  };
  return (
    <Glyph
      size={size}
      weight={chosen}
      className={className}
      style={style.zoom || style.color ? style : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
