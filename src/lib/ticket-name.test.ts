import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const room = read("./overview-room.ts");
const admin = read("./admin-room.ts");
const board = read("../components/run-desk-board.tsx");
const desk = read("../components/admin-desk.tsx");

describe("tên tệp trong phiếu", () => {
  it("máy chủ che tên trước khi gửi cho nhân viên", () => {
    assert.match(admin, /fileName: maskFileName\(row\.file_name\)/);
  });
  it("hàm xem tên đầy đủ chỉ cho Chủ và ghi nhật ký mỗi lần, không ghi tên tệp vào nhật ký", () => {
    const start = room.indexOf("export const revealTicketFileName");
    const body = room.slice(start, room.indexOf("export type DoorChange"));
    assert.match(body, /requireRole\(context\.userId, "chu"\)/);
    assert.match(body, /writeAudit\(context\.userId, "xem-ten-tep"/);
    assert.doesNotMatch(body, /writeAudit\([^)]*file_name/);
    assert.ok(body.indexOf("requireRole") < body.indexOf("select user_id, file_name"));
  });
  it("nút hiện tên chỉ hiện cho Chủ", () => {
    assert.match(board, /owner && masked/);
    assert.match(desk, /owner=\{role === "chu"\}/);
    assert.match(desk, /"xem-ten-tep"/);
  });
});
