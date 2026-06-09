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

/**
 * Honest social proof: count active, publicly-listable verified pros via the
 * anon client so RLS scopes us to exactly the rows a visitor could see in the
 * directory. Returns null on any error — the form then shows qualitative copy
 * rather than a fabricated number.
 */
async function loadProviderSupply(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (error) return null;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Post a Brief — Get Responses from Verified Australian Pros (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Post one brief and verified Australian professionals, firms and expert teams respond. Compare them and choose — your contact details stay private until you do.",
  alternates: { canonical: `${SITE_URL}/briefs/new` },
  robots: { index: true, follow: true },
};

const TRUST_BLOCKS = [
  {
    icon: "users",
    title: "Pros come to you",
    desc: "Post once — verified pros respond. No cold-calling a dozen firms yourself.",
  },
  {
    icon: "lock",
    title: "Your details stay private",
    desc: "Pros see a masked brief. Your contact details unlock only when you choose.",
  },
  {
    icon: "shield-check",
    title: "Verified pros only",
    desc: "Every professional, firm and team is verified before they can respond.",
  },
  {
    icon: "thumbs-up",
    title: "You choose",
    desc: "Compare responses side by side and pick the pro that fits. No obligation.",
  },
];

const HOW_IT_WORKS = [
  {
    n: 1,
    title: "Tell us what you need",
    desc: "Pick what you're after or describe it in your own words. A few smart questions, that's it.",
  },
  {
    n: 2,
    title: "Verified pros respond",
    desc: "Matching individuals, firms and expert teams see your masked brief and respond if it's a fit.",
  },
  {
    n: 3,
    title: "Compare & choose",
    desc: "Line up the responses, message your favourites, and choose. The service sits with the pro under their licence.",
  },
];

export default async function NewBriefPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;

  const h = await headers();
  const visitorIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "anonymous";
  const aiCopilotEnabled = await isFlagEnabled("ai_match_request_copilot", {
    userKey: visitorIp,
  });

  const [workspace, proSubscriber, proSupply] = await Promise.all([
    loadWorkspaceContext(),
    isProSubscriber(),
    loadProviderSupply(),
  ]);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Briefs", url: `${SITE_URL}/briefs` },
    { name: "New" },
  ]);

  const showSupply = proSupply != null && proSupply >= 12;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
              Briefs · Australia
            </p>
            <h1 className="mb-4 text-3xl font-extrabold sm:text-5xl">
              Post a brief.
              <br className="hidden sm:block" /> Get responses. Choose your pro.
            </h1>
            <p className="mx-auto max-w-2xl leading-relaxed text-slate-300">
              Tell verified Australian professionals, firms and expert teams what you
              need. They respond to you — you compare and pick the right fit. Your
              contact details stay private until you choose to share them.
            </p>
            {showSupply && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                {proSupply} verified pros ready to respond
              </p>
            )}
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
            {TRUST_BLOCKS.map((t) => (
              <div key={t.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Icon name={t.icon} size={20} className="mb-2 text-amber-400" />
                <p className="mb-1 text-sm font-bold text-white">{t.title}</p>
                <p className="text-xs leading-snug text-slate-400">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <BriefForm
            aiCopilotEnabled={aiCopilotEnabled}
            workspace={workspace}
            proSubscriber={proSubscriber}
            proSupply={proSupply}
          />
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-2 text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-500">
            A simpler way to bring verified pros into your decision. Invest.com.au never
            gives personal advice — the professional, firm or team you engage delivers the
            service under their own licence.
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-lg font-extrabold text-slate-900">
                  {s.n}
                </div>
                <p className="mb-1 font-bold text-slate-900">{s.title}</p>
                <p className="text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
