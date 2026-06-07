import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
import SmsfAuditorsClient, {
  type AuditorRow,
} from "./SmsfAuditorsClient";

const SMSF_AUDITOR_FAQS = [
  {
    q: "Is an SMSF audit mandatory every year?",
    a: "Yes. Under the Superannuation Industry (Supervision) Act 1993, every SMSF must be audited annually by an ASIC-approved SMSF auditor before the trustees lodge the SMSF Annual Return. Failure to have the fund audited is a compliance breach that can lead to ATO penalties and, in serious cases, fund disqualification.",
  },
  {
    q: "Can my accountant audit my SMSF?",
    a: "No. ASIC and ATO rules require that the auditor be independent of the person who prepared the financial statements. If your accountant prepares the SMSF's annual accounts, they cannot also perform the audit. The auditor must not be an associate of the trustee and must hold a valid SMSF Auditor Number (SAN).",
  },
  {
    q: "What is an SMSF Auditor Number (SAN)?",
    a: "An SMSF Auditor Number is a unique registration number issued by ASIC to individuals approved to conduct SMSF audits. Auditors must pass a competency exam, hold relevant qualifications, meet continuing professional development requirements, and maintain professional indemnity insurance. Trustees should verify their auditor's SAN on the ASIC SMSF Auditor Register before engaging them.",
  },
  {
    q: "How much does an SMSF audit cost in Australia?",
    a: "Fees vary by auditor and fund complexity, but most straightforward SMSF audits cost between $300 and $900. Funds with property, collectables, limited-recourse borrowing arrangements (LRBAs), or a corporate trustee structure typically attract higher fees of $900–$1,500 or more. The audit fee is a deductible expense for the fund.",
  },
];
const smsfAuditorFaqLd = faqJsonLd(SMSF_AUDITOR_FAQS);

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Find an ASIC-Approved SMSF Auditor in Australia (${CURRENT_YEAR})`,
  description:
    "Compare ASIC-approved SMSF auditors across Australia. Every SMSF must be audited annually by an independent approved auditor with an SMSF Auditor Number (SAN). Filter by state and fee range.",
  alternates: { canonical: `${SITE_URL}/smsf/auditors` },
  openGraph: {
    title: `Find an SMSF Auditor — ASIC-Approved (${CURRENT_YEAR})`,
    description:
      "Browse ASIC-approved SMSF auditors across Australia. Filter by state and fee range.",
    url: `${SITE_URL}/smsf/auditors`,
    images: [{ url: `/api/og?title=${encodeURIComponent("SMSF Auditors Australia")}&sub=${encodeURIComponent("Find an Auditor · Fees · ATO Requirements · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

async function fetchAuditors(): Promise<AuditorRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("professionals")
      .select(
        "id, slug, name, firm_name, location_state, location_display, bio, fee_structure, fee_description, verified, rating, review_count, hourly_rate_cents, flat_fee_cents, specialties, registration_number",
      )
      .eq("type", "smsf_auditor")
      .eq("status", "active")
      .order("verified", { ascending: false })
      .order("rating", { ascending: false });
    return (data as AuditorRow[] | null) || [];
  } catch {
    return [];
  }
}

export default async function SmsfAuditorsPage() {
  const auditors = await fetchAuditors();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: `${SITE_URL}/smsf` },
    { name: "SMSF Auditors" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {smsfAuditorFaqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(smsfAuditorFaqLd) }} />}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-12">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">
                SMSF
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">SMSF Auditors</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3 max-w-3xl">
              Find an ASIC-Approved SMSF Auditor
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl">
              Every Australian SMSF must be audited annually by an independent
              ASIC-approved SMSF auditor. Auditors hold a unique SMSF Auditor
              Number (SAN) issued by ASIC. Compare auditors by state, fees,
              and specialty below.
            </p>
            <p className="text-xs text-slate-400 mt-3 max-w-2xl">
              Auditor independence is mandatory — your accountant preparing
              financial statements cannot also audit your fund.
            </p>
          </div>
        </section>

        <SmsfAuditorsClient auditors={auditors} />

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {SMSF_AUDITOR_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General information only.</strong> This directory lists
              ASIC-approved SMSF auditors who have applied to be listed on
              invest.com.au. Always verify the auditor&rsquo;s current
              SAN on the{" "}
              <a
                href="https://asic.gov.au/for-finance-professionals/approved-smsf-auditors/"
                className="text-amber-600 hover:underline"
                target="_blank"
                rel="noreferrer noopener"
              >
                ASIC SMSF Auditor Register
              </a>{" "}
              before engaging. Fees are indicative and subject to the auditor&rsquo;s quote.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
