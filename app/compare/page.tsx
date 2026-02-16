import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import CompareClient from "./CompareClient";

export const metadata = {
  title: "Compare Australian Brokers — Invest.com.au",
  description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms. Updated February 2026.",
};

export default async function ComparePage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  const activeBrokers = (brokers as Broker[]) || [];

  // JSON-LD structured data for search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Compare Australian Brokers",
    description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms.",
    numberOfItems: activeBrokers.length,
    itemListElement: activeBrokers.slice(0, 10).map((b: Broker, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: `https://invest.com.au/broker/${b.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareClient brokers={activeBrokers} />
    </>
  );
}
