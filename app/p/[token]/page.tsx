import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";

import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getLinkByToken } from "@/lib/pro-affiliate/links";
import { recordClick } from "@/lib/pro-affiliate/track";
// eslint-disable-next-line no-restricted-imports -- Public landing page needs to hydrate the linked professional / team regardless of `public`/`verification_status`. The pro driving traffic from LinkedIn might be `pending` or `unverified`; we still render their page (with a soft note) so the share link never 404s mid-campaign.
import { createAdminClient } from "@/lib/supabase/admin";

import type { ProAffiliateLink } from "@/lib/pro-affiliate/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

interface PersonProfile {
  name: string;
  slug: string;
  bio: string | null;
  photoUrl: string | null;
  kind: "professional" | "team";
}

async function loadProfileForLink(
  link: ProAffiliateLink,
): Promise<PersonProfile | null> {
  const admin = createAdminClient();
  if (link.pro_kind === "professional") {
    const { data: pro } = await admin
      .from("professionals")
      .select("name, slug, bio, photo_url")
      .eq("slug", link.pro_slug)
      .maybeSingle();
    if (!pro) return null;
    return {
      name: (pro.name as string) ?? link.pro_slug,
      slug: pro.slug as string,
      bio: (pro.bio as string | null) ?? null,
      photoUrl: (pro.photo_url as string | null) ?? null,
      kind: "professional",
    };
  }
  const { data: team } = await admin
    .from("expert_teams")
    .select("name, slug, description")
    .eq("slug", link.pro_slug)
    .maybeSingle();
  if (!team) return null;
  return {
    name: (team.name as string) ?? link.pro_slug,
    slug: team.slug as string,
    bio: (team.description as string | null) ?? null,
    photoUrl: null,
    kind: "team",
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const link = await getLinkByToken(token);
  if (!link) {
    return { title: "Invest.com.au — Pro" };
  }
  const profile = await loadProfileForLink(link);
  if (!profile) return { title: "Invest.com.au — Pro" };
  return {
    title: `${profile.name} — Match with a verified Australian pro (${CURRENT_YEAR})`,
    description: profile.bio?.slice(0, 155)
      ?? `Get matched with ${profile.name} or another verified pro on Invest.com.au.`,
    alternates: { canonical: absoluteUrl(`/p/${token}`) },
    openGraph: {
      title: `${profile.name} on Invest.com.au`,
      description:
        profile.bio?.slice(0, 200)
        ?? `Get matched with ${profile.name} or another verified pro.`,
    },
  };
}

export default async function ProAffiliatePage({ params }: PageProps) {
  const { token } = await params;
  const link = await getLinkByToken(token);
  if (!link) notFound();

  const profile = await loadProfileForLink(link);
  if (!profile) notFound();

  // Server-side click record (fire-and-forget). Using headers() for IP/UA
  // because the page receives no `request` object.
  const h = await headers();
  void recordClick({
    token,
    sessionId: null,
    ipHash: null,
    userAgent: h.get("user-agent"),
    landingPage: `/p/${token}`,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Invest.com.au", url: SITE_URL },
    { name: "Pros", url: absoluteUrl("/advisors") },
    { name: profile.name },
  ]);

  const getMatchedHref = `/get-matched?ref=${encodeURIComponent(token)}&utm_source=pro_affiliate&utm_campaign=${encodeURIComponent(token)}`;
  const profileHref =
    profile.kind === "team" ? `/teams/${profile.slug}` : `/advisor/${profile.slug}`;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-start gap-6 flex-col md:flex-row">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar from supabase storage; <Image> demands width/height + remote-domain whitelist for every advisor URL.
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl font-semibold text-emerald-700">
              {profile.name.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {profile.kind === "team" ? "Expert Squad" : "Verified Pro"}
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {profile.name}
            </h1>
            {profile.bio ? (
              <p className="text-slate-600 mt-3 leading-relaxed">
                {profile.bio}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={getMatchedHref}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-white font-semibold hover:bg-emerald-700"
              >
                Get matched with {profile.name}
              </Link>
              <Link
                href={profileHref}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-slate-700 font-semibold hover:bg-slate-50"
              >
                View full profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-500 mt-6 text-center">
        This link credits {profile.name} for the match. You still get to choose
        from a shortlist of verified Australian pros.
      </p>
    </main>
  );
}
