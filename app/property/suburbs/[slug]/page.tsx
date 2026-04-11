import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { SUBURB_DATA_DISCLAIMER } from "@/lib/compliance";
import Icon from "@/components/Icon";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";

export const revalidate = 86400; // 24 hours

/* ─── State averages (rough benchmarks) ─── */
const STATE_AVERAGES: Record<string, { medianHouse: number; medianUnit: number; rentalYield: number; vacancyRate: number; capitalGrowth10yr: number; medianIncome: number }> = {
  NSW: { medianHouse: 110000000, medianUnit: 72000000, rentalYield: 3.1, vacancyRate: 2.1, capitalGrowth10yr: 62, medianIncome: 62000 },
  VIC: { medianHouse: 85000000, medianUnit: 56000000, rentalYield: 3.3, vacancyRate: 2.4, capitalGrowth10yr: 52, medianIncome: 58000 },
  QLD: { medianHouse: 75000000, medianUnit: 48000000, rentalYield: 4.0, vacancyRate: 1.5, capitalGrowth10yr: 58, medianIncome: 55000 },
  WA:  { medianHouse: 65000000, medianUnit: 42000000, rentalYield: 4.5, vacancyRate: 1.2, capitalGrowth10yr: 35, medianIncome: 60000 },
  SA:  { medianHouse: 62000000, medianUnit: 38000000, rentalYield: 4.2, vacancyRate: 0.8, capitalGrowth10yr: 55, medianIncome: 52000 },
  TAS: { medianHouse: 58000000, medianUnit: 40000000, rentalYield: 4.4, vacancyRate: 1.0, capitalGrowth10yr: 68, medianIncome: 50000 },
  ACT: { medianHouse: 95000000, medianUnit: 55000000, rentalYield: 3.6, vacancyRate: 1.8, capitalGrowth10yr: 55, medianIncome: 70000 },
  NT:  { medianHouse: 50000000, medianUnit: 32000000, rentalYield: 5.5, vacancyRate: 2.8, capitalGrowth10yr: 15, medianIncome: 58000 },
};

const STATE_FULL_NAME: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia",
  SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};

function formatPrice(cents: number | null): string {
  if (!cents) return "\u2014";
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

function growthColor(val: number | null): string {
  if (val == null) return "text-slate-400";
  if (val > 0) return "text-emerald-600";
  if (val < 0) return "text-red-600";
  return "text-slate-500";
}

function advisorStateSlug(state: string): string {
  return state.toLowerCase();
}

/* ─── generateStaticParams ─── */

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("suburb_data")
    .select("slug")
    .not("slug", "is", null);

  return (data || []).map((row) => ({ slug: row.slug as string }));
}

/* ─── generateMetadata ─── */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: suburb } = await supabase
    .from("suburb_data")
    .select("suburb, state, postcode, seo_description")
    .eq("slug", slug)
    .single();

  if (!suburb) return { title: "Suburb Not Found" };

  const title = `Investing in ${suburb.suburb}, ${suburb.state} \u2014 Property Investment Guide (${CURRENT_YEAR})`;
  const description =
    suburb.seo_description ||
    `${suburb.suburb}, ${suburb.state} ${suburb.postcode ? `(${suburb.postcode})` : ""} property investment guide. Median prices, rental yields, capital growth, demographics, and market insights.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/property/suburbs/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`${suburb.suburb}, ${suburb.state}`)}&sub=${encodeURIComponent("Property Investment Guide")}`,
          width: 1200,
          height: 630,
          alt: `${suburb.suburb} property investment guide`,
        },
      ],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: `/property/suburbs/${slug}` },
  };
}

/* ─── Page Component ─── */

export default async function SuburbDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: suburb } = await supabase
    .from("suburb_data")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!suburb) notFound();

  const stateAvg = STATE_AVERAGES[suburb.state] || STATE_AVERAGES.NSW;
  const stateFullName = STATE_FULL_NAME[suburb.state] || suburb.state;

  /* ─── JSON-LD ─── */
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Property", url: `${SITE_URL}/property` },
    { name: "Suburbs", url: `${SITE_URL}/property/suburbs` },
    { name: `${suburb.suburb}, ${suburb.state}` },
  ]);

  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${suburb.suburb}, ${suburb.state}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: suburb.suburb,
      addressRegion: stateFullName,
      ...(suburb.postcode ? { postalCode: suburb.postcode } : {}),
      addressCountry: "AU",
    },
    ...(suburb.latitude && suburb.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: suburb.latitude,
            longitude: suburb.longitude,
          },
        }
      : {}),
  };

  return (
    <div className="bg-white min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeLd) }}
      />

      {/* ── Hero ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          {/* Breadcrumbs */}
          <nav className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-600">Property</Link>
            <span>/</span>
            <Link href="/property/suburbs" className="hover:text-slate-600">Suburbs</Link>
            <span>/</span>
            <span className="text-slate-600">{suburb.suburb}</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
            {suburb.suburb}, {suburb.state}
          </h1>
          <p className="text-sm text-slate-500">
            {suburb.postcode && `Postcode ${suburb.postcode} · `}
            {stateFullName} · Property Investment Guide
          </p>

          {/* Key stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">{formatPrice(suburb.median_price_house)}</p>
              <p className="text-[0.65rem] text-slate-400">Median House</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">{formatPrice(suburb.median_price_unit)}</p>
              <p className="text-[0.65rem] text-slate-400">Median Unit</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-emerald-700">
                {suburb.rental_yield_house ? `${suburb.rental_yield_house}%` : "\u2014"}
              </p>
              <p className="text-[0.65rem] text-emerald-600">Rental Yield (House)</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">
                {suburb.vacancy_rate != null ? `${suburb.vacancy_rate}%` : "\u2014"}
              </p>
              <p className="text-[0.65rem] text-slate-400">Vacancy Rate</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-slate-900">
                {suburb.population ? suburb.population.toLocaleString() : "\u2014"}
              </p>
              <p className="text-[0.65rem] text-slate-400">Population</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-6 md:py-8 space-y-8">
        {/* ── Investment Highlights: Capital Growth ── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            <Icon name="trending-up" size={18} className="inline -mt-0.5 mr-1.5 text-amber-500" />
            Capital Growth
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "1 Year", value: suburb.capital_growth_1yr },
              { label: "3 Year", value: suburb.capital_growth_3yr },
              { label: "5 Year", value: suburb.capital_growth_5yr },
              { label: "10 Year", value: suburb.capital_growth_10yr },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className={`text-xl font-extrabold ${growthColor(item.value)}`}>
                  {item.value != null ? `${item.value > 0 ? "+" : ""}${item.value}%` : "\u2014"}
                </p>
                <p className="text-xs text-slate-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demographics ── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            <Icon name="users" size={18} className="inline -mt-0.5 mr-1.5 text-slate-400" />
            Demographics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Population</p>
              <p className="font-bold text-slate-900">{suburb.population ? suburb.population.toLocaleString() : "\u2014"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Pop. Growth</p>
              <p className="font-bold text-slate-900">{suburb.population_growth != null ? `${suburb.population_growth}%` : "\u2014"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Median Age</p>
              <p className="font-bold text-slate-900">{suburb.median_age ?? "\u2014"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Median Income</p>
              <p className="font-bold text-slate-900">{suburb.median_income ? `$${suburb.median_income.toLocaleString()}` : "\u2014"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400">Distance to CBD</p>
              <p className="font-bold text-slate-900">{suburb.distance_to_cbd_km != null ? `${suburb.distance_to_cbd_km}km` : "\u2014"}</p>
            </div>
          </div>
        </section>

        {/* ── Why Invest Here ── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            <Icon name="lightbulb" size={18} className="inline -mt-0.5 mr-1.5 text-amber-500" />
            Why Invest in {suburb.suburb}?
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              {suburb.investment_summary || (
                <>
                  {suburb.suburb} is located in {stateFullName}
                  {suburb.distance_to_cbd_km != null ? `, approximately ${suburb.distance_to_cbd_km}km from the CBD` : ""}.
                  {suburb.median_price_house ? ` With a median house price of ${formatPrice(suburb.median_price_house)}` : ""}
                  {suburb.rental_yield_house ? ` and a rental yield of ${suburb.rental_yield_house}%` : ""}
                  {suburb.capital_growth_10yr ? `, the suburb has delivered ${suburb.capital_growth_10yr}% capital growth over the past decade` : ""}.
                  {suburb.vacancy_rate != null ? ` The vacancy rate sits at ${suburb.vacancy_rate}%, ` : " "}
                  {suburb.vacancy_rate != null && suburb.vacancy_rate < 2
                    ? "indicating strong rental demand."
                    : suburb.vacancy_rate != null && suburb.vacancy_rate < 3.5
                      ? "suggesting balanced rental demand."
                      : "which investors should monitor carefully."}
                  {suburb.population_growth != null && suburb.population_growth > 1
                    ? ` Population growth of ${suburb.population_growth}% signals continued demand for housing.`
                    : ""}
                  {" "}As with all property investments, prospective buyers should conduct thorough due diligence and seek independent advice.
                </>
              )}
            </p>
          </div>
        </section>

        {/* ── Infrastructure (if available) ── */}
        {suburb.infrastructure_notes && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              <Icon name="building" size={18} className="inline -mt-0.5 mr-1.5 text-slate-400" />
              Infrastructure &amp; Development
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-600 leading-relaxed">{suburb.infrastructure_notes}</p>
            </div>
          </section>
        )}

        {/* ── Market Comparison vs State Average ── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            <Icon name="bar-chart" size={18} className="inline -mt-0.5 mr-1.5 text-slate-400" />
            {suburb.suburb} vs {suburb.state} State Average
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Metric</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">{suburb.suburb}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">{suburb.state} Avg</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">Median House Price</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPrice(suburb.median_price_house)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatPrice(stateAvg.medianHouse)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">Median Unit Price</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPrice(suburb.median_price_unit)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatPrice(stateAvg.medianUnit)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">Rental Yield (House)</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{suburb.rental_yield_house ? `${suburb.rental_yield_house}%` : "\u2014"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{stateAvg.rentalYield}%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">Vacancy Rate</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{suburb.vacancy_rate != null ? `${suburb.vacancy_rate}%` : "\u2014"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{stateAvg.vacancyRate}%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">10yr Capital Growth</td>
                  <td className={`px-4 py-3 text-right font-semibold ${growthColor(suburb.capital_growth_10yr)}`}>{suburb.capital_growth_10yr != null ? `${suburb.capital_growth_10yr}%` : "\u2014"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{stateAvg.capitalGrowth10yr}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-500">Median Income</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{suburb.median_income ? `$${suburb.median_income.toLocaleString()}` : "\u2014"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">${stateAvg.medianIncome.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[0.62rem] text-slate-400 mt-2">State averages are approximate benchmarks and may not reflect the most recent data.</p>
        </section>

        {/* ── Nearby Properties ── */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            <Icon name="home" size={18} className="inline -mt-0.5 mr-1.5 text-slate-400" />
            Property Listings in {suburb.suburb}
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-500 mb-3">Browse available investment properties in and around {suburb.suburb}.</p>
            <Link
              href={`/property/listings?suburb=${encodeURIComponent(suburb.suburb)}`}
              className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all"
            >
              View Listings in {suburb.suburb}
            </Link>
          </div>
        </section>

        {/* ── Find a Buyer's Agent CTA ── */}
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Find a Buyer&apos;s Agent in {suburb.state}</h2>
              <p className="text-sm text-slate-500">
                A licensed buyer&apos;s agent can help you secure the right investment property in {suburb.suburb} and negotiate on your behalf.
              </p>
            </div>
            <Link
              href={`/advisors/buyers-agents/${advisorStateSlug(suburb.state)}`}
              className="shrink-0 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-all"
            >
              Find an Agent
            </Link>
          </div>
        </section>

        {/* ── Data Disclaimer ── */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">Data Disclaimer</p>
                <p className="text-[0.65rem] md:text-xs text-slate-500 leading-relaxed">{SUBURB_DATA_DISCLAIMER}</p>
                <PropertyDisclaimer />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
