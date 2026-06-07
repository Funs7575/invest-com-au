import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { getVerifiedOrganisations, ORG_TYPE_LABELS } from "@/lib/organisations";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "CPD Providers & Training Companies Australia | Invest.com.au",
  description:
    "Browse accredited CPD providers, training companies, and compliance firms for Australian financial advisors, tax agents and mortgage brokers.",
  alternates: { canonical: "/providers" },
  openGraph: {
    title: "CPD Providers & Training Companies Australia",
    description:
      "Browse accredited CPD providers and training companies for Australian financial professionals.",
    url: "/providers",
    images: [{ url: `/api/og?title=${encodeURIComponent("CPD Providers & Training Australia")}&sub=${encodeURIComponent("Accredited · Advisors · Tax Agents · Mortgage Brokers")}`, width: 1200, height: 630 }],
  },
};

const FILTER_TYPES = [
  { value: "", label: "All Providers" },
  { value: "cpd_provider", label: "CPD Providers" },
  { value: "training_provider", label: "Training Providers" },
  { value: "compliance", label: "Compliance" },
  { value: "industry_body", label: "Industry Bodies" },
];

function OrgCard({ org }: { org: Awaited<ReturnType<typeof getVerifiedOrganisations>>[number] }) {
  const typeLabel = ORG_TYPE_LABELS[org.organisation_type] ?? org.organisation_type;
  return (
    <Link
      href={`/providers/${org.slug}`}
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-teal-200 transition-all flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        {org.logo_url ? (
          <Image
            src={org.logo_url}
            alt={org.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-contain border border-slate-100 flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-xl font-bold text-teal-600 flex-shrink-0">
            {org.name[0]}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 leading-tight truncate">{org.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {typeLabel}
            </span>
            {org.cpd_provider_number && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                ✓ Verified CPD Provider
              </span>
            )}
          </div>
        </div>
      </div>
      {org.bio && (
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{org.bio}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-1">
        {org.location_state ? (
          <span className="text-xs text-slate-400">{org.location_state}</span>
        ) : (
          <span />
        )}
        <span className="text-xs text-teal-600 font-medium">View profile →</span>
      </div>
    </Link>
  );
}

export default async function ProvidersPage() {
  const orgs = await getVerifiedOrganisations();

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Providers", url: absoluteUrl("/providers") },
  ]);

  const faqLd = faqJsonLd([
    { q: "What is a CPD provider in Australia?", a: "A CPD (Continuing Professional Development) provider is an organisation accredited to deliver training that counts toward the mandatory 40-hour annual CPD requirement for Australian financial advisors, planners, and tax agents under ASIC and TPB rules. Providers are verified against ASIC or TPB accreditation before listing." },
    { q: "How many CPD hours do financial advisors need in Australia?", a: "Australian financial advisors must complete 40 hours of CPD per year under FASEA rules (now administered by ASIC). At least 70% must be in approved CPD categories (technical competence, client care, regulatory compliance, professionalism and ethics). Tax agents must complete 90 hours over 3 years under TPB requirements." },
    { q: "Are CPD courses tax-deductible for advisors?", a: "Yes — CPD costs directly related to maintaining your professional licence or skills are generally deductible under s8-1 of the ITAA 1997. This includes course fees, travel to attend training, and study materials. You cannot claim deductions for CPD to gain a new qualification in a different field. Consult your tax agent for your specific circumstances." },
    { q: "How do I verify a CPD provider is legitimate?", a: "For financial advice CPD, check the provider is listed on the ASIC Financial Advisers Register or holds direct ASIC accreditation. For tax agent CPD, verify the provider is registered with the Tax Practitioners Board (TPB). All providers on this directory have been checked for current accreditation status." },
    { q: "Can I complete CPD online in Australia?", a: "Yes — ASIC and the TPB both accept online CPD for financial advisors and tax agents. Online courses must still meet the relevant curriculum and assessment standards for accreditation. Many providers on this directory offer self-paced online modules that issue digital CPD certificates on completion." },
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-teal-200 text-sm font-semibold mb-2 uppercase tracking-wider">
            Accredited Providers
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
            CPD Providers &amp; Training Companies
          </h1>
          <p className="text-teal-100 text-lg max-w-xl mx-auto">
            Find accredited CPD providers, training companies and compliance firms
            for Australian financial professionals.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTER_TYPES.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/providers?type=${f.value}` : "/providers"}
              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-colors"
            >
              {f.label}
            </Link>
          ))}
        </div>

        {orgs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏫</div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No providers listed yet</h2>
            <p className="text-slate-500 mb-6">Be the first to list your training courses on Invest.com.au.</p>
            <Link
              href="/for-providers"
              className="inline-flex items-center px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
            >
              List Your Courses
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{orgs.length} verified provider{orgs.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orgs.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-12 bg-teal-50 border border-teal-100 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-teal-800 mb-2">List Your Courses</h2>
          <p className="text-teal-700 text-sm mb-4">
            Training companies, CPD providers and industry bodies can list courses and reach
            30,000+ Australian financial professionals.
          </p>
          <Link
            href="/for-providers"
            className="inline-flex items-center px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors text-sm"
          >
            Learn more →
          </Link>
        </div>
      </div>
    </div>
  );
}
