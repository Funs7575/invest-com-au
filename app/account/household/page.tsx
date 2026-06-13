import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import {
  HOUSEHOLDS_FLAG,
  getHouseholdContextForUser,
  partnerLabel,
} from "@/lib/households";
import { getInvestorProfile } from "@/lib/investor-profiles";
import HouseholdManager, { type HouseholdView } from "./HouseholdManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Household — My Account",
  robots: { index: false, follow: false },
};

export default async function HouseholdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/household");

  // Flag off → the feature doesn't exist. 404 keeps it fully dormant.
  const flagOn = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });
  if (!flagOn) notFound();

  const ctx = await getHouseholdContextForUser(user.id);

  let view: HouseholdView | null = null;
  if (ctx) {
    // Resolve a friendly label for the partner (their display name if we can).
    let partnerName: string | null = null;
    if (ctx.partner?.user_id) {
      try {
        const profile = await getInvestorProfile(ctx.partner.user_id);
        partnerName = profile?.displayName ?? null;
      } catch {
        partnerName = null;
      }
    }
    view = {
      householdName: ctx.household.name,
      myRole: ctx.myRole,
      members: ctx.members
        .filter((m) => m.status !== "revoked" && m.status !== "left")
        .map((m) => ({
          id: m.id,
          email: m.invited_email,
          role: m.role,
          status: m.status,
          isMe: m.user_id === user.id,
          label:
            m.user_id && m.id === ctx.partner?.id
              ? partnerLabel({ displayName: partnerName, email: m.invited_email })
              : partnerLabel({ displayName: null, email: m.invited_email }),
        })),
    };
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-500">
        <Link href="/account" className="hover:text-slate-900">
          ← My account
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Household</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan your money together. Invite a partner and choose, item by item,
          what to share. Sharing grants read access only — you stay the owner of
          everything you share.
        </p>
      </header>

      <HouseholdManager initialView={view} />

      <p className="mt-10 text-xs text-slate-500">
        General information only. Sharing an item lets your household partner view
        it; they can never edit or remove your items.
      </p>
    </div>
  );
}
