import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateLink } from "@/lib/investor-referrals";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refer a friend — Invest.com.au",
  alternates: { canonical: `${SITE_URL}/account/refer` },
  robots: { index: false, follow: false },
};

export default async function AccountReferPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/account/refer");

  const link = await getOrCreateLink(user.id);
  const shareUrl = `${SITE_URL}/api/ref/${link.share_token}`;

  const admin = createAdminClient();
  const { data: credits } = await admin
    .from("investor_referral_credits")
    .select("credits_awarded, source_event, created_at")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const totalCredits = (credits ?? []).reduce(
    (sum, c) => sum + ((c.credits_awarded as number | null) ?? 0),
    0,
  );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Refer a friend, earn credits
      </h1>
      <p className="text-slate-600 mb-6 leading-relaxed">
        Share your link. When someone signs up + sends a Match Request, you both earn credits.
      </p>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">
          Your share link
        </p>
        <code className="block bg-slate-50 border border-slate-200 rounded p-3 text-sm break-all mb-3">
          {shareUrl}
        </code>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Clicks" value={link.click_count} />
          <Stat label="Signups" value={link.signup_count} />
          <Stat label="Briefs" value={link.brief_count} />
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest font-bold text-amber-800 mb-1">
          Credits earned
        </p>
        <p className="text-3xl font-extrabold text-slate-900">{totalCredits}</p>
        <p className="text-xs text-slate-600 mt-1">
          5 per signup · 10 per brief created · 25 per brief accepted
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
