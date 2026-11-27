import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole } from "./admin-room";

export const getChatReviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input?: { after?: string }) => input)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("../db");
    const { listChatReviews, readChatReviewCursor } =
      await import("../billing/chat-reconciliation");
    return listChatReviews(await getSql(), context.userId, readChatReviewCursor(data?.after));
  });

export const saveChatReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; usd: string; evidence: string }) => input)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("../db");
    const { reviewChatObligation, readChatReview } = await import("../billing/chat-reconciliation");
    return reviewChatObligation(await getSql(), context.userId, readChatReview(data));
  });
