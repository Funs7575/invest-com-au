import type { Metadata } from "next";
import BuyerAgentsClient from "./BuyerAgentsClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

const buyerAgentFaqLd = faqJsonLd([
  {
    q: "What does a buyer's agent do in Australia?",
    a: "A buyer's agent (also called a buyer's advocate) represents the purchaser in a property transaction — unlike a selling agent who works for the vendor. They source properties (including off-market), conduct due diligence, negotiate on price, bid at auction, and coordinate settlement on your behalf. They work to get you the best property at the lowest price, with no conflict of interest. In a competitive market, an experienced buyer's agent's negotiation skills and network access can save you more than their fee.",
  },
  {
    q: "How much does a buyer's agent cost in Australia?",
    a: "Buyer's agents typically charge either a fixed fee ($2,000–$15,000 depending on property value and service scope) or a percentage of the purchase price (1–3%). Some charge a retainer plus a success fee. On a $800,000 property, a 1.5% fee is $12,000. In competitive markets like Sydney and Melbourne inner suburbs, a good buyer's agent can negotiate discounts of $20,000–$100,000+ — making their fee a sound investment. Always clarify what the fee covers (full search, negotiation only, or auction bidding only) before engaging.",
  },
  {
    q: "Can a buyer's agent find off-market properties?",
    a: "Yes. A key benefit of a buyer's agent is access to off-market listings — properties sold without public advertising. Off-market sales occur for various reasons: vendors wanting privacy, developers clearing stock, or agents offering 'pocket listings' to trusted buyer's agents first. In tight markets like Sydney's inner ring, 30–50% of premium property trades off-market. A buyer's agent with strong local agent relationships can access these opportunities before they're listed publicly.",
  },
  {
    q: "Do I need a buyer's agent for my first home?",
    a: "Not necessarily, but it depends on the market and your confidence level. Buyer's agents add most value in competitive auction markets (Sydney, Melbourne), for investment properties in cities you don't live in, and when buying above $1M where negotiation savings can easily exceed the fee. For first home buyers in quieter markets or making lower-value purchases, the fee may outweigh the benefit. Many buyer's agents offer auction bidding-only services ($1,000–$3,000) as a lower-cost entry point.",
  },
  {
    q: "How do I check if a buyer's agent is licensed in Australia?",
    a: "Buyer's agents must hold a real estate licence in the state where they operate. Check their licence on the relevant state register: NSW (Fair Trading), VIC (Consumer Affairs Victoria), QLD (QBCC), WA (Landgate), SA (CBS). REBAA (Real Estate Buyers Agents Association of Australia) membership is voluntary but indicates a commitment to professional standards. Always check for REBAA membership and verify the state licence number before engaging.",
  },
]);

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
      <JsonLd data={breadcrumb} testId="buyer-agents-jsonld" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buyerAgentFaqLd) }} />
      <BuyerAgentsClient />
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </>
  );
}
