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
