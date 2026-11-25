import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EntryGate } from "@/components/entry-gate";
import { LandingPage } from "@/components/landing/landing-page";
import { rememberReferral } from "@/components/landing/remember-referral";
import { Studio } from "@/components/studio";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Khách chưa đăng nhập thấy trang giới thiệu (có nút Đăng nhập và Dùng thử dẫn sang /login).
 * Đang đợi phiên đăng nhập thì giữ cửa vào phòng như cũ (màn mở phòng), nên người đã đăng nhập không thấy trang giới thiệu nháy lên.
 */
function Home() {
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    rememberReferral();
  }, []);
  if (!isPending && !user) return <LandingPage />;
  return (
    <EntryGate>
      <Studio />
    </EntryGate>
  );
}
