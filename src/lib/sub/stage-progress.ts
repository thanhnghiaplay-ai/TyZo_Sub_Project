// Tiến trình theo giai đoạn: cắt → nhận dạng → dịch → sửa lại.
// Hàm thuần, chỉ đọc số đếm của lần chạy. Không gọi mạng, không ghi gì.

export type StageId = "cut" | "asr" | "translate" | "repair";
export type StageState = "wait" | "active" | "done" | "skip";
export type RunPhase = "idle" | "read" | "asr" | "ali";

export type Stage = {
  id: StageId;
  label: string;
  state: StageState;
  done: number;
  total: number;
  /** Chữ ngắn dưới nhãn, ví dụ "3/12 đoạn". Rỗng thì không hiện. */
  text: string;
};

export type StageInput = {
  phase: RunPhase;
  partsTotal: number;
  partsDone: number;
  segsTotal: number;
  segsDone: number;
  /** Số đoạn/câu đã gửi lại hoặc sửa: nhận dạng lại, lọc lại, kiểm tra ngôn ngữ, giải mã lại. */
  repairs: number;
  /** Số câu dịch lỗi còn lại. */
  failed: number;
};

export type StageReport = {
  stages: Stage[];
  /** 0..100 */
  percent: number;
  active: StageId | null;
};

const WEIGHT: Record<StageId, number> = { cut: 10, asr: 40, translate: 40, repair: 10 };
const LABEL: Record<StageId, string> = { cut: "Cắt", asr: "Nhận dạng", translate: "Dịch", repair: "Sửa lại" };

function ratio(done: number, total: number) {
  if (!(total > 0)) return 0;
  return Math.max(0, Math.min(1, done / total));
}

export function computeStages(input: StageInput): StageReport {
  const running = input.phase !== "idle";
  const ali = input.phase === "ali";
  const planned = input.partsTotal > 0;
  const asrDone = planned && input.partsDone >= input.partsTotal;
  const transDone = input.segsTotal > 0 && input.segsDone >= input.segsTotal && (asrDone || ali || (!running && planned));

  const cut: Stage = { id: "cut", label: LABEL.cut, state: "wait", done: 0, total: 0, text: "" };
  if (ali) {
    cut.state = "skip";
    cut.text = "Không cần";
  } else if (planned) {
    cut.state = "done";
    cut.done = cut.total = input.partsTotal;
    cut.text = `${input.partsTotal} đoạn`;
  } else if (input.phase === "read") {
    cut.state = "active";
    cut.text = "Đang đọc và cắt…";
  }

  const asr: Stage = { id: "asr", label: LABEL.asr, state: "wait", done: input.partsDone, total: input.partsTotal, text: "" };
  if (ali) {
    asr.state = input.segsTotal > 0 ? "done" : "active";
    asr.text = input.segsTotal > 0 ? `${input.segsTotal} câu` : "Alibaba đang nhận dạng…";
  } else if (planned) {
    asr.text = `${Math.min(input.partsDone, input.partsTotal)}/${input.partsTotal} đoạn`;
    asr.state = asrDone ? "done" : running ? "active" : "wait";
  }

  const translate: Stage = { id: "translate", label: LABEL.translate, state: "wait", done: input.segsDone, total: input.segsTotal, text: "" };
  if (input.segsTotal > 0) {
    translate.text = `${input.segsDone}/${input.segsTotal} câu`;
    translate.state = transDone ? "done" : running ? "active" : "wait";
  }

  const repair: Stage = { id: "repair", label: LABEL.repair, state: "wait", done: 0, total: 0, text: "" };
  const finished = !running && transDone;
  if (input.repairs > 0 || input.failed > 0) {
    repair.done = input.repairs;
    repair.total = input.repairs + input.failed;
    repair.text = input.failed > 0 ? `${input.repairs} đã sửa · ${input.failed} còn lỗi` : `${input.repairs} đã sửa`;
    repair.state = finished && input.failed === 0 ? "done" : running ? "active" : "wait";
  } else if (finished) {
    repair.state = "skip";
    repair.text = "Không cần";
  } else if (running && (asr.state === "active" || translate.state === "active")) {
    repair.text = "Kiểm tra khi chạy";
  }

  const stages = [cut, asr, translate, repair];
  let sum = 0;
  for (const stage of stages) {
    const w = WEIGHT[stage.id];
    if (stage.state === "done" || stage.state === "skip") sum += w;
    else if (stage.id === "asr" || stage.id === "translate") sum += w * ratio(stage.done, stage.total);
  }
  const percent = Math.round(Math.max(0, Math.min(100, sum)));
  const active = stages.find((s) => s.state === "active")?.id ?? null;
  return { stages, percent, active };
}
