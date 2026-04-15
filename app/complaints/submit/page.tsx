import type { Metadata } from "next";
import Link from "next/link";
import ComplianceFooter from "@/components/ComplianceFooter";
import ComplaintsIntakeForm from "./ComplaintsIntakeForm";

export const metadata: Metadata = {
  title: "Submit a complaint — invest.com.au",
  description:
    "Lodge a complaint about Invest.com.au. We respond within 30 calendar days under ASIC RG 271.",
  alternates: { canonical: "/complaints/submit" },
  robots: { index: true, follow: true },
};

/**
 * ASIC RG 271 Internal Dispute Resolution intake form.
 *
 * The legal explainer lives at /complaints. This page is the
 * action surface — a real form that drops a row into
 * complaints_register and fires the acknowledgement email.
 */
export default function ComplaintsSubmitPage() {
  return (
    <div className="py-6 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav className="text-xs text-slate-500 mb-4">
          <Link href="/complaints" className="hover:text-slate-900">
            ← Complaints &amp; dispute resolution
          </Link>
        </nav>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
          Submit a complaint
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xl mb-6">
          Use this form to lodge a complaint about Invest.com.au.
          You&apos;ll receive an acknowledgement email with a
          reference number within minutes, and a full response
          within 30 calendar days (ASIC RG 271).
        </p>

        <ComplaintsIntakeForm />

        <ComplianceFooter />
      </div>
    </div>
  );
}
