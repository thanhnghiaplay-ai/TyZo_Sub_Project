/** RE3-002: gói Opus thật từ WebCodecs AudioEncoder (Chromium) → bộ đóng gói WebM của app (buildOpusWebm) → bộ dò. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { buildOpusWebm } from "../../../src/lib/sub/codec.ts";
import { probeAudioBytes } from "../../../src/lib/billing/audio-probe.ts";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
// WebCodecs chỉ có trong secure context: 127.0.0.1 cục bộ.
const server = createServer((_q, r) => r.end("<!doctype html><title>enc</title>"));
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
await page.goto(`http://127.0.0.1:${(server.address() as { port: number }).port}/`);
let bad = 0;
for (const [seconds, kind] of [[30, "tone"], [90, "silence"]] as const) {
  const out = await page.evaluate(async ({ seconds, kind }) => {
    const rate = 48000;
    const packets: Array<{ data: number[]; timestampUs: number; durationUs: number }> = [];
    let description: number[] | null = null;
    const enc = new AudioEncoder({
      output: (chunk, meta) => {
        const d = new Uint8Array(chunk.byteLength);
        chunk.copyTo(d);
        const desc = meta?.decoderConfig?.description as ArrayBuffer | undefined;
        if (desc && !description) description = Array.from(new Uint8Array(desc));
        packets.push({ data: Array.from(d), timestampUs: chunk.timestamp, durationUs: chunk.duration ?? 20000 });
      },
      error: (e) => { throw e; },
    });
    enc.configure({ codec: "opus", sampleRate: rate, numberOfChannels: 1, bitrate: 20000 });
    const frame = 960;
    for (let i = 0; i < (seconds * rate) / frame; i++) {
      const data = new Float32Array(frame);
      if (kind === "tone") for (let k = 0; k < frame; k++) data[k] = 0.3 * Math.sin(((i * frame + k) * 2 * Math.PI * 440) / rate);
      enc.encode(new AudioData({ format: "f32", sampleRate: rate, numberOfFrames: frame, numberOfChannels: 1, timestamp: (i * frame * 1e6) / rate, data }));
    }
    await enc.flush();
    return { packets, description };
  }, { seconds, kind });
  const blob = buildOpusWebm(out.packets.map((p) => ({ ...p, data: Uint8Array.from(p.data) })), out.description ? Uint8Array.from(out.description) : null, 48000, 1);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const probe = probeAudioBytes(bytes);
  const ok = probe.ok && probe.seconds >= seconds - 0.001 && probe.seconds <= seconds * 1.05 + 0.2;
  if (!ok) bad++;
  console.log(JSON.stringify({ kind, seconds, packets: out.packets.length, bytes: bytes.length, oldEstimate: +(bytes.length / 2000).toFixed(3), probe: probe.ok ? +probe.seconds.toFixed(3) : probe.reason, ok }));
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
