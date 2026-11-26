import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";

export const callTyzoModal = createServerFn({method:"POST"}).middleware([authMiddleware])
  .validator((input: {ticket:string; audio:string; language:string; profile:"nhanh"|"ky"}) => {
    if (!/^[a-f0-9]{24}$/.test(input.ticket) || typeof input.audio !== "string" || !input.audio.length || input.audio.length > 24_000_000 ||
      !["nhanh","ky"].includes(input.profile) || !["","zh","ja","ko","en"].includes(input.language)) throw new Error("Đoạn âm thanh hoặc phiếu Modal không hợp lệ.");
    return input;
  }).handler(async ({context,data}) => {
    const {getSql} = await import("./db");
    const {requireOpenAccount,takeRate} = await import("./guard.server");
    const {parseModalPrice, holdUsdPerFilmHour} = await import("./sub/tyzo-modal-price");
    const {recognizeModalWav, isTransientModalError} = await import("./sub/tyzo-modal.server");
    const {mergeInterjections} = await import("./sub/merge-interjections");
    const {loadPriceBook} = await import("./run-board.server");
    const {giayForBaseCost} = await import("./token-math");
    await requireOpenAccount(context.userId);
    await takeRate("tyzo-modal:"+context.userId,120,60);
    const wav = Buffer.from(data.audio,"base64");
    if (wav.length <= 44 || wav.toString("ascii",0,4)!=="RIFF" || wav.toString("ascii",8,12)!=="WAVE" ||
      wav.toString("ascii",12,16)!=="fmt " || wav.readUInt16LE(20)!==1 || wav.readUInt16LE(22)!==1 ||
      wav.readUInt32LE(24)!==16000 || wav.readUInt16LE(34)!==16 || wav.toString("ascii",36,40)!=="data" ||
      wav.readUInt32LE(40)!==wav.length-44) throw new Error("Cần âm thanh WAV mono 16 kHz.");
    const seconds = (wav.length-44)/32000;
    const sql = await getSql();
    const book = await loadPriceBook(sql);
    if (!book || !giayForBaseCost(book,1)) throw new Error("Chưa có tỷ giá Token dịch.");
    const model = "tyzo-modal-"+data.profile;
    const {createHash} = await import("node:crypto");
    const {runModalPartWith} = await import("./tyzo-modal-charge");
    const toTokens = (usd:number) => {
      const n = giayForBaseCost(book, usd*book.rate);
      if (n === null) throw new Error("Thiếu tỷ giá Token dịch.");
      return n;
    };
    const result = await runModalPartWith(sql, {
      ticket: data.ticket, userId: context.userId, model, seconds,
      partHash: createHash("sha256").update(wav).digest("hex"),
      // Ước tính đoạn này theo giá chụp trên phiếu (giờ phim × giá GPU × hệ số bù × tỉ lệ giữ); phải còn giữ đủ mới gọi GPU.
      estimateTokens: price => toTokens(holdUsdPerFilmHour(parseModalPrice(JSON.parse(price)), data.profile)*seconds/3600),
    }, async price => {
      // Không gắn với kết nối của trình duyệt: khách bấm hủy hay mất mạng thì đoạn đã gửi vẫn chạy xong, được tính và lưu lại;
      // gửi lại cùng đoạn sẽ nhận kết quả đã lưu, không trừ lần hai. Lỗi tạm (mạng, HTTP 5xx) thử lại một lần.
      const run = () => recognizeModalWav(wav,data.language,data.profile,0,new AbortController().signal,parseModalPrice(JSON.parse(price)));
      let out;
      try { out = await run(); }
      catch (error) {
        if (!isTransientModalError(error)) throw error;
        await new Promise(r => setTimeout(r, 3000));
        out = await run();
      }
      const merged = mergeInterjections(out.segments.map(s=>({text:s.original,start:s.start,end:s.end})), data.language);
      return {segments: merged, tokens: toTokens(out.usd)};
    });
    return {segments: result.segments};
  });
