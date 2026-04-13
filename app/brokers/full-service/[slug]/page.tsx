import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_URL,
} from "@/lib/seo";
import Icon from "@/components/Icon";
import ComplianceFooter from "@/components/ComplianceFooter";
import FullServiceBrokerEnquiryForm from "@/components/full-service-brokers/FullServiceBrokerEnquiryForm";

export const revalidate = 3600;

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("professionals")
    .select("slug")
    .in("type", ["stockbroker_firm", "private_wealth_manager"])
    .eq("status", "active");
  return (data || []).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("professionals")
    .select("name, bio, photo_url")
    .eq("slug", slug)
    .in("type", ["stockbroker_firm", "private_wealth_manager"])
    .maybeSingle();

  if (!data) return { title: "Full-Service Stockbroker" };

  const title = `${data.name} — Full-Service Stockbroker Review (${CURRENT_YEAR})`;
  const description = data.bio?.slice(0, 160) || `Compare ${data.name} fees, minimum investment, specialties and contact options.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/brokers/full-service/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/brokers/full-service/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(data.name)}&subtitle=Full-Service+Stockbroker&type=advisor`,
          width: 1200,
          height: 630,
          alt: data.name,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

const FEE_MODEL_LABELS: Record<string, string> = {
  percent_aum: "Percentage of assets under management (% AUM)",
  commission: "Per-trade commission",
  flat_retainer: "Flat annual retainer",
  hybrid: "Hybrid (combination of fee models)",
};

function formatMinimum(cents?: number): string {
  if (!cents) return "Enquire";
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toLocaleString("en-AU")}`;
  return `$${dollars.toLocaleString("en-AU")}`;
}

export default async function FullServiceBrokerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: firm } = await supabase
    .from("professionals")
    .select("*")
    .eq("slug", slug)
    .in("type", ["stockbroker_firm", "private_wealth_manager"])
    .eq("status", "active")
    .maybeSingle();

  if (!firm) notFound();

  const f = firm as Professional;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Full-Service Stockbrokers", url: absoluteUrl("/brokers/full-service") },
    { name: f.name },
  ]);

  // Organization schema for the firm — gives Google a real entity to anchor
  // search results to. AFSL number doubles as the regulatory identifier.
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: f.name,
    description: f.bio,
    url: absoluteUrl(`/brokers/full-service/${slug}`),
    image: f.photo_url,
    foundingDate: f.year_founded ? String(f.year_founded) : undefined,
    identifier: f.afsl_number ? `AFSL ${f.afsl_number}` : undefined,
    areaServed: f.office_states || ["AU"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/brokers/full-service" className="hover:text-slate-900">
              Full-Service Stockbrokers
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">{f.name}</span>
          </nav>

          {/* Hero */}
          <header className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
            <div className="flex items-start gap-5 mb-5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                {f.photo_url ? (
                  <Image
                    src={f.photo_url}
                    alt={`${f.name} logo`}
                    width={96}
                    height={96}
                    className="w-full h-full object-contain p-2"
                    sizes="96px"
                    priority
                  />
                ) : (
                  <Icon name="briefcase" size={36} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
                  {f.name}
                </h1>
                {f.firm_type && (
                  <p className="text-sm text-slate-500 capitalize mb-2">{f.firm_type}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {f.afsl_number && <span>AFSL {f.afsl_number}</span>}
                  {f.year_founded && <span>Established {f.year_founded}</span>}
                  {f.aum_aud_billions && <span>${f.aum_aud_billions}B AUM</span>}
                  {f.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <Icon name="check-circle" size={12} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {f.bio && (
              <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                {f.bio}
              </p>
            )}
          </header>

          {/* Key facts table */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <h2 className="px-5 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-slate-900 border-b border-slate-100 bg-slate-50">
              At a glance
            </h2>
            <dl className="divide-y divide-slate-100">
              <Row label="Minimum portfolio" value={formatMinimum(f.minimum_investment_cents)} />
              <Row label="Fee model" value={f.fee_model ? FEE_MODEL_LABELS[f.fee_model] : "Enquire"} />
              {f.fee_description && <Row label="Fee details" value={f.fee_description} />}
              {f.specialties && f.specialties.length > 0 && (
                <Row label="Specialties" value={f.specialties.join(" · ")} />
              )}
              {f.office_states && f.office_states.length > 0 && (
                <Row label="Offices" value={f.office_states.join(", ")} />
              )}
              {f.research_offering && (
                <Row label="Research offering" value={f.research_offering} />
              )}
              {f.afsl_number && (
                <Row
                  label="AFSL number"
                  value={
                    <a
                      href={`https://moneysmart.gov.au/financial-advice/financial-advisers-register?searchType=advisorOrEntity&search=${encodeURIComponent(f.afsl_number)}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-amber-600 hover:text-amber-700 font-semibold"
                    >
                      {f.afsl_number} (verify on ASIC) →
                    </a>
                  }
                />
              )}
            </dl>
          </section>

          {/* Service tiers */}
          {f.service_tiers && f.service_tiers.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 mb-6">
              <h2 className="text-base md:text-lg font-bold text-slate-900 mb-4">
                Service tiers
              </h2>
              <div className="space-y-3">
                {f.service_tiers.map((tier, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">{tier.name}</h3>
                      {tier.min_investment_cents && (
                        <span className="text-xs text-slate-500 shrink-0">
                          From {formatMinimum(tier.min_investment_cents)}
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{tier.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Enquiry form */}
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                Enquire about {f.name}
              </h2>
              <p className="text-sm text-slate-600">
                Send a no-obligation enquiry. We&apos;ll forward your details to
                the firm and they&apos;ll be in touch directly.
              </p>
            </div>
            <FullServiceBrokerEnquiryForm
              professionalId={f.id}
              firmName={f.name}
            />
          </section>

          {/* Back nav */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link
              href="/brokers/full-service"
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
            >
              ← All Full-Service Brokers
            </Link>
            <Link
              href="/compare"
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
            >
              Compare DIY Platforms
            </Link>
          </div>

          <ComplianceFooter />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 md:px-6 py-3 md:py-3.5 grid grid-cols-3 gap-3">
      <dt className="text-xs md:text-sm text-slate-500">{label}</dt>
      <dd className="col-span-2 text-xs md:text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
