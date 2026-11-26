import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { customerVisiblePrice } from "../lib/turn-pack.ts";
import { studioSource } from "./studio-source.ts";

const studio = studioSource();
const steps = readFileSync(new URL("./steps-bar.tsx", import.meta.url), "utf8");
const pipeline = readFileSync(new URL("./use-pipeline.ts", import.meta.url), "utf8");
const exportStep = readFileSync(new URL("../lib/pipeline/export.ts", import.meta.url), "utf8");

describe("Bước cuối khi lượt đang chờ xem bảng nhân vật", () => {
  it("nút chính là Dịch tiếp, tự đóng tab trên điện thoại đứng rồi cho dịch tiếp", () => {
    assert.match(studio, /step\.last && app\.reviewHold \?/);
    assert.match(studio, /data-step-continue[\s\S]{0,300}onClick=\{continueAfterReview\}[\s\S]{0,60}Dịch tiếp/);
    assert.match(studio, /const continueAfterReview = \(\) => \{\s*if \(isStudioSheet\(\)\) setSheetOpen\(false\);\s*app\.approveBible\(\);/);
    // Nút Dịch tiếp ở đầu trang dùng cùng đường.
    assert.doesNotMatch(studio, /onClick=\{app\.approveBible\}/);
  });

  it("Hủy luôn hỏi lại, không dừng ngay", () => {
    assert.match(studio, /const askStop = async \(\) => \{[\s\S]{0,400}askConfirm\([\s\S]{0,400}if \(ok\) app\.cancel\(\);/);
    assert.match(studio, /if \(app\.running\) void askStop\(\);/);
    assert.match(studio, /data-step-stop[\s\S]{0,200}askStop/);
    assert.doesNotMatch(studio, /if \(app\.running\) app\.cancel\(\);/);
  });

  it("thanh tiến độ ghi đang chờ bạn, không ghi «Đang: Dịch»", () => {
    assert.match(studio, /<StepsBar report=\{app\.stages\}[^>]*waiting=\{app\.reviewHold \?/);
    assert.match(steps, /waiting \?[\s\S]{0,200}Đang chờ bạn/);
  });

  it("câu giá khi đang chạy nói đã giữ, không nói «giữ trước khi chạy»", () => {
    assert.match(customerVisiblePrice(1000, 1500), /Giữ 1\.500 trước khi chạy/);
    const running = customerVisiblePrice(1000, 1500, true);
    assert.doesNotMatch(running, /trước khi chạy/);
    assert.match(running, /đã giữ/);
    assert.match(studio, /<TurnPackList\s+running=\{app\.running\}/);
  });

  it("hộp Làm lại nói đúng Token dịch khi trả theo lượt, không nói chung chung «phí Groq»", () => {
    assert.doesNotMatch(pipeline, /tính phí Groq thêm một lần/);
    assert.match(pipeline, /trừ thêm Token dịch cho cả nhận dạng lẫn dịch/);
  });

  it("đang chạy mà mở Cài đặt dịch thì báo đổi model áp dụng cho lần sau", () => {
    assert.match(studio, /data-model-locked[\s\S]{0,200}áp dụng cho lần dịch lại sau/);
  });
});

describe("v5.31.1: trả theo lượt cho người chỉ mua Token dịch", () => {
  it("không đòi từng thuê phòng; chỉ cần còn Token dịch, máy chủ tự kiểm khi giữ phiếu", () => {
    assert.doesNotMatch(pipeline, /Bản dùng thử không dùng cửa trả theo lượt/);
    assert.match(pipeline, /if \(!\(state\.units > 0\)\) \{\s*say\("Hết Token dịch\./);
    // Kiểm hạn khi xuất phụ đề đã tách sang src/lib/pipeline/export.ts (đợt 2 tách file).
    assert.match(exportStep, /exportNotice\(\{ plan: state\.plan, planUntil: state\.planUntil, trialLeft: state\.trialLeft, units: state\.units \}\)/);
  });

  it("chưa chọn gói thì mở bước cuối có danh sách gói", () => {
    // Kiểm gói đã tách sang src/lib/pipeline/choice.ts (đợt 3 tách file); use-pipeline mở bước chọn gói khi choice báo needPack.
    const choice = readFileSync(new URL("../lib/pipeline/choice.ts", import.meta.url), "utf8");
    assert.match(choice, /if \(packed\) return \{ text: packed, needPack: true \};/);
    assert.match(pipeline, /if \(problem\.needPack\) window\.dispatchEvent\(new Event\("tyzo-need-pack"\)\);/);
    assert.match(studio, /addEventListener\("tyzo-need-pack", onNeedPack\)/);
    assert.match(studio, /const onNeedPack = \(\) => \{[\s\S]{0,120}setToolTab\("run"\);\s*setSheetOpen\(true\);/);
  });
});

describe("v5.31.2: ước tính Token không hiện lúc đang chạy", () => {
  it("studio tính giai đoạn và truyền cho thẻ Token", () => {
    assert.match(studio, /const moneyPhase[^=]*= app\.running \|\| app\.analyzing \? "running"/);
    assert.match(studio, /phase: moneyPhase \}\)/);
    assert.match(studio, /<MoneyCard [^>]*phase=\{moneyPhase\}/);
    const card = readFileSync(new URL("./money-card.tsx", import.meta.url), "utf8");
    assert.match(card, /if \(phase === "running"\) return null;/);
  });
});

describe("v5.32.1: giữ lượt chạy khi điện thoại chuyển ứng dụng hay lỡ tay đóng trang", () => {
  it("giữ màn hình sáng, nhắc giữ trang mở, hỏi lại khi đóng hay tải lại trang lúc đang chạy", () => {
    assert.match(studio, /useWakeLock\(app\.running \|\| app\.analyzing\)/);
    assert.match(studio, /<StepsBar report=\{app\.stages\} keepOpen=\{app\.running\}/);
    assert.match(steps, /keepOpen && !waiting[\s\S]{0,200}Giữ trang này mở đến khi xong/);
    assert.match(studio, /addEventListener\("beforeunload", onLeave\)/);
    assert.match(studio, /Date\.now\(\) - hiddenAt > 20_000/);
  });
});

describe("v5.32.2: lần đầu vào chỉ một lời mời một lúc", () => {
  it("không tự mở hướng dẫn nhanh; mời xem khi không còn câu chọn cách trả hay câu hỏi lần đầu", () => {
    assert.doesNotMatch(studio, /window\.setTimeout\(\(\) => setTourOpen\(true\), 900\)/);
    assert.match(studio, /if \(!tourSeen\(\)\) setTourOffer\(true\);/);
    assert.match(studio, /tourOffer && !tourOpen && pay\.kind !== "choose" && !shouldAsk\(/);
    assert.match(studio, /markSeen\(\); setTourOffer\(false\);/);
  });
});

describe("v5.32.3: lỗi chặn lần bấm hiện ngay dưới nút chính", () => {
  it("hiện đỏ dưới nút đến khi khách đổi tệp, link hay cách trả", () => {
    const hero = readFileSync(new URL("./home-hero.tsx", import.meta.url), "utf8");
    assert.match(hero, /problem \? \([\s\S]{0,120}role="alert"[\s\S]{0,120}data-home-problem/);
    assert.match(studio, /problem=\{app\.isError && !app\.running && app\.status !== quietStatus \? app\.status : ""\}/);
    assert.match(studio, /setQuietStatus\(lastStatus\.current\);\s*\}, \[pickedFile, app\.url, pay\.kind\]\);/);
  });
});

describe("v5.32.4: trang chủ trả theo lượt cho thấy gói đang dùng", () => {
  it("dòng gói: tên gói, số cần giữ cho video này, Đổi gói / Chọn gói mở bước cuối", () => {
    const bar = readFileSync(new URL("./pay-status-bar.tsx", import.meta.url), "utf8");
    assert.match(bar, /data-pay-pack/);
    assert.match(bar, /Gói: <strong>\{money\.pack\.name\}<\/strong>/);
    assert.match(bar, /\{money\.pack \? "Đổi gói" : "Chọn gói"\}/);
    assert.match(studio, /onPickPack=\{\(\) => window\.dispatchEvent\(new Event\("tyzo-need-pack"\)\)\}/);
    const card = readFileSync(new URL("./money-card.tsx", import.meta.url), "utf8");
    assert.match(card, /pack: chosen \? \{ id: chosen\.id, name: chosen\.name \} : null, packCount: packs\.length/);
  });
});
