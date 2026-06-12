import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import {
  HOUSEHOLDS_FLAG,
  getPendingInvitesForEmail,
  getHouseholdContextForUser,
} from "@/lib/households";
import AcceptInvite from "./AcceptInvite";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept household invitation — My Account",
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const token = typeof sp.token === "string" ? sp.token : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Bounce through login, preserving the token so the accept survives.
    const next = `/account/household/accept${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  const flagOn = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });
  if (!flagOn) notFound();

  // Already in a household? Send them to manage it instead of accepting another.
  const existing = await getHouseholdContextForUser(user.id);

  // Match the token (if any) against the signed-in user's pending invites so we
  // can show the household name + a clear email-mismatch message before the POST.
  const invites = user.email ? await getPendingInvitesForEmail(user.email) : [];
  const matched = token
    ? invites.find((i) => i.member.invite_token === token) ?? null
    : invites[0] ?? null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-500">
        <Link href="/account" className="hover:text-slate-900">
          ← My account
        </Link>
      </nav>
      <AcceptInvite
        token={token}
        signedInEmail={user.email ?? ""}
        householdName={matched?.household.name ?? null}
        hasMatch={!!matched}
        alreadyInHousehold={!!existing}
      />
    </div>
  );
}
