/** Đối chiếu bộ dò RE3-002 với ffprobe trên tệp mã hóa THẬT (libopus/ffmpeg). Đối số: các tệp audio. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { probeAudioBytes } from "../../../src/lib/billing/audio-probe.ts";
let bad = 0;
for (const path of process.argv.slice(2)) {
  const bytes = new Uint8Array(readFileSync(path));
  const truth = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString(),
  );
  const t = performance.now();
  const probe = probeAudioBytes(bytes);
  const ms = +(performance.now() - t).toFixed(2);
  const old = bytes.length / 2000; // công thức cũ (fallback size/2000)
  const seconds = probe.ok ? +probe.seconds.toFixed(3) : null;
  const ok = probe.ok && probe.seconds >= truth - 0.001 && probe.seconds <= truth * 1.05 + 0.2;
  if (!ok) bad += 1;
  console.log(JSON.stringify({ file: path.split("/").pop(), bytes: bytes.length, ffprobe: truth, oldEstimate: +old.toFixed(3), probe: seconds, format: probe.ok ? probe.format : probe.reason, ms, ok }));
}
process.exit(bad ? 1 : 0);
