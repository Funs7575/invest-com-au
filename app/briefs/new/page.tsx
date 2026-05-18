import type { Metadata } from "next";
import { headers } from "next/headers";

import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { isFlagEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-table workspace lookup: resolves the caller's active account kind label so the brief form can prefill business/listing-owner context. Reads only the user's own profile under service-role because business_accounts / listing_owner_accounts have no anon SELECT path.
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveKind, type WorkspaceKind } from "@/lib/account-kinds";
import Icon from "@/components/Icon";
import BriefForm from "./BriefForm";

interface WorkspaceContext {
  kind: WorkspaceKind;
  label: string;
  prefillName: string | null;
  prefillEmail: string | null;
  prefillPhone: string | null;
}

async function loadWorkspaceContext(): Promise<WorkspaceContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const active = await getActiveKind();
    if (!active) return null;
    const admin = createAdminClient();
    if (active === "business_owner") {
      const { data } = await admin
        .from("business_accounts")
        .select("business_name, contact_name, contact_email, contact_phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      return {
        kind: "business_owner",
        label: (data.business_name as string) || "your business",
        prefillName: (data.contact_name as string) ?? null,
        prefillEmail: (data.contact_email as string) ?? user.email ?? null,
        prefillPhone: (data.contact_phone as string) ?? null,
      };
    }
    if (active === "listing_owner") {
      const { data } = await admin
        .from("listing_owner_accounts")
        .select("owner_name, contact_email, contact_phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      return {
        kind: "listing_owner",
        label: (data.owner_name as string) || "your listing",
        prefillName: (data.owner_name as string) ?? null,
        prefillEmail: (data.contact_email as string) ?? user.email ?? null,
        prefillPhone: (data.contact_phone as string) ?? null,
      };
    }
    if (active === "investor") {
      const { data } = await admin
        .from("investor_profiles")
        .select("full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return {
        kind: "investor",
        label: (data?.full_name as string) || (user.email as string) || "you",
        prefillName: (data?.full_name as string) ?? null,
        prefillEmail: user.email ?? null,
        prefillPhone: null,
      };
    }
    // advisor / broker_partner — generic label, no prefill (those kinds
    // don't typically file briefs).
    return {
      kind: active,
      label: active.replace(/_/g, " "),
      prefillName: null,
      prefillEmail: user.email ?? null,
      prefillPhone: null,
    };
  } catch {
    return null;
  }
}

async function isProSubscriber(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const admin = createAdminClient();
    const { data } = await admin
      .from("subscriptions")
      .select("status, plan")
      .eq("auth_user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Flag-gated AI co-pilot toggle reads from feature_flags on every request.
// We can't ISR-cache when the response branches on a feature flag — the
// flag's 30-second in-process cache (see lib/feature-flags.ts) already
// absorbs the read cost.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Get Quotes from Verified Australian Pros (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Send a Match Request to verified Australian professionals, firms or Pro Squads. They see a masked preview and respond only if it's a fit. You stay in control of who sees your contact details.",
  alternates: { canonical: `${SITE_URL}/briefs/new` },
  robots: { index: true, follow: true },
};

const TRUST_BLOCKS = [
  {
    icon: "shield-check",
    title: "Verified providers only",
    desc: "Every professional, firm and team is verified before they can receive briefs.",
  },
  {
    icon: "lock",
    title: "Your contact details stay private",
    desc: "Providers see a masked preview. Contact details only unlock after a provider accepts.",
  },
  {
    icon: "users",
    title: "You stay in control",
    desc: "Route to an individual, a firm, or an expert team. Pick the response that fits.",
  },
  {
    icon: "info",
    title: "General information",
    desc: "We are a marketplace, not an adviser. Services are delivered by the provider you engage.",
  },
];

export default async function NewBriefPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;

  // Stable per-visitor key for the feature flag's percentage rollout —
  // IP from the proxy headers. We don't have a user session at this
  // point (anonymous brief flow), so IP is the best stable signal.
  const h = await headers();
  const visitorIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "anonymous";
  const aiCopilotEnabled = await isFlagEnabled("ai_match_request_copilot", {
    userKey: visitorIp,
  });

  const [workspace, proSubscriber] = await Promise.all([
    loadWorkspaceContext(),
    isProSubscriber(),
  ]);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Match Requests", url: `${SITE_URL}/briefs` },
    { name: "New" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Match Request · Australia
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">
              Get quotes from verified pros
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Tell verified Australian professionals, firms or Pro Squads what
              you need help with. They&apos;ll see a masked preview and respond
              only if it&apos;s a fit. You stay in control of who sees your
              contact details.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto mt-12">
            {TRUST_BLOCKS.map((t) => (
              <div
                key={t.title}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <Icon name={t.icon} size={20} className="text-amber-400 mb-2" />
                <p className="text-sm font-bold text-white mb-1">{t.title}</p>
                <p className="text-xs text-slate-400 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <BriefForm
            aiCopilotEnabled={aiCopilotEnabled}
            workspace={workspace}
            proSubscriber={proSubscriber}
          />
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 text-center">
            How Match Requests work
          </h2>
          <p className="text-sm text-slate-500 mb-10 text-center max-w-2xl mx-auto">
            A structured way to bring verified providers into your decision.
            Invest.com.au never gives personal advice — the professional or
            firm you engage delivers the service under their own licence.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                n: 1,
                title: "Tell us what you need",
                desc: "Pick a template, answer a few structured questions, and set how you want to be matched.",
              },
              {
                n: 2,
                title: "Verified pros may respond",
                desc: "Eligible individuals, firms or Pro Squads see a masked preview and can accept with credits to unlock your details.",
              },
              {
                n: 3,
                title: "Track your quotes in one place",
                desc: "Status, next step, and accepted pro — all visible to you. The service itself sits with the professional under their licence.",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-full font-extrabold flex items-center justify-center mx-auto mb-3 text-lg">
                  {s.n}
                </div>
                <p className="font-bold text-slate-900 mb-1">{s.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
