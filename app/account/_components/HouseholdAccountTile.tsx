import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import {
  HOUSEHOLDS_FLAG,
  getHouseholdContextForUser,
} from "@/lib/households";

/**
 * HouseholdAccountTile — self-contained, flag-gated entry point for Household
 * Workspaces on the account home (idea #6). Renders NOTHING when the
 * `households` flag is off (full dormancy). When on:
 *   - in a household → a "manage household" tile (with pending/active status).
 *   - not yet        → an invite-your-partner call to action.
 *
 * Mirrors the ChallengesAccountTile isolation pattern: one server component,
 * fail-soft, no props.
 */
export default async function HouseholdAccountTile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const flagOn = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });
  if (!flagOn) return null;

  const ctx = await getHouseholdContextForUser(user.id);
  const hasPartner = !!ctx?.partner;
  const pending = ctx?.members.some(
    (m) => m.role === "partner" && m.status === "pending",
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <Link
        href="/account/household"
        className="block rounded-2xl border border-violet-200 bg-violet-50 p-4 transition-colors hover:border-violet-400"
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl">
            🏡
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {ctx ? ctx.household.name : "Plan together as a household"}
              </h3>
              {ctx && (
                <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                  {hasPartner ? "Sharing" : pending ? "Invite pending" : "Set up"}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {hasPartner
                ? "View your combined net worth and goals, and choose what to share."
                : ctx
                  ? "Waiting for your partner to accept their invitation."
                  : "Invite your partner to share goals, balances and watchlist items."}
            </p>
            <p className="mt-2 text-xs font-semibold text-violet-700">
              {ctx ? "Manage household →" : "Invite your partner →"}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
