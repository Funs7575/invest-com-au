import AdminShell from "@/components/AdminShell";
import ReportsEditor from "./ReportsEditor";

export const metadata = { title: "Pro research reports — Admin" };

export default function ProResearchAdminPage() {
  return (
    <AdminShell
      title="Pro research reports"
      subtitle="Author, edit and publish the premium research reports behind /pro/research. New reports start as drafts; publishing makes them visible to Pro subscribers and includes them in the next weekly premium digest."
    >
      <ReportsEditor />
    </AdminShell>
  );
}
