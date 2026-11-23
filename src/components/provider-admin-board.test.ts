import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { studioSource } from "./studio-source.ts";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("Admin: ô key các nhà sinh từ bảng PROVIDERS", () => {
  const desk = read("./admin-desk.tsx");
  const config = read("./admin-config.tsx");
  const board = read("./provider-key-board.tsx");
  const run = read("./run-desk-board.tsx");

  it("tab Cấu hình vẽ ô key bằng ProviderKeyBoards, không viết tay từng nhà", () => {
    assert.match(desk, /<ConfigTab \/>/);
    assert.match(config, /<ProviderKeyBoards \/>/);
    for (const source of [desk, config]) {
      assert.doesNotMatch(source, /<ProviderKeyBoard provider=/);
      assert.doesNotMatch(source, /AlibabaKeyBoard/);
    }
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
  it("không còn hàm lưu giá Alibaba và key Alibaba riêng ở bảng gói", () => {
    const packs = read("../lib/pack-room.ts");
    const service = read("./service-pack-board.tsx");
    assert.doesNotMatch(packs, /saveAlibabaDesk|saveAlibabaKey/);
    assert.doesNotMatch(service, /saveAlibabaDesk|saveAlibabaKey/);
  });
});

describe("Khách: ô key các nhà ngoài Groq sinh từ bảng PROVIDERS", () => {
  const studio = studioSource();
  const pipe = read("./use-pipeline.ts");

  it("ô key của khách sinh từ bảng PROVIDERS (KeyRing), không còn ô viết tay Alibaba/Deepgram", () => {
    const ring = read("./key-ring.tsx");
    assert.match(studio, /<KeyRing/);
    assert.match(ring, /PROVIDER_IDS\.filter/);
    assert.doesNotMatch(ring, /"alibaba"|"deepgram"|"assemblyai"|"speechmatics"|"soniox"/, "không viết tay tên nhà");
    assert.doesNotMatch(studio, /id="ali-key"/);
    assert.doesNotMatch(studio, /id="dg-key"/);
    assert.doesNotMatch(studio, /app\.alibabaKey|app\.deepgramKey/);
  });
  it("use-pipeline đọc khóa kho từ PROVIDERS, không chép tên khóa tay", () => {
    assert.doesNotMatch(pipe, /"gali"|"gdg"|"gk"/);
    assert.match(pipe, /PROVIDERS\[id\]\.clientStore/);
  });
});
