import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- pro-settings surface; mirrors app/pros/settings/pricing-tier/page.tsx.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";
import { listAllSlotsForPro } from "@/lib/consultations";

import AvailabilityClient from "./AvailabilityClient";

export const metadata: Metadata = {
  title: "Availability — Invest.com.au",
  description: "Manage your consultation availability slots.",
  alternates: { canonical: `${SITE_URL}/pros/availability` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProsAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/pros/availability");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    redirect("/pros/join");
  }

  const slots = await listAllSlotsForPro(pro.id as number);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/account" className="hover:underline">
          Account
        </Link>
        <span className="mx-2">/</span>
        <Link href="/pros/billing" className="hover:underline">
          Pros
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Availability</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Consultation availability
      </h1>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Publish open windows when you&apos;re available for an intro call.
        Consumers whose Match Request you&apos;ve accepted will see these on
        their tracker and can book one. You confirm the booking and
        (optionally) paste a Google Meet or Zoom link.
      </p>

      <AvailabilityClient initialSlots={slots} />
    </main>
  );
}
