import type { Metadata } from "next";
import BuyerAgentsClient from "./BuyerAgentsClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const BUYER_AGENT_FAQS = [
  {
    q: "What does a buyer's agent do?",
    a: "A buyer's agent (also called a buyer's advocate) represents the purchaser in a property transaction — not the vendor. They source properties (including off-market), evaluate them, bid at auction on your behalf, and negotiate directly with the selling agent. Their job is to secure the right property at the lowest achievable price, while removing the emotional pressure and information asymmetry that buyers typically face alone.",
  },
  {
    q: "How much does a buyer's agent cost in Australia?",
    a: "Most buyer's agents charge either a flat fee or a percentage of the purchase price, typically 1–3% plus GST. Flat-fee services often start around $5,000–$10,000 for auction bidding only; full-service (search + negotiation + settlement support) typically costs $10,000–$25,000+ depending on the state and property price. Some agents charge a success fee only; others charge an upfront engagement fee. Always confirm the fee structure and whether it's capped before signing.",
  },
  {
    q: "Is it worth using a buyer's agent?",
    a: "For competitive markets (inner-city Sydney, Melbourne, Brisbane) where good properties sell before they're even listed, a buyer's agent with strong agent relationships often accesses stock that retail buyers never see. Research suggests buyers using a buyer's agent pay 2–5% below comparable retail buyers on average — which typically more than covers the fee on any purchase above $500K. The value is highest for interstate buyers, time-poor professionals, and first-time buyers in auction-heavy markets.",
  },
  {
    q: "Do buyer's agents work in all Australian states?",
    a: "Yes, but the market depth varies significantly. Buyer's agents are most common and most established in Sydney and Melbourne, where auction clearance rates are high and off-market activity is significant. Brisbane, Perth, and Adelaide have a growing buyer's agent market. Rural and regional areas have fewer specialists. On this platform, all listed buyer's agents are verified with a current buyer's agent licence in their state — only licensed professionals can legally represent buyers at auction.",
  },
];

const buyerAgentFaqLd = faqJsonLd(BUYER_AGENT_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Verified Buyer's Agents Australia — invest.com.au",
  description:
    "Find a verified buyer's agent in Sydney, Melbourne, Brisbane, Perth, Adelaide and beyond. Compare fees, specialities, and reviews. Free consultation, no obligation.",
  openGraph: {
    title: "Verified Buyer's Agents — invest.com.au",
    description: "Find a verified buyer's agent near you. Free consultation, no obligation.",
    url: "/property/buyer-agents",
  },
  alternates: { canonical: "/property/buyer-agents" },
};

export default function BuyerAgentsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Property", url: absoluteUrl("/properties") },
    { name: "Buyer's Agents" },
  ]);
  return (
    <>
      <JsonLd data={[breadcrumb, ...(buyerAgentFaqLd ? [buyerAgentFaqLd] : [])]} testId="buyer-agents-jsonld" />
      <BuyerAgentsClient />
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {BUYER_AGENT_FAQS.map((faq) => (
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
