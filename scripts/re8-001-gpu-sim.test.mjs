/**
 * RE8-001 / RE8-008: kiểm bộ MÔ PHỎNG vòng đời GPU (scripts/gpu-sim.mjs) và in bảng so sánh phương án.
 * Không gọi Modal. RE8_SIM_OUT=<tệp.md> để ghi bảng.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { test } from "node:test";
import { CURRENT, OPTIONS, PRICE, WORKLOADS, film, simulate } from "./gpu-sim.mjs";

const one = () => WORKLOADS["1 đoạn lẻ"]();

test("hiệu chỉnh: 1 đoạn lẻ = máy làm (16 + 9,3 + 60) + 2 máy dự phòng rảnh từ lúc bật xong (16 + 60); phim 74 phút gần số đo 2,5×", () => {
  const r = simulate(one());
  assert.ok(Math.abs(r.asrBilledSec - ((16 + 9.3 + 60) + 2 * (16 + 60))) <= 3 * 1.5, String(r.asrBilledSec));
  const f = simulate(WORKLOADS["liên tục: 1 phim 74 phút"]());
  assert.ok(f.ratio >= 1.5 && f.ratio <= 3, `tỷ lệ ${f.ratio}`);
  assert.ok(Math.abs(r.chargedUsd - (r.procSec * PRICE.L4 * 3) / 3600) < 1e-9);
});

test("bất biến: không vượt trần số máy, cửa nhận việc, mỗi khách; mọi đoạn đều xong; chi phí ≥ 0", () => {
  for (const [name, opt] of Object.entries(OPTIONS)) {
    const o = { ...CURRENT, ...opt, asr: { ...CURRENT.asr, ...opt.asr } };
    for (const mk of [WORKLOADS["8 khách cùng lúc × 1 đoạn"], WORKLOADS["liên tục: 1 phim 74 phút, hồ sơ kỹ"]]) {
      const r = simulate(mk(), opt);
      assert.ok(r.peakAsr <= o.asr.max, `${name}: ${r.peakAsr}`);
      assert.ok(r.peakLlm <= CURRENT.llm.max, `${name}: máy chữ ${r.peakLlm}`);
      assert.ok(r.costUsd >= 0 && Number.isFinite(r.p95), name);
    }
  }
});

test("RE8-008: trần máy model chữ 2 giữ chi phí L40S hữu hạn; không trần thì đợt «kỹ» dồn mở nhiều máy", () => {
  const burst = Array.from({ length: 40 }, (_, i) => film(`k${i}`, 0, 5, "ky")).flat();
  const capped = simulate(burst, { lane: 40, asr: { max: 40 } });
  const open = simulate(burst, { lane: 40, asr: { max: 40 }, llm: { max: 1000 } });
  assert.equal(capped.peakLlm, 2);
  assert.ok(open.peakLlm > capped.peakLlm, `${open.peakLlm}`);
  assert.ok(open.llmUsd > capped.llmUsd);
});

test("200 khách giờ cao điểm: cửa 8 đoạn bão hòa (P95 > 10 phút); cửa 16 + 16 máy giảm P95", () => {
  const w = WORKLOADS["cao điểm 200 khách (video 10 phút / khách / giờ)"]();
  const cur = simulate(w);
  const wide = simulate(w, OPTIONS["tối đa 16 máy, cửa 16"]);
  assert.ok(cur.p95 > 600, String(cur.p95));
  assert.ok(wide.p95 < cur.p95 / 4, `${wide.p95} vs ${cur.p95}`);
});

test("bảng so sánh phương án × kịch bản", (t) => {
  const rows = ["| Kịch bản | Phương án | Chi phí USD | Thu theo hệ số 3 / chi phí | Giây máy / giây xử lý | P95 đoạn (s) | Đoạn/giờ | Máy nhận dạng tối đa | Máy chữ tối đa |", "|---|---|---|---|---|---|---|---|---|"];
  for (const [w, mk] of Object.entries(WORKLOADS)) {
    const jobs = mk();
    for (const [name, opt] of Object.entries(OPTIONS)) {
      const r = simulate(jobs, opt);
      rows.push(`| ${w} | ${name} | ${r.costUsd.toFixed(3)} | ${r.coverage.toFixed(2)}${r.coverage < 1 ? " ⚠" : ""} | ${r.ratio.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.partsPerHour.toFixed(0)} | ${r.peakAsr} | ${r.peakLlm} |`);
    }
  }
  if (process.env.RE8_SIM_OUT) writeFileSync(process.env.RE8_SIM_OUT, rows.join("\n") + "\n");
  t.diagnostic(`${rows.length - 2} dòng`);
});
