import AdminShell from "@/components/AdminShell";
import PlacementExperimentsEditor from "./PlacementExperimentsEditor";

export const metadata = { title: "Placement experiments — Admin" };

export default function PlacementExperimentsAdminPage() {
  return (
    <AdminShell
      title="Placement experiments"
      subtitle="A/B test which broker sits at position 1 on /best/<slug> pages. CTR + conversion counters update live via /api/placement-experiment/event."
    >
      <PlacementExperimentsEditor />
    </AdminShell>
  );
}
