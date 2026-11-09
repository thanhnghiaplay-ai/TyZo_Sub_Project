import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pay/rieng")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleOwnPay } = await import("@/lib/pay-own");
        return handleOwnPay(request);
      },
    },
  },
});
