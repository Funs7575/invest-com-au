import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import SavingsCalculatorClient from "./SavingsCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Savings Rate Calculator — Are You Earning Enough? (${CURRENT_YEAR})`,
  description: "Compare your current savings rate against Australia's best accounts. See exactly how much extra interest you could earn by switching.",
  alternates: { canonical: "/savings-calculator" },
  openGraph: {
    title: `Savings Rate Calculator — How Much Are You Leaving on the Table? | ${SITE_NAME}`,
    description: "Enter your savings balance and current rate. See how much more you could earn at Australia's top savings accounts.",
    images: [{ url: "/api/og?title=Savings+Calculator&subtitle=Are+you+earning+enough%3F&type=default", width: 1200, height: 630 }],
  },
};

export default async function SavingsCalculatorPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("brokers")
    .select("id, slug, name, platform_type, asx_fee, rating, affiliate_url, color, min_deposit")
    .eq("status", "active")
    .eq("platform_type", "savings_account")
    .order("rating", { ascending: false });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Savings Rate Calculator — ${SITE_NAME}`,
    description: "Compare savings account interest rates and calculate how much more you could earn.",
    url: "https://invest.com.au/savings-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SavingsCalculatorClient accounts={accounts || []} />
    </>
  );
}
