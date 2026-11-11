import { PACK_ROLE_LABEL, PACK_ROLES, quotePack, type ServiceDoor, type ServicePack } from "@/lib/service-pack";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { PROVIDER_LABEL } from "@/lib/sub/provider";
import type { GroqBoard } from "@/lib/sub/groq-board";
import type { PriceOverride } from "@/lib/run-desk";
import type { PriceBook } from "@/lib/run-bill";

function dong(n: number | null) {
  if (n == null) return "chưa có giá";
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function PackPicker({
  door,
  packs,
  seconds,
  narration,
  board,
  groqMarkup,
  groqCustom,
  aliMarkup,
  aliCustom,
  selectedId,
  onSelect,
}: {
  door: ServiceDoor;
  packs: ServicePack[];
  seconds: number;
  narration: boolean;
  board: GroqBoard | null;
  groqMarkup: number;
  groqCustom: Record<string, PriceOverride>;
  aliMarkup: number;
  aliCustom: Record<string, PriceOverride>;
  selectedId: string | null;
  onSelect: (pack: ServicePack) => void;
}) {
  const shown = packs.filter((pack) => pack.enabled && pack.doors.includes(door));
  if (!shown.length) return null;
  const groqBook: PriceBook | null = board ? { rate: board.rate, rows: board.rows, desk: { markup: groqMarkup, custom: groqCustom } } : null;
  const aliBook: PriceBook | null = board ? { rate: board.rate, rows: ALIBABA_ROWS, desk: { markup: aliMarkup, custom: aliCustom } } : null;

  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-semibold">Gói dịch</h2>
      <p className="text-sm text-muted">
        {seconds > 0
          ? door === "turn"
            ? "Giá sau khi có tệp. Khoản giữ lớn hơn ước tính để phòng phát sinh. Thuyết minh, nếu bật, trừ ví lúc đọc và không nằm trong khoản giữ."
            : "Ước tính tiền nhà cung cấp trên key của bạn. Phòng không giữ ví ở cửa này."
          : "Chọn tệp, âm thanh hoặc đợi link có thời lượng để thấy giá từng gói."}
      </p>
      {shown.map((pack) => {
        const quote =
          seconds > 0 && groqBook && aliBook
            ? quotePack({ pack, seconds, door, narration, books: { groq: groqBook, alibaba: aliBook } })
            : null;
        const jobs = PACK_ROLES.filter((role) => pack.roles[role]).map((role) => {
          const assign = pack.roles[role]!;
          return `${PACK_ROLE_LABEL[role]}: ${PROVIDER_LABEL[assign.provider]}`;
        });
        const on = selectedId === pack.id;
        return (
          <button
            key={pack.id}
            type="button"
            className={"grid gap-1 rounded-xl border px-3 py-2 text-left " + (on ? "border-accent bg-accent/10" : "border-line")}
            onClick={() => onSelect(pack)}
          >
            <span className="text-sm font-semibold">{pack.name}</span>
            {pack.note && <span className="text-sm text-muted">{pack.note}</span>}
            <span className="text-xs text-muted">{jobs.join(" · ")}</span>
            {quote && (
              <span className="text-sm">
                {quote.ready
                  ? door === "turn"
                    ? `Gốc ${dong(quote.base)} · Trả ${dong(quote.marked)} · Giữ ${dong(quote.hold)}`
                    : `Ước tính ${dong(quote.base)} trên key của bạn`
                  : "Gói chưa đủ giá niêm yết"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
