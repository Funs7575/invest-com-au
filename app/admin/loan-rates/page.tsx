import AdminShell from "@/components/AdminShell";
import LoanRatesEditor from "./LoanRatesEditor";

export const metadata = { title: "Investment Loan Rates — Admin" };

export default function LoanRatesAdminPage() {
  return (
    <AdminShell
      title="Investment Loan Rates"
      subtitle="Add, edit, or remove the investment loan rates shown on /property/finance. Each save is audit-logged. Rate changes ≥0.01 pp are recorded with old/new values."
    >
      <LoanRatesEditor />
    </AdminShell>
  );
}
