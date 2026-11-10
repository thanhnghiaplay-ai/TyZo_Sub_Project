import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { flushAuthLetters, refreshAuthMail } from "@/lib/mail-runtime";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const response = await auth.handler(request);
        await flushAuthLetters();
        return response;
      },
      POST: async ({ request }) => {
        await Promise.race([refreshAuthMail(), new Promise((resolve) => setTimeout(resolve, 4000))]);
        const response = await auth.handler(request);
        await flushAuthLetters();
        return response;
      },
    },
  },
});
