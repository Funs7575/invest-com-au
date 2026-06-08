import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { SUBURB_DATA_DISCLAIMER, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

const STATE_AVERAGES: Record<string, { medianHouse: number; medianUnit: number; rentalYield: number; vacancyRate: number; capitalGrowth10yr: number }> = {
  NSW: { medianHouse: 110000000, medianUnit: 72000000, rentalYield: 3.1, vacancyRate: 2.1, capitalGrowth10yr: 62 },
  VIC: { medianHouse: 85000000, medianUnit: 56000000, rentalYield: 3.3, vacancyRate: 2.4, capitalGrowth10yr: 52 },
  QLD: { medianHouse: 75000000, medianUnit: 48000000, rentalYield: 4.0, vacancyRate: 1.5, capitalGrowth10yr: 58 },
  WA:  { medianHouse: 65000000, medianUnit: 42000000, rentalYield: 4.5, vacancyRate: 1.2, capitalGrowth10yr: 35 },
  SA:  { medianHouse: 62000000, medianUnit: 38000000, rentalYield: 4.2, vacancyRate: 0.8, capitalGrowth10yr: 55 },
  TAS: { medianHouse: 58000000, medianUnit: 40000000, rentalYield: 4.4, vacancyRate: 1.0, capitalGrowth10yr: 68 },
  ACT: { medianHouse: 95000000, medianUnit: 55000000, rentalYield: 3.6, vacancyRate: 1.8, capitalGrowth10yr: 55 },
  NT:  { medianHouse: 50000000, medianUnit: 32000000, rentalYield: 5.5, vacancyRate: 2.8, capitalGrowth10yr: 15 },
};

const STATE_FULL: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia",
  SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};

function fmt(cents: number | null): string {
  if (!cents) return "—";
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

function growthColor(v: number | null): string {
  if (v == null) return "text-slate-400";
  return v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "text-slate-500";
}

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return [];
  const supabase = createStaticClient();
  const { data } = await supabase.from("suburb_data").select("slug").not("slug", "is", null);
  return (data || []).map((r) => ({ suburb: r.slug as string }));
}

export async function generateMetadata({ params }: { params: Promise<{ suburb: string }> }) {
  const { suburb: slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("suburb_data")
    .select("suburb, state, postcode")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Suburb Not Found" };

  const title = `Property Investing in ${data.suburb}, ${data.state} — Guide (${CURRENT_YEAR})`;
  const description = `Is ${data.suburb} a good place to invest in property? Median prices, rental yields, vacancy rates, capital growth trends and buyer's agent connections for ${data.suburb} ${data.state}${data.postcode ? ` ${data.postcode}` : ""}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/${slug}/property-investing`,
      images: [{
        url: `/api/og?title=${encodeURIComponent(`${data.suburb} Property Investing`)}&sub=${encodeURIComponent(`${data.state} Suburb Guide`)}`,
        width: 1200,
        height: 630,
        alt: `Property investing in ${data.suburb}`,
      }],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: `/${slug}/property-investing` },
  };
}

export default async function SuburbPropertyInvestingPage({ params }: { params: Promise<{ suburb: string }> }) {
  const { suburb: slug } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("suburb_data")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!s) notFound();

  const stateAvg = STATE_AVERAGES[s.state] ?? STATE_AVERAGES.NSW!;
  const stateFullName = STATE_FULL[s.state] ?? s.state;

  const faqs = [
    {
      question: `Is ${s.suburb} a good suburb to invest in property?`,
      answer: `${s.suburb} in ${stateFullName} ${s.rental_yield_house ? `offers a rental yield of ${s.rental_yield_house}% for houses` : "has rental data available through local agents"}. ${s.capital_growth_10yr != null ? `The suburb has delivered ${s.capital_growth_10yr}% capital growth over 10 years.` : ""} As with any investment, conduct thorough due diligence and consult a licensed buyer's agent or financial adviser.`,
    },
    {
      question: `What is the median house price in ${s.suburb}?`,
      answer: `The median house price in ${s.suburb} is approximately ${fmt(s.median_price_house)}${s.median_price_unit ? `, and the median unit price is ${fmt(s.median_price_unit)}` : ""}. These figures are estimates and may vary based on recent sales activity. ${GENERAL_ADVICE_WARNING}`,
    },
    {
      question: `What is the rental yield in ${s.suburb}?`,
      answer: s.rental_yield_house
        ? `Houses in ${s.suburb} currently yield approximately ${s.rental_yield_house}% per annum${s.rental_yield_unit ? `, while units yield ${s.rental_yield_unit}%` : ""}. Yields vary by property type, condition, and management. ${GENERAL_ADVICE_WARNING}`
        : `Rental yield data for ${s.suburb} is not currently available. Contact a local property manager for current market rates.`,
    },
    {
      question: `How do I buy an investment property in ${s.suburb}?`,
      answer: `Buying an investment property in ${s.suburb} typically involves setting a budget, obtaining finance pre-approval, researching comparable sales, inspecting properties, and making an offer. A licensed buyer's agent who specialises in ${stateFullName} can help you navigate local market conditions and negotiate on your behalf.`,
    },
  ];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Property", url: `${SITE_URL}/property` },
    { name: `${s.suburb} Property Investing` },
  ]);

  const faqLd = faqJsonLd(faqs.map((f) => ({ q: f.question, a: f.answer })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-600">Property</Link>
            <span>/</span>
            <span className="text-slate-600">Property Investing in {s.suburb}</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
            Property Investing in {s.suburb}, {s.state}
          </h1>
          <p className="text-sm text-slate-500 mb-5">
            {s.postcode && `Postcode ${s.postcode} · `}
            {stateFullName} · Suburb Investment Guide {CURRENT_YEAR}
          </p>

          {/* Key stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">{fmt(s.median_price_house)}</p>
              <p className="text-[0.65rem] text-slate-400">Median House</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">{fmt(s.median_price_unit)}</p>
              <p className="text-[0.65rem] text-slate-400">Median Unit</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-emerald-700">
                {s.rental_yield_house ? `${s.rental_yield_house}%` : "—"}
              </p>
              <p className="text-[0.65rem] text-emerald-600">Rental Yield (House)</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">
                {s.vacancy_rate != null ? `${s.vacancy_rate}%` : "—"}
              </p>
              <p className="text-[0.65rem] text-slate-400">Vacancy Rate</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${s.capital_growth_10yr != null && s.capital_growth_10yr > 0 ? "bg-emerald-50" : "bg-slate-50"}`}>
              <p className={`text-lg font-extrabold ${growthColor(s.capital_growth_10yr)}`}>
                {s.capital_growth_10yr != null ? `${s.capital_growth_10yr > 0 ? "+" : ""}${s.capital_growth_10yr}%` : "—"}
              </p>
              <p className="text-[0.65rem] text-slate-400">10yr Growth</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-6 md:py-8 space-y-8">

        {/* Capital Growth */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Capital Growth History</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "1 Year", value: s.capital_growth_1yr },
              { label: "3 Year", value: s.capital_growth_3yr },
              { label: "5 Year", value: s.capital_growth_5yr },
              { label: "10 Year", value: s.capital_growth_10yr },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className={`text-xl font-extrabold ${growthColor(item.value)}`}>
                  {item.value != null ? `${item.value > 0 ? "+" : ""}${item.value}%` : "—"}
                </p>
                <p className="text-xs text-slate-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Market comparison */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">{s.suburb} vs {s.state} State Average</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm" aria-label={`${s.suburb} vs ${s.state} property market comparison`}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Metric</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">{s.suburb}</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">{s.state} Avg</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Median House", suburb: fmt(s.median_price_house), state: fmt(stateAvg.medianHouse) },
                  { label: "Median Unit", suburb: fmt(s.median_price_unit), state: fmt(stateAvg.medianUnit) },
                  { label: "Rental Yield (House)", suburb: s.rental_yield_house ? `${s.rental_yield_house}%` : "—", state: `${stateAvg.rentalYield}%` },
                  { label: "Vacancy Rate", suburb: s.vacancy_rate != null ? `${s.vacancy_rate}%` : "—", state: `${stateAvg.vacancyRate}%` },
                  { label: "10yr Capital Growth", suburb: s.capital_growth_10yr != null ? `${s.capital_growth_10yr}%` : "—", state: `${stateAvg.capitalGrowth10yr}%` },
                ].map((row, i, arr) => (
                  <tr key={row.label} className={i < arr.length - 1 ? "border-b border-slate-100" : ""}>
                    <td className="px-4 py-3 text-slate-500">{row.label}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.suburb}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{row.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.62rem] text-slate-400 mt-2">State averages are approximate benchmarks.</p>
        </section>

        {/* Demographics */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Demographics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Population", value: s.population ? s.population.toLocaleString() : "—" },
              { label: "Pop. Growth", value: s.population_growth != null ? `${s.population_growth}%` : "—" },
              { label: "Median Age", value: s.median_age ?? "—" },
              { label: "Median Income", value: s.median_income ? `$${s.median_income.toLocaleString()}` : "—" },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why invest */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Is {s.suburb} Worth Investing In?</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              {s.investment_summary ?? (
                <>
                  {s.suburb} is located in {stateFullName}
                  {s.distance_to_cbd_km != null ? `, approximately ${s.distance_to_cbd_km}km from the CBD` : ""}.
                  {s.median_price_house ? ` With a median house price of ${fmt(s.median_price_house)}` : ""}
                  {s.rental_yield_house ? ` and a rental yield of approximately ${s.rental_yield_house}%` : ""}
                  {s.capital_growth_10yr ? `, the suburb has delivered ${s.capital_growth_10yr}% capital growth over the past decade` : ""}.
                  {s.vacancy_rate != null
                    ? ` The current vacancy rate of ${s.vacancy_rate}% ${s.vacancy_rate < 2 ? "indicates strong rental demand" : s.vacancy_rate < 3.5 ? "suggests balanced rental demand" : "is worth monitoring"}.`
                    : ""}
                  {s.population_growth != null && s.population_growth > 1
                    ? ` Population growth of ${s.population_growth}% points to continued housing demand.`
                    : ""}{" "}
                  As with all property investments, conduct thorough due diligence and consult a licensed professional.
                </>
              )}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="bg-white border border-slate-200 rounded-xl group">
                <summary className="px-5 py-4 text-sm font-semibold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Buyer's agent CTA */}
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Find a Buyer&apos;s Agent in {s.state}
              </h2>
              <p className="text-sm text-slate-500">
                A licensed buyer&apos;s agent familiar with {s.suburb} can help you identify properties, conduct due diligence, and negotiate the best price.
              </p>
            </div>
            <Link
              href={`/advisors/buyers-agents/${s.state.toLowerCase()}`}
              className="shrink-0 px-5 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-all"
            >
              Find an Agent
            </Link>
          </div>
        </section>

        {/* View detailed suburb page */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <p className="flex-1 text-sm text-slate-600">
              Want full suburb data including property listings and market reports?
            </p>
            <Link
              href={`/property/suburbs/${slug}`}
              className="shrink-0 text-sm font-semibold text-amber-600 hover:underline"
            >
              View full {s.suburb} profile →
            </Link>
          </div>
        </section>

        {/* Data disclaimer */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[0.65rem] md:text-xs text-slate-500 leading-relaxed">{SUBURB_DATA_DISCLAIMER}</p>
            <p className="text-[0.65rem] md:text-xs text-slate-500 mt-2">{GENERAL_ADVICE_WARNING}</p>
          </div>
        </section>
      </div>

      <div className="container-custom pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </div>
  );
}
