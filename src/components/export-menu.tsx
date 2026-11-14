import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download } from "lucide-react";

export type ExportFormat = "srt" | "vtt" | "txt";

const FORMATS: { id: ExportFormat; label: string; note: string }[] = [
  { id: "srt", label: "SRT (.srt)", note: "Hợp mọi trình phát, phổ biến nhất" },
  { id: "vtt", label: "WebVTT (.vtt)", note: "Dùng cho trang web và trình phát trực tuyến" },
  { id: "txt", label: "Chữ thuần (.txt)", note: "Mỗi câu một dòng, không có giờ" },
];

/** Nút «Tải phụ đề» mở menu chọn SRT, VTT hoặc TXT. Quyền xuất vẫn do máy chủ và use-pipeline kiểm. */
export function ExportMenu({ disabled, onPick }: { disabled: boolean; onPick: (format: ExportFormat) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        data-tour="export"
        disabled={disabled}
        aria-disabled={disabled}
        className="min-tap inline-flex items-center gap-1.5 rounded-xl border border-line px-3 text-sm disabled:pointer-events-none disabled:opacity-40"
      >
        <Download className="size-4" aria-hidden="true" />
        Tải phụ đề
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} className="z-50 w-64 overflow-hidden rounded-2xl border border-line bg-card p-1 shadow-xl">
          {FORMATS.map((item) => (
            <Menu.Item
              key={item.id}
              className="grid min-h-11 cursor-pointer gap-0.5 rounded-xl px-3 py-2 text-left text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-ink"
              onSelect={() => onPick(item.id)}
            >
              <span className="font-semibold">{item.label}</span>
              <span className="text-xs opacity-70">{item.note}</span>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
