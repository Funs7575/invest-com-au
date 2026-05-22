import { createClient } from "@/lib/supabase/server";
import type { Broker, BrokerTransferGuide } from "@/lib/types";
import SwitchClient from "./SwitchClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata = {
  title: "Platform Switch Planner — Personalised Migration Checklist",
  description:
    "Generate a personalised switching checklist between Australian platforms. See savings, CHESS transfer steps, CGT implications, and a 'nothing missed' migration plan.",
  openGraph: {
    title: "Platform Switch Planner",
    description:
      "Personalised platform migration checklist with CHESS transfer steps, CGT guidance, and savings calculator.",
    images: [
      {
        url: "/api/og?title=Platform+Switch+Planner&subtitle=Personalised+Migration+Checklist&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/switch" },
};

const BROKER_SWITCH_FAQS = faqJsonLd([
  {
    q: "How do I switch investment brokers in Australia?",
    a: "To switch brokers in Australia, open your new account first, then initiate a CHESS-sponsored holding transfer (also called an off-market transfer) from your current broker to the new one. You complete a Transfer Form, your new broker lodges it with ASX Settlement, and your holdings move without you needing to sell. Some custodial or managed account brokers require you to sell and repurchase instead.",
  },
  {
    q: "What happens to my shares when I switch brokers?",
    a: "If both brokers are CHESS-sponsored, your shares stay in your name the whole time — only the Holder Identification Number (HIN) changes. If you are moving from a custodial broker (where shares are held in the broker's name), you typically need to sell your holdings and repurchase through the new broker, which may trigger a capital gains tax event.",
  },
  {
    q: "Is it worth switching to a cheaper broker?",
    a: "It can be, especially for active traders who pay brokerage fees frequently. Compare the new broker's ongoing brokerage fees against any transfer costs and potential CGT from forced sales. For buy-and-hold investors with large unrealised gains, the tax cost of switching from a custodial broker may outweigh the fee savings for several years.",
  },
  {
    q: "What fees are involved in switching brokers?",
    a: "Common fees include an off-market transfer fee charged by your current broker (typically $20–$55 per holding), any brokerage on trades you make during the transition, and potential CGT if you must sell before transferring. Some brokers waive or reimburse transfer fees as a sign-up incentive — check the new broker's current offer before you start.",
  },
  {
    q: "How long does it take to transfer shares to a new broker?",
    a: "A CHESS-sponsored transfer between two CHESS brokers typically completes in 2–5 business days once the Transfer Form is lodged and accepted. Transfers involving a custodial broker, international securities, or managed funds can take 2–4 weeks. Your shares remain visible in your old account until the transfer settles.",
  },
]);

export default async function SwitchPage() {
  const supabase = await createClient();

  const [brokersRes, guidesRes] = await Promise.all([
    supabase
      .from("brokers")
      .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
      .eq("status", "active")
      .order("name"),
    supabase.from("broker_transfer_guides").select("*"),
  ]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Switch Platforms" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BROKER_SWITCH_FAQS) }}
      />
      <SwitchClient
        brokers={(brokersRes.data as Broker[]) || []}
        transferGuides={(guidesRes.data as BrokerTransferGuide[]) || []}
      />
    </>
  );
}
