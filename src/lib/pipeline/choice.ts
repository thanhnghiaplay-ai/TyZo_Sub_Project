/**
 * LỰA CHỌN CỦA KHÁCH TRƯỚC KHI CHẠY, gom một chỗ: cách trả (Trả theo lượt hay Thuê phòng bằng key của khách),
 * model nhận dạng (nhà + luồng Nhanh/Kỹ nằm trong mã model), model dịch (chọn tay hay Tự động), nguồn (tệp hay link).
 *
 * `choiceProblem` kiểm theo đúng thứ tự cũ và trả câu báo cho khách (null = được chạy). Chưa giữ tiền, chưa tốn lượt thử.
 * Các bước cần hỏi khách (xác nhận quyền nội dung) hoặc kiểm key Groq bằng mạng vẫn nằm ở use-pipeline.ts.
 */
import { LINK_WARN, videoLinkBroken } from "@/lib/link-check";
import { getServiceMenu } from "@/lib/pack-room";
import { asrRunnerOf, type AsrRunner } from "@/lib/providers";
import { r2Status } from "@/lib/r2-upload";
import { getRentShow, rentUseProblem } from "@/lib/rent-show";
import { defaultServiceStatus, serviceBlock } from "@/lib/service-status";
import { getServiceStatus } from "@/lib/service-status-room";
import { asrHouse } from "@/lib/sub/asr-house";
import { chatCall, type ChatKey } from "@/lib/sub/groq";
import { PROVIDERS, providersWith, type ProviderId } from "@/lib/sub/provider";
import type { AsrModel, ModelMode } from "@/lib/sub/types";
import { turnPackProblem } from "@/lib/turn-pack";

/** Cửa trả tiền: "turn" = Trả theo lượt (key phòng, trừ Token dịch); "rent" = Thuê phòng (key của khách). */
export type PayDoor = "turn" | "rent";

export type RunChoice = {
  door: PayDoor;
  asrModel: AsrModel;
  chatMode: ModelMode;
  /** Model dịch chọn tay (rỗng khi chưa chọn). */
  chatModel: string;
  /** Link dán vào (đã bỏ khoảng trắng). */
  link: string;
  /** Khách đã chọn tệp trên máy. */
  hasFile: boolean;
  /** Key Groq của khách (Thuê phòng). */
  groqKey: string;
  /** Key của nhà khác do khách nhập (Thuê phòng). */
  houseKey: (id: ProviderId) => string;
  /** Key dịch của khách (Thuê phòng), đọc khi cần. */
  chatKey: () => ChatKey;
  /** Bể model dịch Tự động dùng được (null = không lọc). */
  autoPool: () => { size: number } | null;
};

/** Nhà và cách chạy suy ra từ lựa chọn. */
export type ChoicePlan = {
  asrOwner: ProviderId;
  asrLabel: string;
  asrRunner: AsrRunner;
  /** Nhà nhận link mà khách chọn tệp trên máy: phải đưa tệp lên kho tạm trước. */
  needsUpload: boolean;
};

export function planChoice(choice: Pick<RunChoice, "asrModel" | "link" | "hasFile">): ChoicePlan {
  const asrOwner = asrHouse(choice.asrModel) ?? "groq";
  const asrRunner = asrRunnerOf(choice.asrModel);
  return {
    asrOwner,
    asrLabel: PROVIDERS[asrOwner].label,
    asrRunner,
    needsUpload: asrRunner.intake === "link" && !choice.link && choice.hasFile,
  };
}

export type ChoiceProblem = {
  text: string;
  /** Trả theo lượt mà chưa có gói hợp: mở bước chọn gói. */
  needPack?: boolean;
};

/** Kiểm lựa chọn trước khi chạy. null = được chạy. */
export async function choiceProblem(choice: RunChoice): Promise<ChoiceProblem | null> {
  const { door, asrModel, chatMode, chatModel, link, hasFile } = choice;
  // Nhóm Dịch bình thường đang bảo trì thì không bắt đầu lượt mới, kể cả khi dùng key riêng (khi đó máy chủ không nằm trong đường đi).
  // Không đọc được trạng thái (mất mạng, máy chủ bận) thì không chặn: máy chủ vẫn chặn thật ở chỗ giữ tiền và trừ lượt thử.
  const closed = serviceBlock((await getServiceStatus().catch(() => null)) ?? defaultServiceStatus(), "normal");
  if (closed) return { text: closed };
  if (door === "turn") {
    const menu = await getServiceMenu().catch(() => null);
    const packed = turnPackProblem(menu?.packs ?? [], { asr: asrModel, chat: chatModel });
    if (packed) return { text: packed, needPack: true };
  }
  // Kiểm chung cho MỌI nhà (không nhánh riêng từng nhà): key của nhà nhận dạng, link khi nhà đó nhận link,
  // và key của nhà chạy model dịch (dịch có thể bằng bất kỳ nhà nào có model dịch).
  const plan = planChoice(choice);
  const { asrOwner, asrLabel } = plan;
  if (plan.asrRunner.turnOnly && door !== "turn") return { text: `${asrLabel} dùng ở cửa Trả theo lượt.` };
  if (door === "rent") {
    const asrKey = asrOwner === "groq" ? choice.groqKey : choice.houseKey(asrOwner);
    if (!asrKey) return { text: asrOwner === "groq" ? "Vui lòng nhập Groq API key." : `Nhận dạng ${asrLabel} cần key ${asrLabel} của bạn.` };
  }
  if (plan.asrRunner.intake === "link" && !link && !hasFile) return { text: `${asrLabel} cần link file trực tiếp (http/https) hoặc một tệp trên máy.` };
  if (door === "rent") {
    if (chatMode === "manual" && chatModel) {
      try {
        chatCall(chatModel, choice.chatKey());
      } catch (error) {
        return { text: (error as Error).message };
      }
    } else if (chatMode !== "manual") {
      const pool = choice.autoPool();
      if (pool && pool.size === 0) return { text: `Chưa có key của nhà nào có model dịch. Hãy nhập key ${providersWith("chat").map((id) => PROVIDERS[id].label).join(" hoặc ")}.` };
    }
  }
  if (plan.needsUpload) {
    // Tệp trên máy đi qua kho tạm R2 (âm thanh tách ở máy khách). Chủ chưa cấu hình thì không nhận, báo trước khi giữ tiền.
    const ready = await r2Status().catch(() => null);
    if (!ready?.ready) return { text: "Kho tạm để gửi tệp trên máy tới nhà nhận dạng chưa được bật. Hãy dán link file trực tiếp hoặc chọn nhận dạng Whisper." };
  }
  if (door === "rent") {
    const opened = await getRentShow().catch(() => null);
    const blocked = rentUseProblem(opened, { asr: asrModel, chat: chatModel });
    if (blocked) return { text: blocked };
  }
  if (chatMode === "manual" && !chatModel) return { text: "Vui lòng chọn model dịch." };
  if (!hasFile && !link) return { text: "Vui lòng chọn file video/âm thanh hoặc dán link trực tiếp." };
  if (!hasFile && videoLinkBroken(link)) return { text: LINK_WARN };
  return null;
}
