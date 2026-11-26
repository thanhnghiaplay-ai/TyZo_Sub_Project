/** Alibaba: nhận dạng cả tệp qua link (Filetrans). Dịch Alibaba đi chung đường chatCall như Groq. */
import { recognizeFileUrl } from "@/lib/sub/ali-run";
import { segsFromAli } from "@/lib/sub/ali-asr-to-segs";
import type { LinkAsr } from "./types";

export const alibabaAsr: LinkAsr = {
  id: "alibaba",
  intake: "link",
  turnOnly: false,
  async recognize(input) {
    const result = await recognizeFileUrl(input);
    return segsFromAli(result.sentences);
  },
};
