import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import CompareClient from "./CompareClient";

export default async function ComparePage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  return <CompareClient brokers={(brokers as Broker[]) || []} />;
}
