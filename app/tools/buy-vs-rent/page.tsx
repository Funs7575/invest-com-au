import type { Metadata } from "next";
import DecisionTree from "@/components/DecisionTree";
import {
  BUY_VS_RENT_TREE,
  BUY_VS_RENT_START_ID,
} from "@/lib/decision-trees/buy-vs-rent";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Should I Buy or Rent? Interactive Decision Tool (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "Answer 3–5 questions about your time horizon, deposit, and situation to get a personalised buy-vs-rent recommendation. Free, no sign-up required.",
  alternates: { canonical: "/tools/buy-vs-rent" },
  openGraph: {
    title: "Should I Buy or Rent? — Interactive Decision Tool",
    description:
      "Free decision tool for Australians weighing up buying a home versus renting. Covers time horizon, deposit size, LMI, and owner-sell scenarios.",
    url: absoluteUrl("/tools/buy-vs-rent"),
    images: [
      {
        url: "/api/og?title=Buy+vs+Rent&subtitle=Interactive+Decision+Tool&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  { name: "Buy vs Rent", url: absoluteUrl("/tools/buy-vs-rent") },
]);

const FAQ_ITEMS = [
  {
    q: "Is it better to buy or rent in Australia?",
    a: "There is no universal answer — it depends on the price-to-rent ratio in your target area, how long you plan to stay, your deposit, and your opportunity cost. In high-ratio cities (Sydney, Melbourne), renting and investing the difference has historically been competitive with buying over 5-7 year horizons. In lower-ratio cities (Brisbane, Adelaide), buying often wins from year 3-4 onward.",
  },
  {
    q: "What is the price-to-rent ratio?",
    a: "The price-to-rent ratio divides the property purchase price by the annual rent. A ratio above 25x indicates renting may be financially rational (even with zero capital growth, you'd need substantial appreciation to justify buying at that price). Sydney's ratio is typically 35-45x; Brisbane 20-28x. As a rule of thumb, below 20x typically favours buying.",
  },
  {
    q: "What are the hidden costs of buying a home in Australia?",
    a: "Upfront costs: stamp duty (2-5.5% of purchase price, varies by state), solicitor/conveyancer ($800-$2,000), building + pest inspection ($400-$800), mortgage registration, moving costs. Ongoing costs: council rates ($1,500-$4,000/yr), strata fees (units), maintenance and repairs (~1% of value/yr), insurance. These reduce the effective return on ownership significantly vs rental.",
  },
  {
    q: "How long should I plan to own before buying makes sense?",
    a: "Most financial models show buying breaks even with renting (after all transaction costs) at 5-8 years in capital cities. The main wildcard is capital growth: if you're buying in a high-growth suburb and the market rises, break-even can be 3-4 years. If flat, 10+ years. Transaction costs (stamp duty + selling costs ~2.5%) are the biggest hurdle in short-hold periods.",
  },
  {
    q: "What are the tax implications of buying vs renting?",
    a: "Owner-occupiers get the main residence CGT exemption on sale — full tax-free capital gain if always a primary residence. Renters investing surplus in shares pay CGT at 50% discounted rate after 12 months, plus annual tax on dividends. In the short term (under 7 years), renting and investing can be tax-equivalent or better; long-term the CGT-free home appreciates this advantage.",
  },
] as const;

const faqLd = faqJsonLd([...FAQ_ITEMS]);

const speakableLd = speakableWebPageJsonLd({
  name: "Should I Buy or Rent? Interactive Decision Tool",
  path: "/tools/buy-vs-rent",
  selectors: ["h1"],
});

export default function BuyVsRentPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} testId="buy-vs-rent-jsonld" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <div className="py-8 md:py-12">
        <div className="container-custom max-w-2xl">
          <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-3">
            Decision Tool
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Should I Buy or Rent?
          </h1>
          <p className="text-base text-slate-600 mb-8">
            Answer a few questions about your situation and get a personalised
            recommendation — there&apos;s no one-size-fits-all answer when it
            comes to property.
          </p>

          <DecisionTree
            nodes={BUY_VS_RENT_TREE}
            startId={BUY_VS_RENT_START_ID}
            heading="Buy vs Rent"
          />

          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">General advice only.</strong>{" "}
            This tool provides general information and does not consider your
            personal financial situation, objectives, or needs. Always seek
            professional financial advice before making property decisions.
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQ_ITEMS.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {faq.q}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
