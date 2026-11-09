import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { refreshAuthMail } from "@/lib/mail-runtime";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: async ({ request }) => {
        await Promise.race([refreshAuthMail(), new Promise((resolve) => setTimeout(resolve, 1500))]);
        return auth.handler(request);
      },
    },
  },
});
