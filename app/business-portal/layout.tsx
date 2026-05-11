import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessSession } from "@/lib/require-business-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business portal — Invest.com.au",
  robots: "noindex, nofollow",
};

/**
 * Gate every /business-portal/* route on:
 *   1. Authenticated user (else → /account/login)
 *   2. Active or pending business_accounts row (else → /account/upgrade/business)
 *
 * Per-portal active-kind enforcement (the "strict separation" workspace
 * promise) lands in a separate PR; for now, just check membership here.
 */
export default async function BusinessPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
