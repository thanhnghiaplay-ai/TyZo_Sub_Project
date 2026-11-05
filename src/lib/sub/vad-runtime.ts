import { VAD_WINDOW } from "./vad.ts";

const MODEL_URL = "/models/silero_vad.int8.onnx";
const WASM_URL = "/vad/";

type OrtModule = typeof import("onnxruntime-web");
type Session = Awaited<ReturnType<OrtModule["InferenceSession"]["create"]>>;

let loading: Promise<Session> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function session(): Promise<Session> {
  if (!loading) {
    loading = (async () => {
      const ort = await import("onnxruntime-web");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = WASM_URL;
      const bytes = await fetch(MODEL_URL).then((res) => {
        if (!res.ok) throw new Error("Không tải được mô hình lọc tiếng người.");
        return res.arrayBuffer();
      });
      return ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
    })().catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

function zeros(count: number) {
  return new Float32Array(count);
}

/** Xác suất có lời của từng cửa sổ 512 mẫu. Chỉ gọi khi người dùng bật lọc. */
export async function speechProbabilities(samples: Float32Array): Promise<number[]> {
  if (typeof window === "undefined") throw new Error("Bộ lọc tiếng người chỉ chạy trên trình duyệt.");
  return oneAtATime(async () => {
    const model = await session();
    const ort = await import("onnxruntime-web");
    let h = zeros(2 * 64);
    let c = zeros(2 * 64);
    const probs: number[] = [];
    for (let at = 0; at + VAD_WINDOW <= samples.length; at += VAD_WINDOW) {
      const window = samples.slice(at, at + VAD_WINDOW);
      const out = await model.run({
        x: new ort.Tensor("float32", window, [1, VAD_WINDOW]),
        h: new ort.Tensor("float32", h, [2, 1, 64]),
        c: new ort.Tensor("float32", c, [2, 1, 64]),
      });
      const prob = out.prob.data as Float32Array;
      probs.push(prob[0] ?? 0);
      h = Float32Array.from(out.new_h.data as Float32Array);
      c = Float32Array.from(out.new_c.data as Float32Array);
    }
    return probs;
  });
}
