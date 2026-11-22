import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { pushToast } from "@/components/toast";

/**
 * Nút sao chép có biểu tượng. Bấm là chép, biểu tượng đổi thành dấu tích 2 giây.
 * Máy không cho chép (trình duyệt cũ, không phải https) thì báo để khách tự chọn chữ.
 */
export function CopyButton({ text, label = "Sao chép", done = "Đã chép", className = "" }: { text: string; label?: string; done?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={"inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line px-3 text-sm " + className}
      onClick={() => {
        const write = navigator.clipboard?.writeText(text);
        if (!write) {
          pushToast("Máy không cho chép tự động. Hãy giữ lâu vào chữ để chép.", "bad");
          return;
        }
        void write
          .then(() => {
            setOk(true);
            pushToast(done);
            setTimeout(() => setOk(false), 2000);
          })
          .catch(() => pushToast("Máy không cho chép tự động. Hãy giữ lâu vào chữ để chép.", "bad"));
      }}
    >
      <Icon name={ok ? "CheckCircle" : "Copy"} />
      <span>{ok ? done : label}</span>
    </button>
  );
}
