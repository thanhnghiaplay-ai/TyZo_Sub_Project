import type { Bands, Health } from "@/lib/sub/quality";

export const HEALTH_COLOR: Record<Health, string> = {
  green: "#4ade80",
  yellow: "#e7b63a",
  red: "#f87171",
  unknown: "#93a6b6",
};

export const HEALTH_LABEL: Record<Health, string> = {
  green: "Tốt",
  yellow: "Cần chú ý",
  red: "Kém",
  unknown: "Chưa đủ số liệu",
};

export const BAND_COLOR = { high: "#4ade80", check: "#e7b63a", low: "#f87171" } as const;

export function pct(value: number | null | undefined, digits = 0): string {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : "—";
}

export function HealthPill({ health, reason }: { health: Health; reason?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold"
        style={{ background: HEALTH_COLOR[health], color: "#1a1400" }}
      >
        {HEALTH_LABEL[health]}
      </span>
      {reason && <span className="text-sm text-muted">{reason}</span>}
    </div>
  );
}

/** Thanh ba màu: độ tin cao, cần kiểm tra, thấp. Không có câu thì hiện thanh xám. */
export function BandBar({ bands }: { bands: Bands }) {
  const known = bands.high + bands.check + bands.low;
  const share = (n: number) => (known ? (n / known) * 100 : 0);
  return (
    <div className="grid gap-1">
      <div className="flex h-4 w-full overflow-hidden rounded-full" style={{ background: "#2c4154" }} role="img" aria-label="Phân bố độ tin cậy">
        <div style={{ width: `${share(bands.high)}%`, background: BAND_COLOR.high }} />
        <div style={{ width: `${share(bands.check)}%`, background: BAND_COLOR.check }} />
        <div style={{ width: `${share(bands.low)}%`, background: BAND_COLOR.low }} />
      </div>
      <p className="flex flex-wrap gap-x-4 text-sm text-muted">
        <span>
          <span style={{ color: BAND_COLOR.high }}>●</span> Cao {known ? pct(bands.high / known) : "—"} ({bands.high})
        </span>
        <span>
          <span style={{ color: BAND_COLOR.check }}>●</span> Cần kiểm tra {known ? pct(bands.check / known) : "—"} ({bands.check})
        </span>
        <span>
          <span style={{ color: BAND_COLOR.low }}>●</span> Thấp {known ? pct(bands.low / known) : "—"} ({bands.low})
        </span>
      </p>
    </div>
  );
}
