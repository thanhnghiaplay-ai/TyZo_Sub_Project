import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { GROUP_LABEL, GUIDE_FAQ, guideTopics, matchGuide, UI } from "./guide-topics.ts";
import { ROOM_PLANS, TRIAL_MINUTES } from "./room-plans.ts";
import { isTourId, TOURS } from "./tour-steps.ts";
import { takeTourRequest, requestTour } from "./tour-request.ts";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".gen.ts")) out.push(full);
  }
  return out;
}

/** Mã nguồn giao diện, không tính chính file nội dung hướng dẫn (nó chứa mọi tên). */
const UI_SOURCES = walk(SRC)
  .filter((file) => !file.endsWith(path.join("lib", "guide-topics.ts")))
  .map((file) => readFileSync(file, "utf8"));
const STUDIO = readFileSync(path.join(SRC, "components", "studio.tsx"), "utf8");

function appearsAsLabel(label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [new RegExp(`["'\`]${escaped}["'\`]`), new RegExp(`>\\s*${escaped}\\s*<`), new RegExp(`^\\s*${escaped}\\s*$`, "m")];
  return UI_SOURCES.some((source) => patterns.some((pattern) => pattern.test(source)));
}

const dong = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount) + " đ";

describe("mục hướng dẫn", () => {
  const topics = guideTopics();

  it("mã mục không trùng và đều có nhóm", () => {
    const ids = topics.map((topic) => topic.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const topic of topics) assert.ok(topic.group in GROUP_LABEL, topic.id);
    const faqIds = GUIDE_FAQ.map((faq) => faq.id);
    assert.equal(new Set(faqIds).size, faqIds.length);
  });

  it("mỗi mục có tiêu đề, giới thiệu và ít nhất một bước, không lọt undefined hay NaN", () => {
    for (const topic of topics) {
      assert.ok(topic.title && topic.intro && topic.steps.length > 0, topic.id);
      for (const step of topic.steps) assert.doesNotMatch(step.text, /undefined|NaN|\[object/, topic.id);
    }
    for (const faq of GUIDE_FAQ) assert.doesNotMatch(faq.a, /undefined|NaN|\[object/, faq.id);
  });

  it("giá gói và hạn dùng thử lấy từ hằng số của app", () => {
    const text = topics.find((topic) => topic.id === "nap-tien-goi")!.steps.map((step) => step.text).join(" ");
    for (const plan of ROOM_PLANS) {
      assert.ok(text.includes(`${plan.name} ${dong(plan.price)}`), plan.id);
    }
    assert.ok(text.includes(`${TRIAL_MINUTES} phút`));
  });

  it("liên kết ngoài chỉ là https", () => {
    for (const topic of topics) {
      for (const step of topic.steps) if (step.link) assert.match(step.link.href, /^https:\/\//, topic.id);
    }
  });

  it("đúng một mục có thẻ liên hệ", () => {
    assert.deepEqual(topics.filter((topic) => topic.contact).map((topic) => topic.id), ["ho-tro"]);
  });
});

describe("mục mật khẩu đổi theo việc phòng có gửi thư", () => {
  const stepsOf = (resetOn: boolean | null) => guideTopics({ resetOn }).find((topic) => topic.id === "mat-khau")!.steps.map((step) => step.text).join("\n");

  it("có thư: hướng dẫn tự đặt lại", () => {
    const text = stepsOf(true);
    assert.match(text, new RegExp(UI.forgot));
    assert.doesNotMatch(text, /chưa gửi thư/);
  });

  it("chưa có thư: nói thẳng là chưa tự đặt lại được và chỉ sang hỗ trợ", () => {
    const text = stepsOf(false);
    assert.match(text, /chưa gửi thư/);
    assert.match(text, /liên hệ hỗ trợ/);
  });

  it("chưa biết: nêu cả hai khả năng", () => {
    const text = stepsOf(null);
    assert.match(text, new RegExp(UI.forgot));
    assert.match(text, /liên hệ hỗ trợ/);
  });

  it("đổi mật khẩu khi còn nhớ luôn có", () => {
    for (const state of [true, false, null]) assert.match(stepsOf(state), new RegExp(UI.changePassword));
  });
});

describe("tìm trong hướng dẫn", () => {
  const topics = guideTopics();

  it("không gõ gì thì trả hết", () => {
    const all = matchGuide("", topics);
    assert.equal(all.topics.length, topics.length);
    assert.equal(all.faqs.length, GUIDE_FAQ.length);
  });

  it("gõ không dấu vẫn tìm đúng", () => {
    assert.ok(matchGuide("nap tien", topics).topics.some((topic) => topic.id === "nap-tien-goi"));
    assert.ok(matchGuide("quen mat khau", topics).topics.some((topic) => topic.id === "mat-khau"));
    assert.ok(matchGuide("lay key groq", topics).topics.some((topic) => topic.id === "key-groq"));
  });

  it("nhiều từ thì mục phải có đủ các từ", () => {
    const hit = matchGuide("key groq", topics);
    assert.ok(hit.topics.every((topic) => /key/i.test(JSON.stringify(topic)) && /groq/i.test(JSON.stringify(topic))));
    assert.equal(matchGuide("xyzkhongco", topics).topics.length, 0);
    assert.equal(matchGuide("xyzkhongco", topics).faqs.length, 0);
  });

  it("câu hỏi thường gặp cũng tìm được", () => {
    assert.ok(matchGuide("xuat file", topics).faqs.some((faq) => faq.id === "khong-xuat-duoc"));
  });
});

describe("hướng dẫn không lệch giao diện", () => {
  it("mọi tên nút và tên mục menu nhắc tới còn xuất hiện trong giao diện", () => {
    for (const [key, label] of Object.entries(UI)) {
      assert.ok(appearsAsLabel(label), `UI.${key} = «${label}» không còn thấy trong giao diện. Đổi tên ở app thì sửa UI trong lib/guide-topics.ts.`);
    }
  });

  it("mỗi mục có «Chỉ tôi» trỏ tới một tuyến có thật", () => {
    for (const topic of guideTopics()) if (topic.tour) assert.ok(isTourId(topic.tour), topic.id);
  });

  it("mỗi bước của tuyến trỏ vào chỗ còn có nhãn trong mã giao diện", () => {
    for (const [id, steps] of Object.entries(TOURS)) {
      assert.ok(steps.length > 0, id);
      for (const step of steps) {
        assert.ok(step.title && step.text, `${id}: ${step.sel}`);
        const byAttr = step.sel.match(/^\[data-tour=([\w-]+)\]$/);
        const byTab = step.sel.match(/^#tool-tab-([\w-]+)$/);
        if (byAttr) {
          const marker = `data-tour="${byAttr[1]}"`;
          assert.ok(UI_SOURCES.some((source) => source.includes(marker)), `${id}: không còn ${marker} trong giao diện`);
        } else if (byTab) {
          assert.ok(STUDIO.includes(`["${byTab[1]}",`), `${id}: không còn tab «${byTab[1]}» trong studio.tsx`);
        } else {
          assert.fail(`${id}: bộ chọn «${step.sel}» phải dùng [data-tour=…] hoặc #tool-tab-…`);
        }
      }
    }
  });
});

describe("yêu cầu chạy «Chỉ tôi» giữa các trang", () => {
  function fakeSession() {
    const store = new Map<string, string>();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    };
    return store;
  }

  it("nhớ một lần rồi xóa", () => {
    fakeSession();
    requestTour("quick-start");
    assert.equal(takeTourRequest(), "quick-start");
    assert.equal(takeTourRequest(), null);
  });

  it("giá trị lạ thì bỏ qua", () => {
    const store = fakeSession();
    store.set("tyzo_tour_ask", "khong-co-tuyen-nay");
    assert.equal(takeTourRequest(), null);
    assert.equal(store.has("tyzo_tour_ask"), false);
  });

  it("máy không có sessionStorage thì không ném lỗi", () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = undefined;
    assert.doesNotThrow(() => requestTour("quick-start"));
    assert.equal(takeTourRequest(), null);
  });
});
