import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
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

  const smsfAuditorFaqLd = faqJsonLd([
    {
      q: "What is an SMSF auditor and do they need to be registered?",
      a: "An SMSF auditor is an independent professional who conducts the mandatory annual audit of your fund — checking both the financial statements (audit of accounts) and compliance with superannuation law (compliance audit). All SMSF auditors must be registered with ASIC and hold an SMSF Auditor Number (SAN). You can verify an auditor's registration at ASIC's professional registers. Trustees cannot use a fund member, a member's relative, or anyone closely connected to the fund as auditor — independence is mandatory.",
    },
    {
      q: "How do I find a registered SMSF auditor in Australia?",
      a: "You can find SMSF auditors through: ASIC's SMSF Auditor Register (search by name or registration number); the SMSF Association's member directory; referral from your SMSF administrator or accountant; or platforms like this directory. When selecting an auditor, check their SAN, years of experience, whether they use electronic working papers, their turn-around time, and their fee structure. Cost matters less than reliability — late audits delay your annual return and trigger ATO penalties.",
    },
    {
      q: "What does an SMSF auditor check?",
      a: "The financial audit verifies that financial statements accurately represent the fund's assets and transactions, and that all figures are supported by evidence (bank statements, share registry certificates, property valuations). The compliance audit checks adherence to SIS Act and regulations — including sole purpose test, related-party transactions, in-house asset limits, LRBA compliance, and investment strategy documentation. Auditors issue findings that the trustee must respond to; serious or repeated breaches are reported to the ATO on an Auditor Contravention Report (ACR).",
    },
    {
      q: "Can my accountant also be my SMSF auditor?",
      a: "No. Under SIS Act requirements and ASIC independence guidelines, your SMSF's auditor must be independent from the trustee and anyone who provides other services to the fund — including the fund's accountant or administrator. You need a separate, unrelated, ASIC-registered auditor. Some accounting firms have separate audit divisions, but the individual auditor must not have been involved in preparing the fund's accounts for the year being audited. A 'same firm' audit is only permissible if the auditor had no involvement in the accounts preparation.",
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(smsfAuditorFaqLd) }}
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
