import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/landing-page";

export const Route = createFileRoute("/gioi-thieu")({
  head: () => ({
    meta: [
      { title: "TyZo Sub · Công cụ phụ đề video bằng AI, Vietsub tự động" },
      {
        name: "description",
        content:
          "TyZo Sub là công cụ SaaS tạo phụ đề video bằng trí tuệ nhân tạo (AI): nhận dạng lời thoại, dịch sang tiếng Việt theo ngữ cảnh, xuất SRT, VTT, TXT và Dịch trực tiếp thời gian thực.",
      },
    ],
  }),
  component: LandingPage,
});
