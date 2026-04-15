import type { Metadata } from "next";
import Link from "next/link";
import DataRightsForm from "./DataRightsForm";

export const metadata: Metadata = {
  title: "Your data rights — export or delete your data — Invest.com.au",
  description:
    "Request an export of every piece of personal data we hold for your email, or request permanent erasure. Australian Privacy Act 1988 + GDPR compliant.",
  alternates: { canonical: "/privacy/data-rights" },
  robots: { index: true, follow: true },
};

/**
 * Data rights landing page.
 *
 * Users on the main /privacy page follow a link here to exercise
 * the right to access (data export) and right to erasure
 * (deletion). The form posts to /api/privacy/request which emails
 * a verification link. Clicking that link hits /api/privacy/verify
 * which actually runs the export/erase.
 */
export default function DataRightsPage() {
  return (
    <div className="py-6 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav className="text-xs text-slate-500 mb-4">
          <Link href="/privacy" className="hover:text-slate-900">
            ← Privacy policy
          </Link>
        </nav>

        <h1 className="text-3xl font-extrabold mb-3">Your data rights</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-8 max-w-xl">
          Under the Australian Privacy Act 1988 and GDPR, you can ask
          us for a copy of every piece of personal data we hold linked
          to your email — or request permanent erasure. Both requests
          require email verification: we'll send a one-time link to
          the address below that you need to click to confirm.
        </p>

        <DataRightsForm />

        <div className="mt-10 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
          <h2 className="font-bold text-slate-800 text-sm mb-2">What happens next</h2>
          <ul className="space-y-2 list-disc pl-4">
            <li>
              <strong>Export:</strong> We assemble a JSON bundle of every row
              from every table keyed to your email (quiz submissions,
              enquiries, reviews, stories, applications). The confirmation
              link downloads that bundle directly.
            </li>
            <li>
              <strong>Deletion:</strong> We delete rows where possible
              (quiz leads, email captures, fee alerts) and anonymise rows
              that have operational value (reviews linked to broker pages,
              completed lead dispute records). The confirmation link
              returns a per-table count of rows affected.
            </li>
            <li>
              Verification links expire in 24 hours and can only be used once.
            </li>
            <li>
              We log every request in an internal audit trail required by
              the Privacy Act.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
