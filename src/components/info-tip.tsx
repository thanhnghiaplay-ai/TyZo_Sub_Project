import { useRef, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";

/**
 * Nút (i) cho ghi chú dài: bấm (điện thoại) hoặc rê chuột (máy tính) thì hiện khung chữ, bấm ra ngoài hoặc Esc thì đóng.
 * Dùng cho chữ GIẢI THÍCH. Trạng thái và lỗi (cần thấy ngay) vẫn để hiện sẵn, không đưa vào đây.
 * Vùng chạm 44px nhưng chiếm chỗ như một chấm nhỏ, nên không làm dòng cao thêm.
 */
export function InfoTip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const byHover = useRef(false);
  const clicking = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const hoverOpen = (event: { pointerType?: string }) => {
    if (event.pointerType !== "mouse") return;
    clear();
    if (!open) byHover.current = true;
    setOpen(true);
  };
  const hoverClose = (event: { pointerType?: string }) => {
    if (event.pointerType !== "mouse") return;
    clear();
    timer.current = setTimeout(() => setOpen(false), 150);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        // Chuột rê đã mở sẵn rồi bấm vào nút: giữ mở (không đóng ngay); Esc hoặc bấm ra ngoài vẫn đóng.
        if (!next && clicking.current && byHover.current) {
          clicking.current = false;
          byHover.current = false;
          return;
        }
        if (!next) byHover.current = false;
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          data-info-tip
          className={
            "-m-3 inline-grid shrink-0 place-items-center p-3 align-middle " + (className ?? "")
          }
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          onClickCapture={() => {
            clicking.current = true;
            setTimeout(() => (clicking.current = false), 0);
          }}
        >
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full border border-line text-xs font-semibold leading-none text-muted"
          >
            i
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          className="z-[110] max-w-[min(20rem,calc(100vw-1.5rem))] rounded-[var(--radius-ctl)] border border-line bg-card p-3 text-sm text-fg shadow-lg"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
