import { AUDIO_IN_TOKENS_PER_SEC } from "./live-price.ts";

/**
 * Sổ giữ tiền theo từng khoảng ngắn của một phiên dịch trực tiếp.
 * Giữ trước một khoảng; còn ít thì xin giữ khoảng tiếp; hết tiền thì dừng nhẹ; kết thúc thì nhả phần dư.
 * Hàm thuần, không đụng cơ sở dữ liệu: phần trừ và nhả tiền thật do lớp tính tiền làm.
 */
export class LiveMeter {
  /** Tiền còn đang giữ, đồng. */
  heldLeft = 0;
  /** Giây âm thanh đã gửi đi mà Alibaba chưa báo token. */
  pendingSeconds = 0;
  /** Xin giữ thêm đã bị từ chối vì hết tiền hoặc quá hạn mức. */
  denied = false;
  private readonly blockHold: number;
  private readonly perSecond: number;
  private readonly lowWater: number;

  /**
   * @param blockHold số đồng giữ cho mỗi khoảng
   * @param blockSeconds độ dài mỗi khoảng, giây
   */
  constructor(blockHold: number, blockSeconds: number, lowWater = 0.4) {
    this.blockHold = blockHold;
    this.lowWater = lowWater;
    this.perSecond = blockSeconds > 0 ? blockHold / blockSeconds : blockHold;
  }

  grant(amount: number) {
    this.heldLeft += Math.max(0, amount);
  }

  audio(seconds: number) {
    this.pendingSeconds += Math.max(0, seconds);
  }

  /** Alibaba báo token thật: trừ phần đã trừ vào phiếu và coi như đã bao âm thanh tương ứng. */
  settle(taken: number, audioInTokens: number) {
    this.heldLeft = Math.max(0, this.heldLeft - Math.max(0, taken));
    this.pendingSeconds = Math.max(0, this.pendingSeconds - audioInTokens / AUDIO_IN_TOKENS_PER_SEC);
  }

  /** Tiền giữ còn lại sau khi trừ phần âm thanh đang chạy chưa tính. */
  exposure(): number {
    return this.heldLeft - this.pendingSeconds * this.perSecond;
  }

  wantsMore(): boolean {
    return !this.denied && this.exposure() < this.blockHold * this.lowWater;
  }

  /** Hết tiền giữ mà không xin thêm được: phải dừng nhẹ. */
  mustStop(): boolean {
    return this.denied && this.exposure() <= 0;
  }

  /** Còn tiền nhưng ít, để báo cho khách sắp hết. */
  low(): boolean {
    return this.denied && this.exposure() < this.blockHold * this.lowWater;
  }
}
