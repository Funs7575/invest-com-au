import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessSession } from "@/lib/require-business-session";
import { enforcePortalKind } from "@/lib/portal-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business portal — Invest.com.au",
  robots: "noindex, nofollow",
};

/**
 * Gate every /business-portal/* route on:
 *   1. Workspace-kind isolation (enforcePortalKind) — a multi-kind user must
 *      deliberately switch into the business workspace; this prevents reaching
 *      the business portal while active in another kind (audit §5 #14).
 *   2. Authenticated user (else → /account/login)
 *   3. Active or pending business_accounts row (else → /account/upgrade/business)
 */
export default async function BusinessPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Workspace-isolation gate (matches the advisor portal). Redirects an
  // unauthenticated user to login and a user not in the business workspace to
  // the chooser, before any business data is loaded.
  await enforcePortalKind("business_owner");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/business-portal");
  }

  const businessId = await requireBusinessSession();
  if (!businessId) {
    redirect("/account/upgrade/business");
  }

  return <>{children}</>;
}
