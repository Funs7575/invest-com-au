import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import StartupThesisClient from "./StartupThesisClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Startup Investment Thesis — My Account",
  description: "Set your sector preferences, stage focus, ticket size, and geography to get a personalised startup deal feed.",
  robots: "noindex, nofollow",
};

type StartupThesis = {
  sector_tags?: string[];
  stage_preferences?: string[];
  min_ticket_aud?: number | null;
  max_ticket_aud?: number | null;
  geography?: string[];
};

export default async function StartupThesisPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account/login?redirect=/account/startup-thesis");

  const { data } = await supabase
    .from("investor_profiles")
    .select("meta")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const meta = (data?.meta as Record<string, unknown> | null) ?? {};
  const thesis = (meta.startup_thesis as StartupThesis | undefined) ?? null;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-xs text-slate-500 mb-6">
        <Link href="/account/dashboard" className="hover:text-violet-600">Dashboard</Link>
        <span className="mx-1.5">/</span>
        <span>Startup Investment Thesis</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Startup Investment Thesis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set your sector focus, stage preferences, ticket size, and geography. Your thesis
          shapes the personalised startup deal feed at{" "}
          <Link href="/invest/startups/for-you" className="text-violet-600 hover:underline">
            /invest/startups/for-you
          </Link>.
        </p>
      </header>

      <StartupThesisClient initial={thesis} />
    </main>
  );
}
