/**
 * Nhận diện định dạng file và loại âm thanh từ vài MB đầu, để báo lỗi giải mã cho đúng việc.
 * Hàm thuần, không import gì, chạy được trong test Node.
 *
 * Không giải mã gì cả. Trình duyệt không đọc được AC3, DTS, TrueHD, WMA và nhiều gói AVI/TS/FLV, và app không
 * mang bộ giải mã riêng (xem «Không làm» trong BANG_DIEU.md). Việc ở đây là nói rõ file này là gì,
 * vì sao không đọc được, và đưa sẵn lệnh ffmpeg để đổi sang M4A.
 */

export type Container = "mp4" | "matroska" | "webm" | "avi" | "wav" | "mp3" | "ogg" | "flac" | "aac" | "ac3" | "ts" | "flv" | "asf" | "unknown";
export type AudioCodec = "aac" | "mp3" | "ac3" | "eac3" | "dts" | "truehd" | "opus" | "vorbis" | "flac" | "alac" | "pcm" | "wma";

export type Sniffed = { container: Container; codecs: AudioCodec[] };

/** Số byte đầu cần đọc để nhận diện. MKV có thể để bảng track sau phần phông chữ nhúng nên lấy rộng. */
export const SNIFF_BYTES = 2 * 1024 * 1024;

const ascii = (b: Uint8Array, o: number, n: number) => {
  let out = "";
  for (let i = o; i < o + n && i < b.length; i++) out += String.fromCharCode(b[i]);
  return out;
};

/** Chuỗi ASCII của cả đoạn đầu, đủ để tìm mã codec. Latin-1 nên không lỗi với byte lạ. */
function asciiAll(b: Uint8Array): string {
  const parts: string[] = [];
  const step = 32768;
  for (let i = 0; i < b.length; i += step) parts.push(String.fromCharCode(...b.subarray(i, Math.min(b.length, i + step))));
  return parts.join("");
}

function sniffContainer(b: Uint8Array): Container {
  if (b.length < 4) return "unknown";
  if (b.length >= 8 && ascii(b, 4, 4) === "ftyp") return "mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return ascii(b, 0, 64).includes("webm") ? "webm" : "matroska";
  if (ascii(b, 0, 4) === "RIFF" && b.length >= 12) {
    const kind = ascii(b, 8, 4);
    if (kind === "AVI ") return "avi";
    if (kind === "WAVE") return "wav";
  }
  if (ascii(b, 0, 4) === "OggS") return "ogg";
  if (ascii(b, 0, 4) === "fLaC") return "flac";
  if (ascii(b, 0, 3) === "FLV" && b[3] === 1) return "flv";
  if (b.length >= 16 && b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75 && b[4] === 0x8e && b[5] === 0x66 && b[6] === 0xcf && b[7] === 0x11) return "asf";
  if (b[0] === 0x0b && b[1] === 0x77) return "ac3";
  if (ascii(b, 0, 3) === "ID3") return "mp3";
  if (b[0] === 0xff) {
    if ((b[1] & 0xf6) === 0xf0) return "aac";
    if ((b[1] & 0xe0) === 0xe0 && ((b[1] >> 1) & 3) !== 0) return "mp3";
  }
  if (b.length > 376 && b[0] === 0x47 && b[188] === 0x47 && b[376] === 0x47) return "ts";
  return "unknown";
}

const FOURCC: Array<[string, AudioCodec]> = [
  ["ac-3", "ac3"],
  ["ec-3", "eac3"],
  ["dtsc", "dts"],
  ["dtsh", "dts"],
  ["dtsl", "dts"],
  ["dtse", "dts"],
  ["Opus", "opus"],
  ["alac", "alac"],
  ["fLaC", "flac"],
  ["mp4a", "aac"],
];

const MATROSKA: Array<[string, AudioCodec]> = [
  ["A_EAC3", "eac3"],
  ["A_AC3", "ac3"],
  ["A_DTS", "dts"],
  ["A_TRUEHD", "truehd"],
  ["A_MLP", "truehd"],
  ["A_AAC", "aac"],
  ["A_OPUS", "opus"],
  ["A_VORBIS", "vorbis"],
  ["A_FLAC", "flac"],
  ["A_MPEG/L3", "mp3"],
  ["A_MPEG/L2", "mp3"],
  ["A_PCM", "pcm"],
];

/** Phân loại theo đầu file. `hint` là chuỗi chữ thêm, ví dụ câu lý do từ bộ đọc MP4, để bắt mã codec khi bảng mô tả nằm cuối file. */
export function sniffMedia(head: Uint8Array, hint = ""): Sniffed {
  const container = sniffContainer(head);
  const found: AudioCodec[] = [];
  const add = (codec: AudioCodec) => {
    if (!found.includes(codec)) found.push(codec);
  };
  const text = container === "mp4" || container === "matroska" || container === "webm" ? asciiAll(head) : "";
  if (container === "mp4") for (const [code, codec] of FOURCC) if (text.includes(code)) add(codec);
  if (container === "matroska" || container === "webm") for (const [code, codec] of MATROSKA) if (text.includes(code)) add(codec);
  for (const [code, codec] of FOURCC) if (hint.includes(code)) add(codec);
  if (container === "ac3") add(((head[5] ?? 0) >> 3) > 10 ? "eac3" : "ac3");
  if (container === "mp3") add("mp3");
  if (container === "aac") add("aac");
  if (container === "flac") add("flac");
  if (container === "wav") add("pcm");
  if (container === "asf") add("wma");
  // MP4/MKV có 'mp4a' chung với các luồng khác. Có loại cụ thể hơn thì bỏ nhãn chung.
  if (found.length > 1 && found.includes("aac") && container !== "mp4" && container !== "matroska" && container !== "webm") return { container, codecs: found.filter((c) => c !== "aac") };
  return { container, codecs: found };
}

const CONTAINER_LABEL: Record<Container, string> = {
  mp4: "MP4/MOV",
  matroska: "MKV",
  webm: "WebM",
  avi: "AVI",
  wav: "WAV",
  mp3: "MP3",
  ogg: "OGG",
  flac: "FLAC",
  aac: "AAC thô",
  ac3: "AC3 thô",
  ts: "MPEG-TS",
  flv: "FLV",
  asf: "WMV/ASF",
  unknown: "định dạng chưa nhận ra",
};

const CODEC_LABEL: Record<AudioCodec, string> = {
  aac: "AAC",
  mp3: "MP3",
  ac3: "AC3 (Dolby Digital)",
  eac3: "E-AC3 (Dolby Digital Plus)",
  dts: "DTS",
  truehd: "TrueHD",
  opus: "Opus",
  vorbis: "Vorbis",
  flac: "FLAC",
  alac: "ALAC",
  pcm: "PCM",
  wma: "WMA",
};

/** Loại âm thanh mà trình duyệt phổ thông không giải mã được. */
const UNSUPPORTED: AudioCodec[] = ["ac3", "eac3", "dts", "truehd", "wma"];
/** Gói mà trình duyệt thường không đọc được dù âm thanh bên trong là gì. */
const RARE_CONTAINERS: Container[] = ["avi", "ts", "flv", "asf"];

export function isUnsupportedCodec(codec: AudioCodec): boolean {
  return UNSUPPORTED.includes(codec);
}

/** Lệnh đổi âm thanh sang M4A mono 16 kHz nhỏ gọn, chạy được với mọi codec đầu vào. */
export function ffmpegCommand(fileName: string): string {
  const name = fileName.replace(/["\r\n]/g, "").trim() || "phim.mkv";
  return `ffmpeg -i "${name}" -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags +faststart am-thanh.m4a`;
}

/**
 * Câu báo lỗi khi `decodeAudioData` không đọc được file. Nói file là gì, vì sao, và làm gì tiếp.
 * Không nhắc kỹ thuật nội bộ. Luôn kèm lệnh ffmpeg và chỗ chọn «Âm thanh riêng».
 */
export function describeDecodeFailure(input: { fileName?: string; head: Uint8Array; hint?: string }): string {
  const { container, codecs } = sniffMedia(input.head, input.hint || "");
  const labelParts: string[] = [];
  if (container !== "unknown") labelParts.push(`file ${CONTAINER_LABEL[container]}`);
  if (codecs.length) labelParts.push(`âm thanh ${codecs.map((c) => CODEC_LABEL[c]).join(", ")}`);
  const seen = labelParts.length ? `Phát hiện: ${labelParts.join(", ")}. ` : "";

  let why: string;
  if (codecs.some(isUnsupportedCodec)) why = "Trình duyệt không giải mã được loại âm thanh này.";
  else if (RARE_CONTAINERS.includes(container)) why = "Trình duyệt thường không đọc được định dạng này.";
  else if (container === "matroska") why = "Trình duyệt chỉ đọc MKV khi âm thanh là loại phổ biến như AAC, Opus, Vorbis, MP3 hoặc FLAC.";
  else if (codecs.length) why = "Loại âm thanh này thường đọc được, nên file có thể bị hỏng hoặc tải chưa đủ. Thử chép lại file, nếu vẫn lỗi thì làm theo cách dưới.";
  else why = "Chưa xác định được loại âm thanh, có thể file hỏng hoặc không phải video/âm thanh.";

  return (
    `Không giải mã được âm thanh trong file này. ${seen}${why} ` +
    `Cách xử lý: tách âm thanh bằng ffmpeg rồi chọn tệp m4a vào ô Âm thanh riêng, video vẫn phát từ file gốc. ` +
    `Lệnh: ${ffmpegCommand(input.fileName || "")} ` +
    `(Android dùng Termux, máy tính tải ffmpeg ở ffmpeg.org.)`
  );
}
