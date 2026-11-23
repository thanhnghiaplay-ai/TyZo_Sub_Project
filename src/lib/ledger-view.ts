// Lịch sử Token/Gói cho khách. Hàm thuần: đọc sổ, gom dòng cho dễ hiểu. Không gọi mạng.

type LedgerItem = { id: number; kind: string; amount: number; note: string };

export type LedgerRow = {
  id: number;
  label: string;
  /** Chữ bên phải, ví dụ "+10.000 Token dịch". */
  main: string;
  /** Số tiền kèm theo, ví dụ "6.425 đ". Rỗng khi không có tiền. */
  money: string;
  tone: "up" | "down" | "plain" | "reject";
};

const nf = new Intl.NumberFormat("vi-VN");

function dong(n: number) {
  return nf.format(Math.abs(Math.round(n))) + " đ";
}

/**
 * Đổi sổ thành dòng hiển thị theo Token/Gói.
 * - Mua Token: hiện +Token và số tiền đã trả.
 * - Dòng bù nội bộ (gỡ số dư nhầm) và dòng nạp nhầm tương ứng được ẩn, vì cặp này triệt tiêu nhau.
 * - Dòng giữ/nhả tiền đồng cũ không phải việc mua, ẩn khỏi lịch sử.
 */
export function ledgerRows(items: LedgerItem[]): LedgerRow[] {
  // Mỗi dòng "Bù ..." âm N ẩn kèm một dòng "Nap ..." dương N.
  const clawback = new Map<number, number>();
  for (const item of items) {
    if (item.kind === "goi-giay" && item.amount < 0 && /^Bù /.test(item.note)) {
      clawback.set(-item.amount, (clawback.get(-item.amount) ?? 0) + 1);
    }
  }
  const out: LedgerRow[] = [];
  for (const item of items) {
    const reject = item.kind === "huy-nap" || /từ chối/i.test(item.note);
    if (reject) {
      out.push({ id: item.id, label: item.note, main: "Từ chối", money: "", tone: "reject" });
      continue;
    }
    if (item.kind === "goi-giay" && item.amount < 0 && /^Bù /.test(item.note)) continue;
    if (item.kind === "nap" && item.amount > 0 && /^Nap /.test(item.note)) {
      const left = clawback.get(item.amount) ?? 0;
      if (left > 0) {
        clawback.set(item.amount, left - 1);
        continue;
      }
    }
    if (item.kind === "giu" || item.kind === "nha") continue;
    const buy = /^Mua (\d+) Token dịch, hạn (\d+) ngày/.exec(item.note);
    if (buy) {
      const tokens = Number(buy[1]);
      out.push({
        id: item.id,
        label: `Mua ${nf.format(tokens)} Token dịch, hạn ${buy[2]} ngày`,
        main: `+${nf.format(tokens)} Token dịch`,
        money: item.amount > 0 ? dong(item.amount) : "",
        tone: "up",
      });
      continue;
    }
    const plan = /^Thuê phòng (.+)/.exec(item.note);
    if (plan) {
      out.push({ id: item.id, label: `Gói ${plan[1]}`, main: "+1 gói", money: item.amount > 0 ? dong(item.amount) : "", tone: "up" });
      continue;
    }
    if (item.kind === "nap") {
      out.push({ id: item.id, label: item.note.replace(/^Nap /, "Nạp "), main: item.amount > 0 ? "+" + dong(item.amount) : dong(item.amount), money: "", tone: item.amount > 0 ? "up" : "down" });
      continue;
    }
    out.push({
      id: item.id,
      label: item.note,
      main: item.amount === 0 ? "" : (item.amount > 0 ? "+" : "-") + dong(item.amount),
      money: "",
      tone: item.amount < 0 ? "down" : item.amount > 0 ? "up" : "plain",
    });
  }
  return out;
}
