import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sameWatchFile } from "./watch-save.ts";

describe("khôi phục bản xem", () => {
  it("khớp đúng tên và kích thước, không nhận file khác", () => {
    const saved = { fileName: "phim.mp4", fileSize: 1000, fileModified: 5 };
    const same = { name: "phim.mp4", size: 1000, lastModified: 5 } as File;
    const other = { name: "phim.mp4", size: 1001, lastModified: 5 } as File;
    assert.equal(sameWatchFile(saved, same), true);
    assert.equal(sameWatchFile(saved, other), false);
  });
});
