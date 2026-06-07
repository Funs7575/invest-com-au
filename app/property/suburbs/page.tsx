import type { Metadata } from "next";
import SuburbsClient from "./SuburbsClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const SUBURB_RESEARCH_FAQS = [
  {
    q: "What data should I look at when researching a suburb for property investment?",
    a: "Key metrics: median house/unit price (trend over 5+ years shows growth trajectory); rental yield (gross yield = annual rent ÷ purchase price; net yield subtracts rates, insurance, management); vacancy rate (under 2% is tight — good for landlords; above 3% is soft, harder to find tenants); days on market (shorter = more competition = seller's market); capital growth rate (10-year CAGR smooths out cycles); population and infrastructure growth plans. No single metric is decisive — a suburb with strong yield may have weak capital growth, and vice versa.",
  },
  {
    q: "How do I find suburbs with high rental yields in Australia?",
    a: "High-yield suburbs tend to be regional or outer metropolitan areas where prices are lower relative to rents. Queensland regional centres (Townsville, Mackay, Rockhampton), parts of regional WA (Kalgoorlie, Geraldton), and some SA/NT locations have historically offered 6–8% gross yields versus 3–4% in Sydney or Melbourne. Be cautious: high yield often reflects higher vacancy risk, lower liquidity, or less capital growth. The best investment is usually a balance — a suburb with 4–5% yield AND a clear growth driver (new infrastructure, employer anchor, housing shortage).",
  },
  {
    q: "What is a good capital growth rate for Australian property?",
    a: "Australian capital city houses have historically averaged 7–8% p.a. nominal capital growth over the long term. Regional markets have varied more widely. In practice, 5–7% p.a. over a 10-year period is considered solid for a residential investment property. Growth is cyclical — a suburb might grow 20% in one year and 0% the next. Focus on 10-year CAGR rather than recent peaks or troughs, which can be misleading. Compare the suburb's growth rate against the broader metro area to assess relative performance.",
  },
  {
    q: "What is a vacancy rate and how does it affect property investment?",
    a: "A vacancy rate is the percentage of rental properties in an area that are empty and available to rent at a given time. It's calculated as: (vacant properties ÷ total rental properties) × 100. Below 2% is considered a landlord's market — low supply, easy to find tenants, rents rise. 2–3% is balanced. Above 3% favours tenants — higher supply, longer vacancy periods, downward pressure on rents. SQM Research and REIA publish monthly vacancy rate data by suburb and region. As a landlord, a low vacancy rate reduces your holding cost risk significantly.",
  },
];

const suburbsFaqLd = faqJsonLd(SUBURB_RESEARCH_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Suburb Research — Property Investment Data — invest.com.au",
  description:
    "Research Australian suburbs with median prices, rental yields, vacancy rates, capital growth, and population data. Data-driven property investment decisions.",
  openGraph: {
    title: "Suburb Research — invest.com.au",
    description: "Research suburbs with median prices, rental yields, and capital growth data.",
    url: "/property/suburbs",
  },
  alternates: { canonical: "/property/suburbs" },
};

export default function SuburbResearchPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Property", url: absoluteUrl("/properties") },
    { name: "Suburb Research" },
  ]);
  return (
    <>
      <JsonLd data={[breadcrumb, ...(suburbsFaqLd ? [suburbsFaqLd] : [])]} testId="suburbs-jsonld" />
      <SuburbsClient />
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {SUBURB_RESEARCH_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </>
  );
}
