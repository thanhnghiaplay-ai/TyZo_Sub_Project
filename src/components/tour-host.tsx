import { useEffect, useRef, useState } from "react";

import { GuidedTour } from "@/components/guided-tour";
import { takeTourRequest } from "@/lib/tour-request";
import { type TourId, type TourPage } from "@/lib/tour-steps";

/**
 * Gắn vào một trang để trang đó chạy tuyến «Chỉ tôi» do trang Hướng dẫn yêu cầu.
 * Chỉ nhận tuyến thuộc đúng trang này (`TOUR_PAGE`), tuyến của trang khác thì để yên.
 */
export function TourHost({ page }: { page: TourPage }) {
  const [tour, setTour] = useState<TourId | null>(null);
  const [open, setOpen] = useState(false);
  // Đọc một lần, giữ trong ref để chạy lại hiệu ứng (StrictMode) không làm mất.
  const asked = useRef<TourId | null | undefined>(undefined);
  useEffect(() => {
    if (asked.current === undefined) asked.current = takeTourRequest(page);
    if (!asked.current) return;
    setTour(asked.current);
    const timer = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [page]);
  return tour ? <GuidedTour open={open} tour={tour} onClose={() => setOpen(false)} /> : null;
}
