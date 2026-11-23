import { BrandMark } from "@/components/brand-mark";

/**
 * Màn kết thúc thanh toán gói (pay-slip).
 * Cảm ơn: vòng sáng màu nhấn, dấu tích vẽ nét, tia sáng tỏa ra, tiêu đề chuyển màu.
 * Xin lỗi: dịu hơn, không tia sáng, biểu tượng đồng hồ cát màu mờ.
 * Màu lấy từ --color-accent / --color-success / --color-error nên đổi bộ màu của web thì màn này đổi theo.
 * Hiệu ứng tắt khi khách tắt hiệu ứng (data-fx="off") hoặc bật giảm chuyển động (CSS ở styles.css, khối «PAY-END»).
 */
const SPARKS = 14;

export function PayEnding({ kind, text, actionLabel, onAction }: { kind: "thanks" | "sorry"; text: string; actionLabel?: string; onAction?: () => void }) {
  const thanks = kind === "thanks";
  return (
    <div className={"pay-end " + (thanks ? "pay-end-thanks" : "pay-end-sorry")} role="status" aria-live="polite">
      <div className="pay-end-stage" aria-hidden="true">
        <span className="pay-end-glow" />
        {thanks &&
          Array.from({ length: SPARKS }, (_, index) => (
            <span key={index} className="pay-end-spark" style={{ ["--i" as string]: index }} />
          ))}
        <svg className="pay-end-badge" viewBox="0 0 64 64">
          <circle className="pay-end-disc" cx="32" cy="32" r="28" />
          <circle className="pay-end-orbit" cx="32" cy="32" r="28" pathLength="1" />
          {thanks ? (
            <path className="pay-end-check" d="M20 33.5l8.5 8.5L44.5 24" pathLength="1" />
          ) : (
            <path className="pay-end-hourglass" d="M23 18h18M23 46h18M25 18c0 8 7 10 7 14s-7 6-7 14M39 18c0 8-7 10-7 14s7 6 7 14" />
          )}
        </svg>
      </div>
      <div className="pay-end-brand">
        <BrandMark title="TyZo Sub" small />
      </div>
      <p className="pay-end-head">{thanks ? "Xin cảm ơn" : "Xin lỗi vì sự bất tiện này"}</p>
      <p className="pay-end-text">{text}</p>
      {actionLabel && onAction && (
        <button type="button" className="pay-end-action min-tap rounded-full bg-accent px-6 text-sm font-semibold text-ink" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
