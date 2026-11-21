/**
 * Trạng thái cách trả cho dòng đầu trang chủ (đợt 1 sắp lại trang khách, v5.21.0). Thuần, chỉ import tương đối.
 * Hai cách trả ngang hàng: «key» = Thuê phòng, khách dán key AI của mình; «turn» = Trả theo lượt bằng Token dịch, key của phòng.
 * Mỗi trạng thái đều có bước tiếp theo rõ ràng, không có ngõ cụt (huongdan.txt, mục C).
 */

export type PayChoice = "key" | "turn";

/** Khóa lưu trên máy: cách trả khách đã chọn, để lần sau vào thẳng. */
export const PAY_KEY = "tyzo_pay";

type Store = Pick<Storage, "getItem" | "setItem">;

export function readPayChoice(store: Store | null): PayChoice | null {
  try {
    const value = store?.getItem(PAY_KEY);
    return value === "key" || value === "turn" ? value : null;
  } catch {
    return null;
  }
}

export function rememberPayChoice(store: Store | null, choice: PayChoice) {
  try {
    store?.setItem(PAY_KEY, choice);
  } catch {
    /* máy chặn lưu: lần sau hỏi lại */
  }
}

export type PayAccount = { units: number; plan: string | null; planUntil: string | null; trialLeft: number };

/** Quyền dùng key riêng: gói thuê phòng còn hạn, dùng thử còn lượt, hoặc đã hết. */
export type RentAccess = { kind: "plan"; until: string } | { kind: "trial"; left: number } | { kind: "none" };

export function rentAccess(account: PayAccount, now = Date.now()): RentAccess {
  const until = account.planUntil ? Date.parse(account.planUntil) : NaN;
  if (account.plan && Number.isFinite(until) && until > now) return { kind: "plan", until: account.planUntil! };
  if (account.trialLeft > 0) return { kind: "trial", left: account.trialLeft };
  return { kind: "none" };
}

export type PayState =
  | { kind: "reading" }
  | { kind: "failed" }
  | { kind: "choose"; turnOpen: boolean }
  | { kind: "key-ready"; access: Exclude<RentAccess, { kind: "none" }>; keys: string[] }
  | { kind: "key-none"; access: Exclude<RentAccess, { kind: "none" }>; turnOpen: boolean }
  | { kind: "key-expired"; turnOpen: boolean }
  | { kind: "turn"; units: number }
  | { kind: "turn-empty" };

/**
 * choice: cách trả đang dùng (null = khách chưa chọn lần nào). keys: nhãn các nhà khách đã dán key.
 * turnOpen: cửa trả theo lượt đang mở (Chủ chưa bật bảo trì).
 */
export function payState(input: {
  choice: PayChoice | null;
  account: PayAccount | null;
  failed: boolean;
  keys: string[];
  turnOpen: boolean;
  now?: number;
}): PayState {
  if (!input.account) return input.failed ? { kind: "failed" } : { kind: "reading" };
  const choice = input.choice === "turn" && !input.turnOpen ? "key" : input.choice;
  if (!choice) return input.turnOpen ? { kind: "choose", turnOpen: true } : rentState(input, input.account);
  if (choice === "turn") return input.account.units > 0 ? { kind: "turn", units: input.account.units } : { kind: "turn-empty" };
  return rentState(input, input.account);
}

function rentState(input: { keys: string[]; turnOpen: boolean; now?: number }, account: PayAccount): PayState {
  const access = rentAccess(account, input.now);
  if (access.kind === "none") return { kind: "key-expired", turnOpen: input.turnOpen };
  if (!input.keys.length) return { kind: "key-none", access, turnOpen: input.turnOpen };
  return { kind: "key-ready", access, keys: input.keys };
}
