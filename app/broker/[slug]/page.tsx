import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import BrokerReviewClient from "./BrokerReviewClient";

export default async function BrokerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!broker) notFound();

  const b = broker as Broker;

  // Fetch similar brokers (same crypto/non-crypto type, closest by rating)
  const { data: similar } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .eq('is_crypto', b.is_crypto)
    .neq('slug', slug)
    .order('rating', { ascending: false })
    .limit(3);

  return <BrokerReviewClient broker={b} similar={(similar as Broker[]) || []} />;
}
