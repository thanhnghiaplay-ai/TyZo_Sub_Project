import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pay/casso")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCasso } = await import("@/lib/pay-store");
        return handleCasso(request);
      },
    },
  },
});
