import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { getOrCreateLink } from "@/lib/pro-affiliate/links";
import { getStatsForPro } from "@/lib/pro-affiliate/track";

import AffiliateDashboardClient from "./AffiliateDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Affiliate program — My Account",
  description:
    "Share your personal Invest.com.au link, earn credits when your audience signs up.",
  robots: "noindex, nofollow",
};

export default async function AffiliateDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/account/affiliate");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, slug, name, status")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Affiliate program</h1>
        <p className="mt-4 text-slate-600">
          The pro affiliate program is open to verified Australian pros and
          expert squads. Apply to join the directory and a share link will be
          minted on approval.
        </p>
      </main>
    );
  }

  const link = await getOrCreateLink({
    proSlug: pro.slug as string,
    proKind: "professional",
  });
  if (!link) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Affiliate program</h1>
        <p className="mt-4 text-slate-600">
          We could not mint your share link right now. Please try again shortly.
        </p>
      </main>
    );
  }

  const stats = await getStatsForPro({
    proSlug: pro.slug as string,
    proKind: "professional",
  });

  const shareUrl = `${SITE_URL}/p/${link.share_token}`;
  const redirectUrl = absoluteUrl(`/api/pro-affiliate/${link.share_token}`);

  return (
    <AffiliateDashboardClient
      proName={(pro.name as string) ?? "Your profile"}
      shareToken={link.share_token}
      shareUrl={shareUrl}
      redirectUrl={redirectUrl}
      stats={stats}
    />
  );
}
