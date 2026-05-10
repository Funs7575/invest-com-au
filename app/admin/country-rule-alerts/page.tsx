import AdminShell from "@/components/AdminShell";
import AlertsEditor from "./AlertsEditor";

export const metadata = { title: "Country rule alerts — Admin" };

export default function CountryRuleAlertsAdminPage() {
  return (
    <AdminShell
      title="Country rule alerts"
      subtitle="Edit the regulatory rule-change banners shown on /find-advisor, /advisors, and /foreign-investment for visitors with a saved intent country. Public reads are RLS-gated by `active = true`."
    >
      <AlertsEditor />
    </AdminShell>
  );
}
