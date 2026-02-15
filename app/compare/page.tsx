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

  return <CompareClient brokers={(brokers as Broker[]) || []} />;
}
