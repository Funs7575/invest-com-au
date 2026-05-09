import AdminShell from "@/components/AdminShell";
import SchemesEditor from "./SchemesEditor";

export const metadata = { title: "Country schemes & grants — Admin" };

export default function CountrySchemesAdminPage() {
  return (
    <AdminShell
      title="Country schemes & grants"
      subtitle="Add, edit, or retire the cross-border programmes shown on /foreign-investment/<country>. Public reads are RLS-gated by `active = true`."
    >
      <SchemesEditor />
    </AdminShell>
  );
}
