import { createClient } from "@/lib/supabase/server";
import type { ProDeal, Broker } from "@/lib/types";
import ProDealsClient from "./ProDealsClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "Exclusive Pro Deals — Broker Offers for Pro Members",
  description:
    "Exclusive broker deals and offers only available to Investor Pro members. Special sign-up bonuses, reduced fees, and premium perks.",
  alternates: { canonical: "/pro/deals" },
};

export default async function ProDealsPage() {
  const supabase = await createClient();

  const [dealsRes, brokersRes] = await Promise.all([
    supabase.from("pro_deals").select("*").eq("status", "active").order("sort_order").order("featured", { ascending: false }),
    supabase.from("brokers").select("id, name, slug, color, icon, status").eq("status", "active"),
  ]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro", url: absoluteUrl("/pro") },
    { name: "Exclusive Deals" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProDealsClient
        deals={(dealsRes.data as ProDeal[]) || []}
        brokers={(brokersRes.data as Broker[]) || []}
      />
    </>
  );
}
