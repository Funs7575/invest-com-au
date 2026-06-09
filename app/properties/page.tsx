import PropertiesClient from "./PropertiesClient";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const metadata = {
  title: "Investment Property Listings — Australian Property Opportunities (2026)",
  description:
    "Browse illustrative investment property listings across Australia. Compare yields, rental returns, and suburbs to find your next opportunity.",
  openGraph: {
    title: "Investment Property Listings — Australian Property Opportunities (2026)",
    description:
      "Browse investment property opportunities across Australia. Compare gross yields, weekly rents, and suburb profiles.",
    images: [
      {
        url: "/api/og?title=Investment+Property+Listings&subtitle=Australian+Property+Opportunities&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/properties" },
};

export const revalidate = 3600;

const PROPERTIES_FAQS = [
  {
    q: "What types of investment properties are listed?",
    a: "The Investment Property Listings page shows illustrative residential and near-residential investment opportunities across Australian markets — houses, units, townhouses, and small commercial properties listed for their rental yield and capital growth potential. Listings include indicative weekly rent, gross yield percentage, suburb median data, and distance to key infrastructure. These are information listings to help investors compare potential markets and property types — they are not live real-estate agency listings and do not constitute an offer to sell.",
  },
  {
    q: "How is the gross rental yield calculated?",
    a: "Gross yield is calculated as (annual rent / property price) × 100. For example, a $600,000 property with $500 weekly rent has a gross yield of approximately 4.3%. Gross yield does not account for body corporate fees, rates, property management fees, insurance, maintenance, vacancy periods, or mortgage costs — all of which reduce your net return. Use gross yield as a quick filter, not a final investment decision metric. Always calculate net yield and model your cash flow before purchasing.",
  },
  {
    q: "How current is the property data?",
    a: "Property listings and suburb median data are updated periodically from publicly available sources including state land title data, SQM Research, and CoreLogic reference datasets. Individual listing data is refreshed when the underlying source updates, typically monthly. Specific property prices and rental estimates should be treated as indicative — verify current market conditions with a local property manager or buyer's agent before making any purchasing decision.",
  },
  {
    q: "Is browsing investment property listings considered financial advice?",
    a: "No. The information on this page is general in nature — it does not take into account your financial situation, objectives, tax position, or investment experience. Property investment involves risk including loss of capital, negative rental periods, and market downturns. Before investing in property, obtain advice from a licensed financial adviser, speak to an accountant about tax implications (negative gearing, CGT, depreciation), and engage a qualified building inspector and conveyancer. Invest.com.au does not receive commissions from property sales.",
  },
];

const propertiesFaqLd = faqJsonLd(PROPERTIES_FAQS);

export default function PropertiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Investment Properties" },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} testId="properties-jsonld" />
      {propertiesFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(propertiesFaqLd) }}
        />
      )}
      <PropertiesClient />

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {PROPERTIES_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
