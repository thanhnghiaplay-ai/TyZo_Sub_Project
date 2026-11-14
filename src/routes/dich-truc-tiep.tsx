import { createFileRoute } from "@tanstack/react-router";
import { EntryGate } from "@/components/entry-gate";
import { LiveScreen } from "@/components/live-screen";

export const Route = createFileRoute("/dich-truc-tiep")({ component: LivePage });

function LivePage() {
  return (
    <EntryGate>
      <LiveScreen />
    </EntryGate>
  );
}
