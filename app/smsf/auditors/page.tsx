import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import SmsfAuditorsClient, {
  type AuditorRow,
} from "./SmsfAuditorsClient";

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
  },
};

async function fetchAuditors(): Promise<AuditorRow[]> {
  try {
    const supabase = createAdminClient();
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
