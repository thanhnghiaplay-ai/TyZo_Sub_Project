import assert from "node:assert/strict";
import { mock, test } from "node:test";

const removed: string[] = [];
let failure: Error | null = null;
let deleteFails = false;
mock.module("../r2-upload.ts", { namedExports: {
  r2Upload: async () => ({ key: "synthetic/owned-key", putUrl: "http://fixture.test/put", getUrl: "http://fixture.test/get", contentType: "audio/wav" }),
  r2Remove: async ({ data }: { data: { key: string } }) => { removed.push(data.key); if (deleteFails) throw new Error("synthetic delete failure"); },
} });
mock.module("./r2-put.ts", { namedExports: {
  xhrPutSend: () => async () => ({ status: 200 }),
  putWithRetry: async () => { if (failure) throw failure; },
} });

const { uploadAudioToR2 } = await import("./r2-upload-run.ts");
test("R6-006: server stored PUT but reply lost: cleanup granted key and retain original failure", async () => {
  for (const name of ["Error", "AbortError"]) {
    removed.length = 0;
    failure = Object.assign(new Error("synthetic PUT reply lost"), { name });
    await assert.rejects(uploadAudioToR2(new Blob(["synthetic"])), (error) => error === failure);
    assert.deepEqual(removed, ["synthetic/owned-key"]);
  }
});
test("R6-006: cleanup failure never masks upload failure; successful PUT is retained", async () => {
  removed.length = 0; deleteFails = true; failure = new Error("original");
  await assert.rejects(uploadAudioToR2(new Blob(["synthetic"])), (error) => error === failure);
  failure = null; deleteFails = false; removed.length = 0;
  assert.deepEqual(await uploadAudioToR2(new Blob(["synthetic"])), { key: "synthetic/owned-key", url: "http://fixture.test/get" });
  assert.deepEqual(removed, []);
});
