/**
 * RE8-001 / RE8-008: MÔ PHỎNG vòng đời GPU TyZo Modal. Đây KHÔNG phải hóa đơn và KHÔNG phải số đo thiết bị.
 * Bước thời gian 0,5 s. Hai nhóm máy:
 *  - nhận dạng (L4): mỗi máy xử lý một đoạn một lúc; khởi động `boot` giây; rảnh quá `window` thì tắt; khi đang có việc
 *    giữ thêm `buffer` máy rảnh; tối đa `max` máy; `warm` máy luôn bật.
 *  - model chữ (L40S, chỉ hồ sơ «kỹ»): bật khi có đoạn «kỹ» đang chạy, một máy nhận 64 yêu cầu; tối đa `max`.
 * Cửa nhận việc của app: tối đa `lane` đoạn cùng lúc, mỗi khách `perUser`.
 * `waitWarm`: nếu không có máy rảnh mà một máy sẽ xong trong ≤ waitWarm giây thì chờ máy đó thay vì bật máy mới (gom việc).
 * Độ trễ co giãn `scaleDelay` (đo 28/11 ≈ 30 s) áp cho máy mở theo nhu cầu; máy dự phòng bật sẵn nên tránh được.
 * Tiền app thu theo đoạn = giây xử lý × giá L4 × hệ số bù (mặc định 3).
 * Thông số đo thật 28/11 (v5.49.6/GPU-MODAL): lạnh 16 s (có bản chụp), mỗi đoạn 30 s xử lý 9,4 s (RTF 0,31 nhanh).
 */
export const PRICE = { L4: 0.8, L40S: 1.95 };
export const MEASURED = { boot: 16, rtf: { nhanh: 0.31, ky: 0.39 } };
export const CURRENT = {
  // scaleDelay: Modal chỉ mở máy mới theo nhu cầu sau khi việc đã chờ ~30 s (đo 28/11: 4 lệnh song song không được mở
  // thêm máy trong khoảng 30 s). Máy đầu tiên (không còn máy nào) và máy dự phòng không chịu độ trễ này.
  asr: { boot: 16, window: 60, buffer: 2, max: 9, warm: 0, scaleDelay: 30 },
  llm: { boot: 45, window: 60, max: 2, warm: 0, perContainer: 64, reqPerPart: 4 },
  lane: 8, perUser: 3, waitWarm: 0, overhead: 3,
};

const DT = 0.5;
const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

/** jobs: [{ at, user, audio (giây), profile }] — mỗi phần tử là một ĐOẠN. */
export function simulate(jobs, opt = {}) {
  const o = { ...CURRENT, ...opt, asr: { ...CURRENT.asr, ...opt.asr }, llm: { ...CURRENT.llm, ...opt.llm } };
  const parts = jobs.map((j, i) => ({ ...j, id: i, profile: j.profile ?? "nhanh", proc: j.audio * MEASURED.rtf[j.profile ?? "nhanh"], start: null, end: null }))
    .sort((a, b) => a.at - b.at || a.id - b.id);
  /** máy: readyAt (bật xong), part (đoạn đang chạy hoặc null), idleSince, pinned (luôn bật), held (đã dành cho một đoạn khi đang bật) */
  const boxes = [], llm = [];
  let t = 0, asrBilled = 0, llmBilled = 0, peakAsr = 0, peakLlm = 0, next = 0, done = 0;
  // Tách giây máy tính tiền: đang khởi động / đang xử lý / rảnh (gồm dự phòng, chờ tắt, máy luôn bật).
  const split = { asrBoot: 0, asrBusy: 0, asrIdle: 0, llmBoot: 0, llmActive: 0, llmIdle: 0 };
  const queue = []; // đoạn đã đến, chưa chạy (FIFO)
  const runningBy = new Map(); // user → số đoạn đang chạy hoặc đã dành máy
  let running = 0, kyRunning = 0;
  const spawn = (pool, boot, pinned = false) => { const b = { readyAt: t + boot, part: null, idleSince: t + boot, pinned, held: null }; pool.push(b); return b; };
  for (let i = 0; i < o.asr.warm; i++) spawn(boxes, 0, true);
  for (let i = 0; i < o.llm.warm; i++) spawn(llm, 0, true);
  const begin = (p, b) => { p.start = t; b.part = p; if (p.profile === "ky") kyRunning++; };
  const lastArrival = parts.length ? parts[parts.length - 1].at : 0;
  for (;;) {
    if (t > lastArrival + 48 * 3600) throw new Error("mô phỏng không dừng");
    // đoạn xong
    for (const b of boxes) if (b.part && b.part.start + b.part.proc <= t) {
      const p = b.part; p.end = t; done++; running--; runningBy.set(p.user, runningBy.get(p.user) - 1);
      if (p.profile === "ky") kyRunning--; b.part = null; b.idleSince = t;
    }
    while (next < parts.length && parts[next].at <= t) queue.push(parts[next++]);
    // máy vừa bật xong nhận đoạn đã dành
    for (const b of boxes) if (b.held && b.readyAt <= t) { begin(b.held, b); b.held = null; }
    // điều phối FIFO theo cửa nhận việc
    for (let i = 0; i < queue.length && running < o.lane; ) {
      const p = queue[i];
      if ((runningBy.get(p.user) ?? 0) >= o.perUser) { i++; continue; }
      let box = boxes.find((b) => b.readyAt <= t && !b.part && !b.held);
      if (!box) {
        const soon = boxes.some((b) => b.part && b.part.start + b.part.proc - t <= o.waitWarm);
        if (soon && o.waitWarm > 0) break;
        const free = boxes.find((b) => b.readyAt > t && !b.held); // máy dự phòng đang bật
        if (free) box = free;
        else if (boxes.length < o.asr.max && (boxes.length === 0 || t - p.at >= o.asr.scaleDelay)) box = spawn(boxes, o.asr.boot);
        else break;
      }
      queue.splice(i, 1); running++; runningBy.set(p.user, (runningBy.get(p.user) ?? 0) + 1);
      if (box.readyAt <= t) begin(p, box); else box.held = p;
    }
    // máy dự phòng khi đang có việc
    const active = running > 0 || queue.length > 0;
    if (active) {
      let spare = boxes.filter((b) => !b.part && !b.held).length;
      while (spare < o.asr.buffer && boxes.length < o.asr.max) { spawn(boxes, o.asr.boot); spare++; }
    }
    // tắt máy rảnh quá window (giữ đủ dự phòng lúc có việc, giữ máy luôn bật)
    let keep = active ? o.asr.buffer : 0;
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (b.part || b.held || b.readyAt > t || b.pinned) continue;
      if (t - b.idleSince >= o.asr.window) { if (keep > 0) { keep--; continue; } boxes.splice(i, 1); }
    }
    // máy model chữ
    const need = kyRunning ? Math.min(o.llm.max, Math.ceil((kyRunning * o.llm.reqPerPart) / o.llm.perContainer)) : 0;
    while (llm.length < need) spawn(llm, o.llm.boot);
    if (kyRunning) for (const b of llm) b.idleSince = Math.max(b.idleSince, t);
    for (let i = llm.length - 1; i >= 0; i--) if (!llm[i].pinned && !kyRunning && t - llm[i].idleSince >= o.llm.window) llm.splice(i, 1);
    asrBilled += boxes.length * DT; llmBilled += llm.length * DT;
    for (const b of boxes) split[b.readyAt > t ? "asrBoot" : b.part ? "asrBusy" : "asrIdle"] += DT;
    for (const b of llm) split[b.readyAt > t ? "llmBoot" : kyRunning ? "llmActive" : "llmIdle"] += DT;
    peakAsr = Math.max(peakAsr, boxes.length); peakLlm = Math.max(peakLlm, llm.length);
    t += DT;
    if (done === parts.length && boxes.every((b) => b.pinned) && llm.every((b) => b.pinned)) break;
  }
  // máy luôn bật: tính tiền cả giờ (không chỉ lúc có việc)
  const proc = parts.reduce((s, p) => s + p.proc, 0);
  const audio = parts.reduce((s, p) => s + p.audio, 0);
  const cost = (asrBilled * PRICE.L4 + llmBilled * PRICE.L40S) / 3600;
  const charged = (proc * PRICE.L4 * o.overhead) / 3600;
  const lat = parts.map((p) => p.end - p.at);
  const span = Math.max(...parts.map((p) => p.end)) - Math.min(...parts.map((p) => p.at));
  return {
    parts: parts.length, audioHours: audio / 3600, procSec: proc, asrBilledSec: asrBilled, llmBilledSec: llmBilled,
    costUsd: cost, asrUsd: (asrBilled * PRICE.L4) / 3600, llmUsd: (llmBilled * PRICE.L40S) / 3600,
    chargedUsd: charged, coverage: charged / cost, ratio: asrBilled / proc,
    usdPerAudioHour: cost / (audio / 3600), p50: pct(lat, 50), p95: pct(lat, 95), max: Math.max(...lat),
    partsPerHour: parts.length / (Math.max(span, 1) / 3600), peakAsr, peakLlm, split,
    kyProcSec: parts.filter((p) => p.profile === "ky").reduce((s, p) => s + p.proc, 0),
    alwaysOnNote: o.asr.warm || o.llm.warm ? "máy luôn bật chỉ tính trong khung mô phỏng; cả ngày: warm × 24 giờ" : null,
  };
}

/** Kịch bản tải (đoạn 30 s). */
export const film = (user, at, minutes, profile = "nhanh") =>
  Array.from({ length: Math.round((minutes * 60) / 30) }, () => ({ at, user, audio: 30, profile }));
export const WORKLOADS = {
  "1 đoạn lẻ": () => [{ at: 0, user: "a", audio: 30, profile: "nhanh" }],
  "rải rác 10 khách × 1 đoạn / 90 s": () => Array.from({ length: 10 }, (_, i) => ({ at: i * 90, user: `u${i}`, audio: 30, profile: "nhanh" })),
  "liên tục: 1 phim 74 phút": () => film("a", 0, 74),
  "liên tục: 1 phim 74 phút, hồ sơ kỹ": () => film("a", 0, 74, "ky"),
  "8 khách cùng lúc × 1 đoạn": () => Array.from({ length: 8 }, (_, i) => ({ at: 0, user: `u${i}`, audio: 30, profile: "nhanh" })),
  // Giờ cao điểm: N khách, mỗi khách một video 10 phút (20 đoạn), đến đều trong 60 phút, 10% chọn «kỹ».
  "cao điểm 100 khách (video 10 phút / khách / giờ)": () => Array.from({ length: 100 }, (_, i) => film(`c${i}`, i * 36, 10, i % 10 === 0 ? "ky" : "nhanh")).flat(),
  "cao điểm 200 khách (video 10 phút / khách / giờ)": () => Array.from({ length: 200 }, (_, i) => film(`c${i}`, i * 18, 10, i % 10 === 0 ? "ky" : "nhanh")).flat(),
};

export const OPTIONS = {
  "hiện tại (dự phòng 2, chờ tắt 60 s, tối đa 9)": {},
  "dự phòng 0": { asr: { buffer: 0 } },
  "dự phòng 1": { asr: { buffer: 1 } },
  "chờ tắt 10 s": { asr: { window: 10 } },
  "chờ tắt 30 s": { asr: { window: 30 } },
  "chờ tắt 300 s": { asr: { window: 300 } },
  "dự phòng 0 + gom (chờ máy nóng ≤ 10 s)": { asr: { buffer: 0 }, waitWarm: 10 },
  "dự phòng 1 + chờ tắt 30 s": { asr: { buffer: 1, window: 30 } },
  "tối đa 4 máy": { asr: { max: 4 }, lane: 4 },
  "tối đa 16 máy, cửa 16": { asr: { max: 16 }, lane: 16 },
  "1 máy luôn bật": { asr: { warm: 1 } },
  "khởi động lạnh 60 s (không bản chụp)": { asr: { boot: 60 }, llm: { boot: 180 } },
};
