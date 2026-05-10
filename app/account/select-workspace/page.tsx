/**
 * Workspace chooser page (W2 Phase 2.5).
 *
 * Shown to multi-kind users right after authentication. Each card represents
 * a kind the user holds; clicking sets `iv_active_kind` and redirects to
 * that kind's portal. Acts as the central pivot point — users return here
 * via the header switcher whenever they want to change context.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getKindsForUser,
  type KindMembership,
  type WorkspaceKind,
} from "@/lib/account-kinds";
import SelectWorkspaceClient from "./SelectWorkspaceClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose your workspace — Invest.com.au",
  robots: "noindex, nofollow",
};

export default async function SelectWorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/select-workspace");
  }

  const memberships = await getKindsForUser(user.id);

  // Synthesise an investor membership if the user has no rows yet — every
  // signed-in user gets the investor workspace as a default. The
  // investor_profiles row gets created lazily on first quiz / holdings write.
  const augmented: KindMembership[] = memberships.length > 0
    ? memberships
    : [
        {
          authUserId: user.id,
          kind: "investor",
          kindId: user.id,
          status: "active",
          displayLabel: "Investor account",
          createdAt: new Date().toISOString(),
        },
      ];

  return (
    <main className="bg-slate-50 min-h-[60vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Choose your workspace
          </h1>
          <p className="text-sm text-slate-600">
            You have multiple roles on Invest.com.au. Pick the workspace you'd like to start in — you can switch any time from the header menu.
          </p>
        </header>
        <SelectWorkspaceClient memberships={augmented} />
      </div>
    </main>
  );
}
