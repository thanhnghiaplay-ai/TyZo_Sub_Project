import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pay/sepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleSepay } = await import("@/lib/pay-store");
        return handleSepay(request);
      },
    },
  },
});
