/**
 * Workspace switcher for the header (W2 Phase 2.5).
 *
 * Server component. Reads the active-kind cookie + the user's full
 * membership list. When the user holds 2+ kinds, renders a "Acting as: X"
 * pill linking to /account/select-workspace. When the user holds only 1
 * kind, renders nothing (no UI clutter for single-kind users).
 *
 * The switcher itself doesn't expose a dropdown — clicking jumps to the
 * chooser page where users see the full set of options + descriptions.
 * Avoids menu bloat in the header on smaller screens.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveKind,
  getKindsForUser,
  type WorkspaceKind,
} from "@/lib/account-kinds";

const KIND_LABEL: Record<WorkspaceKind, string> = {
  investor: "Investor",
  advisor: "Advisor",
  broker_partner: "Broker partner",
  business_owner: "Business owner",
  listing_owner: "Listing owner",
};

export default async function WorkspaceSwitcher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const memberships = await getKindsForUser(user.id);
  // Single-kind users (or users with 0 kinds = lazy investor only) don't
  // need a switcher. Render nothing.
  if (memberships.length < 2) return null;

  const active = await getActiveKind();
  const label = active ? KIND_LABEL[active] : "Choose workspace";

  return (
    <Link
      href="/account/select-workspace"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
      title="Switch workspace"
    >
      <span aria-hidden>⇄</span>
      <span>Acting as: {label}</span>
    </Link>
  );
}
