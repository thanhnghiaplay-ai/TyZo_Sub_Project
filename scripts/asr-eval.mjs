// Dùng: node scripts/asr-eval.mjs zh file.srt   (zh | ja | en)
// So bản nhận dạng với đáp án trong doi-chieu.txt: CER (zh, ja), WER (en), lệch giờ từng câu.
import { readFileSync } from "node:fs";

const KEY = {
  zh: { clean: [0.0, 3.9, 8.3, 11.7], hard: [19.3, 23.2, 27.6, 31.0], text: ["你倒是一点没变，还是那么会装糊涂。", "彼此彼此。你不也还是死鸭子嘴硬？", "这个项目黄了，你我都脱不了干系。", "别拿话噎我，我又不是三岁小孩。"] },
  ja: { clean: [0.0, 2.5, 5.9, 8.9], hard: [13.9, 16.4, 19.8, 22.8], text: ["今度ぜひ飲みに行きましょう。", "ええ、ぜひ。前向きに検討しておきます。", "店長、それって断ってるんですか？", "さあね。察してくれ。"] },
  en: { clean: [0.0, 3.5, 6.2, 10.0], hard: [16.4, 19.9, 22.6, 26.4], text: ["Don't spill the beans yet. We're still on thin ice.", "Spill what? You haven't told me squat.", "Exactly. Keep it that way. It's above your pay grade.", "Fine. But if this blows up, I'm not taking the fall."] },
};

const lang = process.argv[2];
const file = process.argv[3];
if (!KEY[lang] || !file) {
  console.error("Cách dùng: node scripts/asr-eval.mjs <zh|ja|en> <file.srt>");
  process.exit(1);
}

const toSec = (t) => {
  const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, "0") / 1000;
};
const cues = readFileSync(file, "utf8").replace(/\r/g, "").trim().split(/\n\n+/).map((b) => {
  const lines = b.split("\n");
  const [a, z] = lines[1].split("-->").map((x) => toSec(x.trim()));
  return { start: a, end: z, text: lines.slice(2).join(" ") };
});

const strip = (s, en) => (en ? s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean) : [...s.replace(/[\s\p{P}\p{S}]/gu, "")]);
function dist(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const en = lang === "en";
const k = KEY[lang];
const half = (starts, from, to) => cues.filter((c) => c.start >= from && c.start < to);
const parts = { clean: half(k.clean, -1, k.hard[0] - 1.5), hard: half(k.hard, k.hard[0] - 1.5, 1e9) };
for (const [name, list] of Object.entries(parts)) {
  const ref = en ? strip(k.text.join(" "), true) : strip(k.text.join(""), false);
  const hyp = en ? strip(list.map((c) => c.text).join(" "), true) : strip(list.map((c) => c.text).join(""), false);
  const err = dist(ref, hyp) / ref.length;
  console.log(`\n== ${lang} ${name}: ${en ? "WER" : "CER"} = ${(err * 100).toFixed(1)}%  (${list.length} câu, đáp án 4)`);
  const starts = k[name];
  list.forEach((c, i) => {
    const near = starts.reduce((b, s) => (Math.abs(s - c.start) < Math.abs(b - c.start) ? s : b), starts[0]);
    console.log(`  ${c.start.toFixed(2)}–${c.end.toFixed(2)}  lệch ${(c.start - near >= 0 ? "+" : "") + (c.start - near).toFixed(2)}s  ${c.text}`);
  });
}
