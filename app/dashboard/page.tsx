import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics",
  robots: "noindex, nofollow",
};

export default async function DashboardPage() {
  // Server gate: the analytics shell was previously rendered to anyone, even
  // though /api/analytics-dashboard is admin-only — anon/non-admin visitors
  // saw the skeleton then an error state. proxy.ts only gates /admin and
  // /broker-portal (it noindexes /dashboard but does not auth it), so the
  // page must guard itself. Mirror the API allowlist (getAdminEmails).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/auth/login?next=/dashboard");
  }
  if (!getAdminEmails().includes(user.email.toLowerCase())) {
    redirect("/auth/login?next=/dashboard");
  }

  return <DashboardClient />;
}
