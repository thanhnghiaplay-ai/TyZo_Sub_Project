import { createFileRoute } from "@tanstack/react-router";
import { EntryGate } from "@/components/entry-gate";
import { Studio } from "@/components/studio";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <EntryGate>
      <Studio />
    </EntryGate>
  );
}

