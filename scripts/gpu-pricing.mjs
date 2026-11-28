/**
 * RE8-011: PHÂN TÍCH phương án giá GPU TyZo Modal từ bộ MÔ PHỎNG (scripts/gpu-sim.mjs). KHÔNG đổi giá thật.
 * Đơn vị: USD giá gốc (trước % chênh của phòng khi quy ra Token dịch). Lợi nhuận là biên trên doanh thu:
 *   doanh thu cần = chi phí / (1 − biên). Ví dụ biên 20% → doanh thu = chi phí × 1,25.
 * Thu hiện tại mỗi lượt = giây xử lý × 0,80 USD/giờ × hệ số bù 3 (src/lib/sub/tyzo-modal-price.ts).
 */
import { PRICE, film, simulate } from "./gpu-sim.mjs";

export const MARGINS = [0.1, 0.2, 0.3, 0.4];
export const LENGTHS = [0.5, 5, 10, 30, 74]; // phút video mỗi lượt
export const CONFIGS = {
  "hiện tại (dự phòng 2, chờ tắt 60 s)": {},
  "thử nghiệm (dự phòng 1, chờ tắt 30 s)": { asr: { buffer: 1, window: 30 } },
};
const minutes = (m) => (m < 1 ? `${m * 60} s` : `${m} phút`);

/** Một lượt = một video của một khách. «đơn lẻ»: máy lạnh, không ai khác. «cao điểm»: ≈80% năng lực, ≤ 100 khách/giờ. */
export function jobCost(lengthMin, profile, pattern, opt) {
  if (pattern === "đơn lẻ") {
    const r = simulate(film("a", 0, lengthMin, profile).map((p) => ({ ...p, audio: Math.min(30, lengthMin * 60) })), opt);
    return { ...per(r, 1), lengthMin };
  }
  // Tải ≈ 80% năng lực cửa 8 đoạn (≈ 3.100 đoạn 30 s/giờ), tối đa 100 khách/giờ, khách đến đều.
  const parts = Math.max(1, Math.round((lengthMin * 60) / 30));
  const n = Math.max(2, Math.min(100, Math.floor(2400 / parts)));
  const jobs = Array.from({ length: n }, (_, i) => film(`c${i}`, (i * 3600) / n, lengthMin, profile).map((p) => ({ ...p, audio: Math.min(30, lengthMin * 60) }))).flat();
  return { ...per(simulate(jobs, opt), n), lengthMin };
}

function per(r, n) {
  const usd = (sec, price) => (sec * price) / 3600 / n;
  const s = r.split;
  return {
    cost: r.costUsd / n,
    asr: { boot: usd(s.asrBoot, PRICE.L4), busy: usd(s.asrBusy, PRICE.L4), idle: usd(s.asrIdle, PRICE.L4) },
    llm: { boot: usd(s.llmBoot, PRICE.L40S), active: usd(s.llmActive, PRICE.L40S), idle: usd(s.llmIdle, PRICE.L40S) },
    charged: r.chargedUsd / n,
    procUsd: (r.procSec * PRICE.L4) / 3600 / n, // giá GPU nhận dạng thuần theo giây xử lý (hệ số 1)
    p95: r.p95,
  };
}

const target = (cost, m) => cost / (1 - m);

/** Bảng: chi phí theo pha, thu hiện tại, và 4 phương án ở mỗi biên lợi nhuận. */
export function analyze() {
  const out = {};
  for (const [cname, opt] of Object.entries(CONFIGS)) {
    out[cname] = {};
    for (const profile of ["nhanh", "ky"]) for (const pattern of ["đơn lẻ", "cao điểm"]) {
      const rows = LENGTHS.map((L) => jobCost(L, profile, pattern, opt));
      out[cname][`${profile} · ${pattern}`] = rows.map((r) => ({
        length: minutes(r.lengthMin), cost: r.cost, charged: r.charged, coverage: r.charged / r.cost,
        breakdown: r,
        // (1) Phí tối thiểu mỗi lượt: thu = max(thu hiện tại, F). F cần để lượt này đạt biên.
        minFee: Object.fromEntries(MARGINS.map((m) => [m, Math.max(0, target(r.cost, m))])),
        // (2) Hệ số theo độ dài: hệ số bù cần (thay cho 3) để lượt độ dài này đạt biên.
        factor: Object.fromEntries(MARGINS.map((m) => [m, target(r.cost, m) / r.procUsd])),
        // (3) Gói tách: hệ số riêng cho GPU nhận dạng; phí GPU dịch (máy chữ) theo phút video.
        asrFactor: Object.fromEntries(MARGINS.map((m) => [m, target(r.asr.boot + r.asr.busy + r.asr.idle, m) / r.procUsd])),
        llmPerMin: Object.fromEntries(MARGINS.map((m) => [m, target(r.llm.boot + r.llm.active + r.llm.idle, m) / r.lengthMin])),
      }));
    }
  }
  return out;
}

const f3 = (x) => (x >= 1 ? x.toFixed(2) : x.toFixed(4));
export function markdown(a = analyze()) {
  const lines = [];
  for (const [cname, groups] of Object.entries(a)) {
    lines.push(`### Cấu hình ${cname}`, "");
    for (const [g, rows] of Object.entries(groups)) {
      lines.push(`#### ${g}`, "", "| Độ dài | Chi phí/lượt USD | Khởi động · xử lý · rảnh (nhận dạng) | Máy chữ | Thu hiện tại | Thu/chi | Phí tối thiểu 10/20/30/40% | Hệ số cần 10/20/30/40% | Phí máy chữ/phút 20% | P95 (s) |", "|---|---|---|---|---|---|---|---|---|---|");
      for (const r of rows) {
        const b = r.breakdown, llm = b.llm.boot + b.llm.active + b.llm.idle;
        lines.push(`| ${r.length} | ${f3(r.cost)} | ${f3(b.asr.boot)} · ${f3(b.asr.busy)} · ${f3(b.asr.idle)} | ${f3(llm)} | ${f3(r.charged)} | ${r.coverage.toFixed(2)}${r.coverage < 1 ? " ⚠" : ""} | ${MARGINS.map((m) => f3(r.minFee[m])).join(" / ")} | ${MARGINS.map((m) => r.factor[m].toFixed(1)).join(" / ")} | ${f3(r.llmPerMin[0.2])} | ${b.p95.toFixed(0)} |`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

/**
 * Phương án kết hợp: thu mỗi lượt = phí cố định (nhanh: F; kỹ: F + Fk cho máy chữ) + giây xử lý × 0,80 × k / 3.600.
 * Trả biên lợi nhuận đạt được (1 − chi phí / thu) cho từng kịch bản; âm = lỗ.
 */
export const COMBOS = {
  "hiện tại: chỉ hệ số 3": { F: 0, Fk: 0, k: 3 },
  "F 0,02 + k 3": { F: 0.02, Fk: 0, k: 3 },
  "F 0,03 + kỹ +0,06 + k 2,5": { F: 0.03, Fk: 0.06, k: 2.5 },
  "F 0,03 + kỹ +0,08 + k 3": { F: 0.03, Fk: 0.08, k: 3 },
  "F 0,05 + kỹ +0,10 + k 2,5": { F: 0.05, Fk: 0.1, k: 2.5 },
};
export function comboTable(a = analyze()) {
  const lines = ["| Cấu hình · hồ sơ · kiểu tải | Độ dài | " + Object.keys(COMBOS).join(" | ") + " |", "|---|---|" + Object.keys(COMBOS).map(() => "---").join("|") + "|"];
  for (const [cname, groups] of Object.entries(a)) for (const [g, rows] of Object.entries(groups)) for (const r of rows) {
    const ky = g.startsWith("ky");
    const cells = Object.values(COMBOS).map(({ F, Fk, k }) => {
      const rev = F + (ky ? Fk : 0) + r.breakdown.procUsd * k;
      const m = 1 - r.cost / rev;
      return `${(m * 100).toFixed(0)}%${m < 0.2 ? " ⚠" : ""}`;
    });
    lines.push(`| ${cname.split(" (")[0]} · ${g} | ${r.length} | ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}
