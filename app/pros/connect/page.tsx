import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- service-role legitimate: pending pros may not be visible to anon-RLS; mirrors /pros/billing pattern.
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectInfo } from "@/lib/stripe-connect";
import { SITE_URL } from "@/lib/seo";

import ConnectClient from "./ConnectClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stripe Connect — Invest.com.au",
  alternates: { canonical: `${SITE_URL}/pros/connect` },
  robots: { index: false, follow: false },
};

export default async function ProsConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/pros/connect");

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!pro) redirect("/pros/join");

  const info = await getConnectInfo(pro.id as number);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Stripe Connect — get paid by consumers
      </h1>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Connect your bank account to receive payouts from consumers through
        invest.com.au. We take a small platform fee on each payment; the rest
        goes straight to your bank.
      </p>
      <ConnectClient
        professionalId={pro.id as number}
        status={info.status}
        payoutsEnabled={info.payoutsEnabled}
        chargesEnabled={info.chargesEnabled}
      />
    </main>
  );
}
