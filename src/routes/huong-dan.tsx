import { createFileRoute } from "@tanstack/react-router";
import { EntryGate } from "@/components/entry-gate";
import { GuidePage } from "@/components/guide-page";

export const Route = createFileRoute("/huong-dan")({ component: HuongDanPage });

function HuongDanPage() {
  return (
    <EntryGate>
      <GuidePage />
    </EntryGate>
  );
}
