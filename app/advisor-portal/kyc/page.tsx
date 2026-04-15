import type { Metadata } from "next";
import Link from "next/link";
import AdvisorKycClient from "./AdvisorKycClient";

export const metadata: Metadata = {
  title: "KYC Documents — Advisor Portal",
  robots: { index: false, follow: false },
};

/**
 * /advisor-portal/kyc — advisor self-serve KYC upload.
 *
 * Advisors land here from the portal's settings tab to upload
 * AFSL certificates, ABN certs, proof of ID and insurance PDFs
 * that compliance reviews via /admin/moderation. The actual
 * auth check happens server-side in /api/advisor-kyc via the
 * `advisor_session` cookie, so this page is intentionally a
 * thin server wrapper around a client component.
 */
export default function AdvisorKycPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/advisor-portal" className="hover:text-slate-900">
            ← Advisor portal
          </Link>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            KYC documents
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-xl">
            Upload the compliance documents we need on file to keep
            your listing active: AFSL certificate, proof of ID, ABN
            certificate and professional indemnity insurance. Files
            are reviewed within one business day.
          </p>
        </div>

        <AdvisorKycClient />
      </div>
    </div>
  );
}
