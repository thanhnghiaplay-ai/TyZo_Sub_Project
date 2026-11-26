import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GENRE_PROMPT_MAX, genrePrompt } from "./genre-prompts.ts";
import {
  PolishRefusal,
  POLISH_REQUEST_MAX,
  VI_POLISH_EXAMPLES,
  batchContext,
  cleanPolishRequest,
  judgePolished,
  parsePolish,
  polishAll,
  polishMessages,
  polishSummary,
  polishSystem,
  type PolishCall,
  type PolishItem,
} from "./polish.ts";

const OPTS = { genre: "crime", context: "FILM CONTEXT: Hai anh em giang hồ.", language: "Vietnamese" };

/** Đọc các dòng model nhận được từ messages. */
function sentLines(messages: Array<{ role: string; content: string }>): Array<{ o: string; t: string }> {
  return JSON.parse(messages[1].content).lines;
}

/** Model giả: thêm "!" vào cuối mỗi câu. */
const exclaim: PolishCall = async (messages) => JSON.stringify({ t: sentLines(messages).map((l) => l.t + "!") });

function items(n: number): PolishItem[] {
  return Array.from({ length: n }, (_, i) => ({ original: `src ${i}`, translation: `Câu ${i}` }));
}

describe("lệnh trau chuốt", () => {
  it("giữ lệnh JSON gốc, nối prompt thể loại và ngữ cảnh phim", () => {
    const sys = polishSystem(3, OPTS);
    assert.ok(sys.includes(genrePrompt("crime").polish));
    assert.ok(sys.includes("FILM CONTEXT: Hai anh em giang hồ."));
    assert.ok(sys.includes("GENDER LOCK"));
    assert.ok(sys.trimEnd().endsWith('Return only JSON {"t":["..."]} with exactly 3 strings in the same order as "lines".'));
  });

  it("thể loại lạ rơi về prompt dự phòng, không để trống", () => {
    const sys = polishSystem(1, { ...OPTS, genre: "khong-co-the-loai-nay" });
    assert.ok(sys.includes("Polish the Vietnamese subtitles"));
  });

  it("prompt thể loại bị cắt ở giới hạn độ dài", () => {
    const sys = polishSystem(1, OPTS);
    const start = sys.indexOf(genrePrompt("crime").polish.slice(0, 20));
    assert.ok(start >= 0);
    assert.ok(genrePrompt("crime").polish.length <= GENRE_PROMPT_MAX);
  });

  it("user message có đủ câu, bản dịch hiện tại và ngữ cảnh hai phía", () => {
    const m = polishMessages([{ o: "a", t: "b" }], OPTS, [{ o: "x", t: "y" }], [{ o: "p", t: "q" }]);
    const body = JSON.parse(m[1].content);
    assert.deepEqual(body.lines, [{ o: "a", t: "b" }]);
    assert.deepEqual(body.context_before, [{ o: "x", t: "y" }]);
    assert.deepEqual(body.context_after, [{ o: "p", t: "q" }]);
  });
});

describe("lệnh trau chuốt v5.28.0: viết lại tự nhiên, câu mẫu, yêu cầu thêm", () => {
  it("cho viết lại tự nhiên nhưng giữ nghĩa, không còn dặn trả nguyên từng ký tự", () => {
    const sys = polishSystem(2, OPTS);
    assert.match(sys, /Rewrite freely/);
    assert.match(sys, /Keep the meaning/);
    assert.doesNotMatch(sys, /character for character/);
  });

  it("câu mẫu tiếng Việt chỉ gửi khi dịch sang tiếng Việt", () => {
    assert.match(polishSystem(1, { ...OPTS, language: "Vietnamese" }), /stiff -> natural/);
    assert.doesNotMatch(polishSystem(1, { ...OPTS, language: "English" }), /stiff -> natural/);
    assert.ok(VI_POLISH_EXAMPLES.length >= 4);
  });

  it("yêu cầu thêm của khách nằm TRÊN luật cố định cuối lệnh, được gọn và cắt ở 300 ký tự", () => {
    const sys = polishSystem(3, { ...OPTS, request: "  văn kiếm hiệp,\n xưng huynh đệ  " });
    assert.match(sys, /Viewer's style request[^\n]*văn kiếm hiệp, xưng huynh đệ/);
    assert.ok(sys.indexOf("Viewer's style request") < sys.indexOf("Never put an apology"));
    assert.ok(sys.trimEnd().endsWith('with exactly 3 strings in the same order as "lines".'));
    assert.equal(cleanPolishRequest("a".repeat(500)).length, POLISH_REQUEST_MAX);
    assert.doesNotMatch(polishSystem(1, { ...OPTS, request: "   " }), /Viewer's style request/);
  });

  it("ngữ cảnh trước rộng hơn (15 câu)", () => {
    const list = items(40);
    const { before } = batchContext(list, list.map((it) => it.translation as string), [30, 31]);
    assert.equal(before.length, 15);
  });
});

describe("parsePolish", () => {
  it("sai số câu là lỗi cả lần gọi", () => {
    assert.throws(() => parsePolish(JSON.stringify({ t: ["a"] }), 2), /thiếu câu/);
  });
  it("JSON hỏng hoặc không có mảng là lỗi", () => {
    assert.throws(() => parsePolish("xin lỗi", 1), /JSON không hợp lệ/);
    assert.throws(() => parsePolish(JSON.stringify({ t: "a" }), 1), /không đúng định dạng/);
  });
  it("ô không phải chuỗi thành rỗng, nhận cả khối ```json", () => {
    assert.deepEqual(parsePolish('```json\n{"t":["a",5]}\n```', 2), ["a", ""]);
  });
});

describe("judgePolished", () => {
  it("câu đổi hợp lệ là changed, câu y nguyên là same", () => {
    assert.deepEqual(judgePolished("Chào anh.", "Chào anh nhé."), { text: "Chào anh nhé.", status: "changed" });
    assert.equal(judgePolished("Chào anh.", " Chào anh. ").status, "same");
  });
  it("câu trống thì giữ bản cũ, failed", () => {
    const r = judgePolished("Chào anh.", "  ");
    assert.equal(r.status, "failed");
    assert.equal(r.text, "Chào anh.");
  });
  it("câu từ chối thì giữ bản cũ, refused", () => {
    const r = judgePolished("Giết nó đi.", "Tôi xin lỗi, tôi không thể giúp với yêu cầu này.");
    assert.equal(r.status, "refused");
    assert.equal(r.text, "Giết nó đi.");
    assert.equal(judgePolished("I can't help you", "I can't help you!").status, "changed");
  });
  it("mất hoặc đổi ký hiệu thuật ngữ thì giữ bản cũ", () => {
    assert.equal(judgePolished("{{G1}} đến rồi.", "Hắn đến rồi.").status, "failed");
    assert.equal(judgePolished("{{G1}} đến rồi.", "{{G10}} đến rồi.").status, "failed");
    assert.equal(judgePolished("{{G1}} đến rồi.", "{{G1}} đã đến.").status, "changed");
  });
  it("câu mới dài bất thường thì giữ bản cũ", () => {
    assert.equal(judgePolished("Ừ.", "Ừ ".repeat(60)).status, "failed");
  });
});

describe("polishAll", () => {
  it("số kết quả khớp số câu, câu đổi nhận bản mới", async () => {
    const run = await polishAll(exclaim, items(5), OPTS);
    assert.equal(run.results.length, 5);
    assert.equal(run.stopped, null);
    assert.deepEqual(
      run.results.map((r) => r.text),
      ["Câu 0!", "Câu 1!", "Câu 2!", "Câu 3!", "Câu 4!"],
    );
    assert.ok(run.results.every((r) => r.status === "changed"));
  });

  it("câu đã sửa tay (edited) không được gửi và không bị đổi", async () => {
    const seen: string[] = [];
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      lines.forEach((l) => seen.push(l.t));
      return JSON.stringify({ t: lines.map((l) => l.t + "!") });
    };
    const list = items(4);
    list[1].edited = true;
    list[1].translation = "Tay sửa";
    const run = await polishAll(call, list, OPTS);
    assert.ok(!seen.includes("Tay sửa"));
    assert.deepEqual(run.results[1], { text: "Tay sửa", status: "locked" });
    assert.equal(run.results[0].text, "Câu 0!");
    assert.equal(run.results[2].text, "Câu 2!");
  });

  it("câu chưa dịch hoặc dịch lỗi bị bỏ qua, không gửi", async () => {
    let count = 0;
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      count += lines.length;
      return JSON.stringify({ t: lines.map((l) => l.t) });
    };
    const list: PolishItem[] = [
      { original: "a", translation: "A" },
      { original: "b", translation: null },
      { original: "c", translation: "", failed: true },
      { original: "d", translation: "D", failed: true },
    ];
    const run = await polishAll(call, list, OPTS);
    assert.equal(count, 1);
    assert.deepEqual(
      run.results.map((r) => r.status),
      ["same", "skipped", "skipped", "skipped"],
    );
  });

  it("chia lô theo batchSize và báo tiến độ", async () => {
    const sizes: number[] = [];
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      sizes.push(lines.length);
      return JSON.stringify({ t: lines.map((l) => l.t) });
    };
    const progress: Array<[number, number]> = [];
    await polishAll(call, items(7), OPTS, { batchSize: 3, onProgress: (d, t) => progress.push([d, t]) });
    assert.deepEqual(sizes, [3, 3, 1]);
    assert.deepEqual(progress, [
      [0, 7],
      [3, 7],
      [6, 7],
      [7, 7],
    ]);
  });

  it("lô sau nhận ngữ cảnh là bản đã trau chuốt của lô trước", async () => {
    const contexts: Array<Array<{ o: string; t: string }>> = [];
    const call: PolishCall = async (messages) => {
      contexts.push(JSON.parse(messages[1].content).context_before);
      return JSON.stringify({ t: sentLines(messages).map((l) => l.t + "!") });
    };
    await polishAll(call, items(4), OPTS, { batchSize: 2 });
    assert.deepEqual(contexts[0], []);
    assert.deepEqual(contexts[1], [
      { o: "src 0", t: "Câu 0!" },
      { o: "src 1", t: "Câu 1!" },
    ]);
  });

  it("model trả thiếu câu thì chia đôi gọi lại, không mất câu nào", async () => {
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      if (lines.length > 2) return JSON.stringify({ t: lines.slice(1).map((l) => l.t) });
      return JSON.stringify({ t: lines.map((l) => l.t + "!") });
    };
    const run = await polishAll(call, items(6), OPTS, { batchSize: 6 });
    assert.ok(run.results.every((r) => r.status === "changed"));
    assert.equal(run.results.length, 6);
  });

  it("một câu bị từ chối: chỉ câu đó refused, giữ bản cũ, các câu khác vẫn trau chuốt", async () => {
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      if (lines.some((l) => l.t === "Câu 2")) throw new PolishRefusal();
      return JSON.stringify({ t: lines.map((l) => l.t + "!") });
    };
    const run = await polishAll(call, items(5), OPTS, { batchSize: 5 });
    assert.deepEqual(
      run.results.map((r) => r.status),
      ["changed", "changed", "refused", "changed", "changed"],
    );
    assert.equal(run.results[2].text, "Câu 2");
    assert.ok(run.results[2].note);
    assert.equal(polishSummary(run.results).refused, 1);
  });

  it("model trả lời từ chối bằng chữ thường (không JSON) cũng được cô lập", async () => {
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      if (lines.some((l) => l.t === "Câu 1")) return "I'm sorry, but I can't help with that.";
      return JSON.stringify({ t: lines.map((l) => l.t + "!") });
    };
    const run = await polishAll(call, items(3), OPTS, { batchSize: 3 });
    assert.deepEqual(
      run.results.map((r) => r.status),
      ["changed", "refused", "changed"],
    );
  });

  it("một lô lỗi mạng không làm mất cả phim", async () => {
    const call: PolishCall = async (messages) => {
      const lines = sentLines(messages);
      if (lines.some((l) => l.t === "Câu 2")) throw new Error("Trau chuốt bản dịch: máy chủ không trả lời.");
      return JSON.stringify({ t: lines.map((l) => l.t + "!") });
    };
    const run = await polishAll(call, items(6), OPTS, { batchSize: 2 });
    assert.equal(run.stopped, null);
    assert.deepEqual(
      run.results.map((r) => r.status),
      ["changed", "changed", "failed", "failed", "changed", "changed"],
    );
    assert.equal(run.results[2].text, "Câu 2");
    assert.match(run.results[2].note || "", /máy chủ không trả lời/);
  });

  it("lỗi nặng (hết hạn mức) dừng chạy, phần đã xong được giữ, phần chưa chạy là failed", async () => {
    let calls = 0;
    const call: PolishCall = async (messages) => {
      calls++;
      if (calls === 2) throw new Error("Hết hạn mức Groq, cần chờ khoảng 5 phút.");
      return JSON.stringify({ t: sentLines(messages).map((l) => l.t + "!") });
    };
    const run = await polishAll(call, items(6), OPTS, { batchSize: 2 });
    assert.ok(run.stopped && /hạn mức/.test(run.stopped));
    assert.equal(calls, 2);
    assert.deepEqual(
      run.results.map((r) => r.status),
      ["changed", "changed", "failed", "failed", "failed", "failed"],
    );
    assert.equal(run.results[0].text, "Câu 0!");
    assert.equal(run.results[5].text, "Câu 5");
  });

  it("ba lô lỗi liên tiếp thì dừng, không đốt thêm lượt gọi", async () => {
    let calls = 0;
    const call: PolishCall = async () => {
      calls++;
      throw new Error("Trau chuốt bản dịch: lỗi kết nối mạng.");
    };
    const run = await polishAll(call, items(10), OPTS, { batchSize: 2 });
    assert.equal(calls, 3);
    assert.ok(run.stopped);
    assert.ok(run.results.every((r) => r.status === "failed"));
  });

  it("câu model làm mất ký hiệu thuật ngữ bị giữ bản cũ, câu khác vẫn đổi", async () => {
    const call: PolishCall = async (messages) =>
      JSON.stringify({ t: sentLines(messages).map((l) => (l.t.includes("{{G3}}") ? "Hắn đây." : l.t + "!")) });
    const run = await polishAll(
      call,
      [
        { original: "a", translation: "Chào" },
        { original: "b", translation: "{{G3}} đây." },
      ],
      OPTS,
    );
    assert.deepEqual(run.results.map((r) => r.status), ["changed", "failed"]);
    assert.equal(run.results[1].text, "{{G3}} đây.");
  });

  it("hủy giữa chừng ném AbortError", async () => {
    const ctl = new AbortController();
    const call: PolishCall = async (messages) => {
      ctl.abort();
      return JSON.stringify({ t: sentLines(messages).map((l) => l.t) });
    };
    await assert.rejects(polishAll(call, items(6), OPTS, { batchSize: 2, signal: ctl.signal }), { name: "AbortError" });
  });

  it("danh sách rỗng không gọi model", async () => {
    let calls = 0;
    const run = await polishAll(async () => (calls++, "{}"), [], OPTS);
    assert.equal(calls, 0);
    assert.deepEqual(run.results, []);
  });
});

it("R7-001: không nhận câu trau chuốt đổi số hoặc bỏ phủ định", () => {
  assert.equal(judgePolished("Tôi không nợ 12 đô.", "Tôi nợ 12 đô.").status, "failed");
  assert.equal(judgePolished("Tôi nợ 12 đô.", "Tôi nợ 120 đô.").status, "failed");
  assert.equal(judgePolished("Alice không tới.", "Bob không tới.").status, "failed");
});
