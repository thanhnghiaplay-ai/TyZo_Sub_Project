import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("Admin: ô key các nhà sinh từ bảng PROVIDERS", () => {
  const desk = read("./admin-desk.tsx");
  const board = read("./provider-key-board.tsx");
  const run = read("./run-desk-board.tsx");

  it("tab Cấu hình vẽ ô key bằng ProviderKeyBoards, không viết tay từng nhà", () => {
    assert.match(desk, /<ProviderKeyBoards \/>/);
    assert.doesNotMatch(desk, /<ProviderKeyBoard provider=/);
    assert.doesNotMatch(desk, /AlibabaKeyBoard/);
  });
  it("ProviderKeyBoards lặp theo PROVIDER_IDS", () => {
    assert.match(board, /PROVIDER_IDS\.map/);
  });
  it("ô key chung giữ nút Dán của ô Groq cũ", () => {
    assert.match(board, /navigator\.clipboard\.readText/);
  });
  it("bàn trả theo lượt không còn thẻ key Groq riêng", () => {
    assert.doesNotMatch(run, /saveRunKey/);
    assert.doesNotMatch(run, /Key Groq của phòng/);
  });
});

describe("Khách: ô key các nhà ngoài Groq sinh từ bảng PROVIDERS", () => {
  const studio = read("./studio.tsx");
  const pipe = read("./use-pipeline.ts");

  it("studio vẽ ô key bằng vòng lặp PROVIDER_IDS, không còn ô viết tay Alibaba/Deepgram", () => {
    assert.match(studio, /PROVIDER_IDS\.filter\(\(id\) => id !== "groq"\)\.map/);
    assert.doesNotMatch(studio, /id="ali-key"/);
    assert.doesNotMatch(studio, /id="dg-key"/);
    assert.doesNotMatch(studio, /app\.alibabaKey|app\.deepgramKey/);
  });
  it("use-pipeline đọc khóa kho từ PROVIDERS, không chép tên khóa tay", () => {
    assert.doesNotMatch(pipe, /"gali"|"gdg"|"gk"/);
    assert.match(pipe, /PROVIDERS\[id\]\.clientStore/);
  });
});
