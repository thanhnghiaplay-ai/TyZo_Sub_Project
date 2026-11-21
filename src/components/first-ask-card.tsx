import { USE_CHOICES, type UseAnswer } from "@/lib/first-ask";

/**
 * Thẻ câu hỏi lần đầu ở trang chủ (đợt 4). Hỏi một lần, có Bỏ qua; không chặn việc khác trên trang.
 */
export function FirstAskCard({ onAnswer }: { onAnswer: (answer: UseAnswer | "skip") => void }) {
  return (
    <section aria-label="Câu hỏi lần đầu" data-first-ask className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">Bạn dùng TyZo Sub chủ yếu để làm gì?</p>
        <button type="button" className="min-tap shrink-0 rounded-full px-3 text-xs text-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent" onClick={() => onAnswer("skip")}>
          Bỏ qua
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {USE_CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2 text-left font-medium hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => onAnswer(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Hỏi một lần. App đặt sẵn vài lựa chọn hợp với bạn; đổi lại được bất cứ lúc nào.</p>
    </section>
  );
}
