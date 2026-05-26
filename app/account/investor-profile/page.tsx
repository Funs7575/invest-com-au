import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile } from "@/lib/investor-profiles";
import InvestorProfileForm from "./InvestorProfileForm";
import ShareProfileButton from "@/components/ShareProfileButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Investor profile — My Account",
  robots: "noindex, nofollow",
};

export default async function InvestorProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/investor-profile");
  }

  const [profile, tokensRes] = await Promise.all([
    getInvestorProfile(user.id),
    supabase
      .from("profile_share_tokens")
      .select("id, created_at, expires_at, consumed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const initialTokens = (tokensRes.data ?? []) as Array<{
    id: string;
    created_at: string;
    expires_at: string;
    consumed_at: string | null;
  }>;

  return (
    <main className="bg-slate-50 min-h-[60vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            <span aria-hidden className="mr-1.5">📈</span>
            Investor profile
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Tell us how to personalise the site for you
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            These flags shape the smart-recommendations strip across the site (broker matches, advisor matches, content surfaces). Comparison + factual content only — never personal advice. Toggle anything on or off any time.
          </p>
        </header>
        <InvestorProfileForm initial={profile} />
        <div className="mt-8">
          <ShareProfileButton initialTokens={initialTokens} />
        </div>
      </div>
    </main>
  );
}
