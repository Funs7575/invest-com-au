import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ApplyClient from "./ApplyClient";

export const revalidate = 3600;

interface ApplyBroker {
  name: string;
  slug: string;
  tagline: string | null;
  rating: number | null;
  logo_url: string | null;
  asx_fee: string | null;
  us_fee: string | null;
  fx_rate: number | null;
  chess_sponsored: boolean;
  year_founded: number | null;
  affiliate_url: string | null;
  deal: boolean;
  deal_text: string | null;
  deal_badge: string | null;
  pros: string[] | string | null;
  platform_type: string | null;
  min_deposit: string | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: broker } = await supabase
    .from("brokers")
    .select("name")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!broker) {
    return { title: "Apply" };
  }

  return {
    title: `Open Account with ${broker.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: broker } = await supabase
    .from("brokers")
    .select(
      "name, slug, tagline, rating, logo_url, asx_fee, us_fee, fx_rate, chess_sponsored, year_founded, affiliate_url, deal, deal_text, deal_badge, pros, platform_type, min_deposit"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!broker || !broker.affiliate_url) {
    notFound();
  }

  return <ApplyClient broker={broker as ApplyBroker} />;
}
