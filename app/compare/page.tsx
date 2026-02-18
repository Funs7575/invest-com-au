import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import CompareClient from "./CompareClient";
import { absoluteUrl } from "@/lib/seo";

export const metadata = {
  title: "Compare Australian Brokers",
  description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms. Updated February 2026.",
  openGraph: {
    title: "Compare Australian Brokers — Invest.com.au",
    description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms.",
    images: [{ url: "/api/og?title=Compare+Australian+Brokers&subtitle=Fees,+features+%26+safety+side-by-side&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare" },
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
      url: absoluteUrl(`/broker/${b.slug}`),
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
